import { HttpError, validationError } from '@mairie360/bffs-lib';
import type {
  CatalogFile, CatalogFormation, CourseBody, FileBody, GetStatsResultView, ModuleBody, SummaryResultView,
} from '@mairie360/elearning-api-openapi/model';
import { z } from 'zod';
import {
  AdminStatsResponse,
  AgentIdentity,
  CourseLearner,
  CourseChapter,
  CourseContent,
  CurrentUser,
  ElearningCatalogQuery,
  ElearningCatalogResponse,
  ElearningCourse,
  FooterConfig,
  TrainingTimeResponse,
} from '../../openapi-registry';

// Pure shaping of E-learning API data into the payloads of the E-learning web service. Nothing is
// stored here: every value comes from the upstream answer of the current request.

export type BffCurrentUser = z.infer<typeof CurrentUser>;
export type BffCourse = z.infer<typeof ElearningCourse>;
export type BffChapter = z.infer<typeof CourseChapter>;
export type BffContent = z.infer<typeof CourseContent>;
type BffFooterConfig = z.infer<typeof FooterConfig>;
type BffCatalogQuery = z.infer<typeof ElearningCatalogQuery>;
type BffCatalogResponse = z.infer<typeof ElearningCatalogResponse>;
type CourseStatus = NonNullable<BffCourse['statusValue']>;

/**
 * Formation of the caller, as `GET /api/v1/formations/catalog/` returns it (`CatalogFormation`), its modules aside.
 * Only `id` and `name` are certain: every other field is checked before use, so an older answer still maps.
 */
export type UpstreamFormation = { id: number; name: string; description?: string | null; status?: unknown } & Partial<
  Omit<CatalogFormation, 'id' | 'name' | 'description' | 'status' | 'modules'>
>;

/** A file of a catalogue module (`CatalogFile`); the V2 fields are optional for the same reason. */
export type UpstreamFile = Pick<CatalogFile, 'id' | 'file_name' | 'file_type'> & Partial<Omit<CatalogFile, 'id' | 'file_name' | 'file_type'>>;

/** A module of the catalogue with its files. */
export type UpstreamChapter = {
  module: { id: number; name: string; description?: string; completed: boolean; sort_order?: number | null; duration_seconds?: number };
  files: UpstreamFile[];
};

/** True for a plain JSON object (not null, not an array). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 501 for a feature no upstream service supports yet: the BFF never fakes its persistence. */
export function notImplemented(message: string): HttpError {
  return new HttpError(501, message);
}

const footerConfig: BffFooterConfig = {
  productName: 'Mairie360',
  version: '2.1.0',
  links: [
    { label: 'Support technique', href: '/support' },
    { label: 'Documentation', href: '/documentation' },
    { label: "Conditions d'utilisation", href: '/conditions' },
  ],
};

export function footer(): BffFooterConfig {
  return { ...footerConfig, links: footerConfig.links.map((link) => ({ ...link })) };
}

const STATUS_BY_UPSTREAM: Record<string, CourseStatus> = {
  NotStarted: 'not-started',
  InProgress: 'in-progress',
  Completed: 'completed',
};

function statusBadge(status: CourseStatus): NonNullable<BffCourse['statusBadge']> {
  if (status === 'completed') return { label: 'Termine', variant: 'completed' };
  if (status === 'in-progress') return { label: 'En cours', variant: 'inProgress' };
  return { label: 'Non commence', variant: 'notStarted' };
}

function statusFromProgress(progress: number): CourseStatus {
  if (progress >= 100) return 'completed';
  return progress > 0 ? 'in-progress' : 'not-started';
}

/** Upstream status (`NotStarted`, `InProgress`, `Completed`), or the one the progress tells for `Error` / none. */
export function courseStatus(status: unknown, progress: number): CourseStatus {
  return (typeof status === 'string' ? STATUS_BY_UPSTREAM[status] : undefined) ?? statusFromProgress(progress);
}

type CourseLevel = NonNullable<BffCourse['level']>;
const LEVEL_LABELS: Record<CourseLevel, string> = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' };
export const MANDATORY_BADGE = { label: 'Obligatoire', variant: 'mandatory' } as const;

const CONTENT_TYPES: ReadonlySet<string> = new Set(['video', 'pdf', 'document', 'link', 'quiz', 'audio', 'other']);
/** Contents whose file is stored by the e-learning service (opened through a signed URL). */
const STORED_TYPES: ReadonlySet<string> = new Set(['video', 'pdf', 'document', 'audio']);

/** The exact `kind` of the content, else its legacy `file_type` (`Video`, `Pdf`). */
function contentType(file: UpstreamFile): BffContent['type'] {
  if (typeof file.kind === 'string' && CONTENT_TYPES.has(file.kind)) return file.kind as BffContent['type'];
  if (file.file_type === 'Video') return 'video';
  if (file.file_type === 'Pdf') return 'pdf';
  return 'other';
}

/** A number of seconds as the screens show it: `45 s`, `12 min`, `1 h`, `2 h 15`. Undefined for none. */
export function formatDuration(seconds: number | null | undefined): string | undefined {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

/** `{ duration, durationSeconds }` of a positive number of seconds, nothing otherwise. */
function durationFields(seconds: number | null | undefined): { duration?: string; durationSeconds?: number } {
  const duration = formatDuration(seconds);
  return duration ? { duration, durationSeconds: Math.round(seconds as number) } : {};
}

/** `4,5 (12 avis)`, `4 (1 avis)`. */
export function ratingLabel(average: number, count: number): string {
  return `${String(Math.round(average * 10) / 10).replace('.', ',')} (${count} avis)`;
}

/** Display order: `sort_order` (absent last), then the upstream order. */
function bySortOrder<T extends { sort_order?: number | null }>(items: T[]): T[] {
  const rank = (item: T) => (typeof item.sort_order === 'number' ? item.sort_order : Number.POSITIVE_INFINITY);
  return items.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(({ item }) => item);
}

function toContent(file: UpstreamFile, completed: boolean): BffContent {
  const type = contentType(file);
  const title = typeof file.title === 'string' && file.title ? file.title : file.file_name;
  return {
    id: String(file.id),
    title,
    type,
    ...(file.description ? { description: file.description } : {}),
    ...durationFields(file.duration_seconds),
    // A link, a quiz or `other` has no file: `file_name` only repeats its title.
    ...(STORED_TYPES.has(type) ? { fileName: file.file_name } : {}),
    ...(type === 'link' && file.url ? { href: file.url } : {}),
    completed,
    ...(typeof file.is_required === 'boolean' ? { required: file.is_required } : {}),
  };
}

/** Progress is tracked per module upstream: a content is completed when its chapter is. */
export function toChapter({ module, files }: UpstreamChapter): BffChapter {
  const contents = bySortOrder(files).map((file) => toContent(file, module.completed));
  const seconds = module.duration_seconds ?? contents.reduce((sum, content) => sum + (content.durationSeconds ?? 0), 0);
  return {
    id: String(module.id),
    title: module.name,
    ...(module.description ? { description: module.description } : {}),
    ...durationFields(seconds),
    completed: module.completed,
    active: false,
    contents,
  };
}

export type CourseProgress = {
  completedRequiredContents: number;
  totalRequiredContents: number;
  completedChapters: number;
  totalChapters: number;
  progress: number;
  completed: boolean;
};

export function courseProgress(chapters: BffChapter[]): CourseProgress {
  const contents = chapters.flatMap((chapter) => chapter.contents ?? []);
  const completedChapters = chapters.filter((chapter) => chapter.completed).length;
  const progress = chapters.length ? Math.round((completedChapters / chapters.length) * 100) : 0;

  return {
    completedRequiredContents: contents.filter((content) => content.completed).length,
    totalRequiredContents: contents.length,
    completedChapters,
    totalChapters: chapters.length,
    progress,
    completed: chapters.length > 0 && completedChapters === chapters.length,
  };
}

/** The optional string `value` under `key`, nothing for `null` / absent / empty. */
function optionalText<K extends string>(key: K, value: unknown): Partial<Record<K, string>> {
  return typeof value === 'string' && value ? ({ [key]: value } as Record<K, string>) : {};
}

export function toCourse(formation: UpstreamFormation, upstreamChapters: UpstreamChapter[]): BffCourse {
  const chapters = bySortOrder(upstreamChapters.map((chapter) => ({ ...chapter, sort_order: chapter.module.sort_order }))).map(toChapter);
  const activeChapter = chapters.find((chapter) => !chapter.completed);
  if (activeChapter) activeChapter.active = true;

  const { progress, completed } = courseProgress(chapters);
  const statusValue = courseStatus(formation.status, progress);
  const description = formation.description ?? '';
  const level = formation.level ?? undefined;
  const mandatory = formation.is_mandatory;
  const seconds = chapters.reduce((sum, chapter) => sum + (chapter.durationSeconds ?? 0), 0);
  const average = typeof formation.rating_average === 'number' ? formation.rating_average : undefined;
  const ratingCount = typeof formation.rating_count === 'number' ? formation.rating_count : undefined;
  const myRating = typeof formation.my_rating === 'number' && formation.my_rating >= 1 ? formation.my_rating : undefined;
  const instructor = optionalText('instructor', formation.instructor);
  const rating = average === undefined
    ? {}
    : { rating: average, ...(ratingCount === undefined ? {} : { ratingLabel: ratingLabel(average, ratingCount) }) };

  return {
    id: String(formation.id),
    title: formation.name,
    description,
    ...instructor,
    ...(average === undefined ? {} : { rating: average }),
    ...(ratingCount === undefined ? {} : { ratingCount }),
    ...durationFields(seconds),
    chapters: chapters.length,
    ...(typeof formation.learners === 'number' ? { learners: formation.learners } : {}),
    ...optionalText('category', formation.category),
    ...(level ? { level, levelBadge: { label: LEVEL_LABELS[level], variant: level } } : {}),
    ...(typeof mandatory === 'boolean' ? { mandatory } : {}),
    ...(mandatory ? { titleBadge: { ...MANDATORY_BADGE } } : {}),
    ...(formation.source ? { source: formation.source } : {}),
    statusValue,
    statusBadge: statusBadge(statusValue),
    progress,
    ...optionalText('deadline', formation.deadline),
    ...optionalText('startedAt', formation.started_at),
    ...optionalText('completedAt', formation.completed_at),
    ...optionalText('lastActivityAt', formation.last_activity_at),
    ...optionalText('lastReminderAt', formation.last_reminder_at),
    details: {
      title: formation.name,
      description,
      ...instructor,
      ...durationFields(seconds),
      ...rating,
      progress,
      completed,
      ...(myRating === undefined && formation.my_rating === undefined
        ? {}
        : { completionRating: myRating === undefined ? { submitted: false, max: 5 } : { submitted: true, initialValue: myRating, max: 5 } }),
      chapters,
    },
  };
}

/** First content of the first chapter not completed yet, where a learner resumes the course. */
export function nextContentId(course: BffCourse): string | undefined {
  return course.details?.chapters.find((chapter) => !chapter.completed && chapter.contents?.length)?.contents?.[0]?.id;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function buildCatalogResponse(query: BffCatalogQuery, user: BffCurrentUser, courses: BffCourse[]): BffCatalogResponse {
  const search = query.search ? normalize(query.search) : '';
  const category = query.category && query.category !== 'all' ? query.category : undefined;
  const status = query.status && query.status !== 'all' ? query.status : undefined;
  const filteredCourses = courses.filter((course) => {
    const searchableText = normalize([course.title, course.description, course.category].filter(Boolean).join(' '));
    return (
      (!search || searchableText.includes(search)) &&
      (!category || course.category === category) &&
      (!status || course.statusValue === status)
    );
  });
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? (filteredCourses.length || 20);
  const completedCourses = courses.filter((course) => course.statusValue === 'completed').length;

  return {
    user,
    // No notification source is wired into this BFF: nothing is reported as unread.
    notifications: { unreadCount: 0 },
    catalog: {
      title: 'Centre de Formation',
      subtitle: 'Developpez vos competences professionnelles',
      certificationCount: completedCourses,
      emptyLabel: 'Aucune formation ne correspond a votre recherche.',
      statuses: [
        { label: 'Tous les statuts', value: 'all' },
        { label: 'Non commence', value: 'not-started' },
        { label: 'En cours', value: 'in-progress' },
        { label: 'Termine', value: 'completed' },
      ],
      categories: [
        { label: 'Toutes les categories', value: 'all' },
        ...[...new Set(courses.map((course) => course.category).filter((name): name is string => Boolean(name)))]
          .sort((a, b) => a.localeCompare(b, 'fr'))
          .map((name) => ({ label: name, value: name })),
      ],
      stats: [
        { label: 'Formations disponibles', value: courses.length },
        { label: 'En cours', value: courses.filter((course) => course.statusValue === 'in-progress').length },
        { label: 'Terminees', value: completedCourses },
      ],
      courses: filteredCourses.slice((page - 1) * pageSize, page * pageSize),
    },
    footer: footer(),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Administration: a course as the front edits it (`ElearningCourse`) -> the body of `POST` / `PATCH
// /api/v1/admin/formations/` (`CourseBody`). The rules the E-learning API checks are checked here first, so that a
// bad value gets a 400 naming the BFF field (the API's own 400 is a text body, never relayed).

type AdminCourseInput = Omit<z.infer<typeof ElearningCourse>, 'id'> & { id?: string };
type Issue = { path: (string | number)[]; message: string };

const LEVELS: readonly CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const NEW_CONTENT_TYPES: ReadonlySet<string> = new Set(['link', 'quiz', 'other']);
/** Existing rows of the E-learning API have a decimal id; any other id is a row the front just added. */
const UPSTREAM_ID = /^[1-9]\d{0,9}$/;
const MAX_ROWS = 100;
const FRENCH_MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'heure', 'heures', 'hour', 'hours']);
const MINUTE_UNITS = new Set(['m', 'mn', 'min', 'mins', 'minute', 'minutes']);
const SECOND_UNITS = new Set(['s', 'sec', 'secs', 'seconde', 'secondes', 'second', 'seconds']);

/**
 * Seconds of a human duration: `12 min`, `1 h 30`, `1h30`, `2 h 15 min`, `90 s`, `12:30` (minutes:seconds),
 * `1:02:00`, or a bare number of minutes. `null` for a blank one, `undefined` when it cannot be read.
 */
export function parseDuration(value: string): number | null | undefined {
  const text = normalize(value).replace(',', '.');
  if (!text) return null;
  const clock = /^(\d+):([0-5]\d)(?::([0-5]\d))?$/.exec(text);
  if (clock) {
    const [first, second, third] = clock.slice(1).map((part) => (part === undefined ? undefined : Number(part)));
    return third === undefined ? first! * 60 + second! : first! * 3600 + second! * 60 + third;
  }
  const tokens = [...text.matchAll(/(\d+(?:\.\d+)?)\s*([a-z]*)\s*/g)];
  if (!tokens.length || tokens.map((token) => token[0]).join('').trim() !== text) return undefined;
  let seconds = 0;
  let previous: 'h' | 'min' | 's' | undefined;
  for (const [, amount, rawUnit] of tokens) {
    let unit: 'h' | 'min' | 's' | undefined;
    if (HOUR_UNITS.has(rawUnit)) unit = 'h';
    else if (MINUTE_UNITS.has(rawUnit)) unit = 'min';
    else if (SECOND_UNITS.has(rawUnit)) unit = 's';
    else if (rawUnit) return undefined;
    // A number without unit follows the unit before it: `1 h 30` is 30 minutes, `2 min 10` 10 seconds.
    else unit = previous === 'h' ? 'min' : previous === 'min' ? 's' : previous === undefined && tokens.length === 1 ? 'min' : undefined;
    if (!unit) return undefined;
    seconds += Number(amount) * (unit === 'h' ? 3600 : unit === 'min' ? 60 : 1);
    previous = unit;
  }
  return Math.round(seconds);
}

/** `YYYY-MM-DD` of an ISO date (or date-time) or of a French date (`30 juin 2026`, `1er mars 2027`). */
export function parseDeadline(value: string): string | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
  const french = /^(\d{1,2})(?:er)?\s+([a-z]+)\s+(\d{4})$/.exec(normalize(text));
  let parts: [number, number, number] | undefined;
  if (iso) parts = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (french && FRENCH_MONTHS.includes(french[2])) parts = [Number(french[3]), FRENCH_MONTHS.indexOf(french[2]) + 1, Number(french[1])];
  if (!parts) return undefined;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().slice(0, 10);
}

/** The level of the course: `level`, else its `levelBadge` (variant or French label). */
function levelOf(course: AdminCourseInput): CourseLevel | null {
  if (course.level) return course.level;
  const badge = course.levelBadge;
  if (!badge) return null;
  if (badge.variant && (LEVELS as readonly string[]).includes(badge.variant)) return badge.variant as CourseLevel;
  return LEVELS.find((level) => normalize(LEVEL_LABELS[level]) === normalize(badge.label)) ?? null;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !/\s/.test(value);
  } catch {
    return false;
  }
}

/** Checks a text the E-learning API bounds (length in code points). */
function checkText(issues: Issue[], path: Issue['path'], value: string, { min = 0, max }: { min?: number; max: number }): void {
  const length = [...value.trim()].length;
  if (length < min) issues.push({ path, message: 'Required.' });
  else if ([...value].length > max) issues.push({ path, message: `At most ${max} characters.` });
}

const blankToNull = (value: string | undefined): string | null => (value?.trim() ? value.trim() : null);

/**
 * The E-learning API body of `course`. `keepIds` (PATCH) sends the decimal ids of the existing chapters and
 * contents so that they are kept (a new row has no decimal id); a creation sends none. Throws a 400 naming every
 * invalid field of the BFF body.
 */
export function toCourseBody(course: AdminCourseInput, { keepIds }: { keepIds: boolean }): CourseBody {
  const issues: Issue[] = [];
  checkText(issues, ['title'], course.title, { min: 1, max: 255 });
  checkText(issues, ['description'], course.description, { max: 10_000 });
  if (course.category !== undefined) checkText(issues, ['category'], course.category, { max: 128 });
  const instructor = course.instructor ?? course.details?.instructor;
  if (instructor !== undefined) checkText(issues, course.instructor === undefined ? ['details', 'instructor'] : ['instructor'], instructor, { max: 255 });
  const deadline = course.deadline === undefined ? null : parseDeadline(course.deadline);
  if (deadline === undefined) issues.push({ path: ['deadline'], message: 'Expected a date (YYYY-MM-DD).' });

  const chapters = course.details?.chapters ?? [];
  if (chapters.length > MAX_ROWS) issues.push({ path: ['details', 'chapters'], message: `At most ${MAX_ROWS} chapters.` });
  const modules: ModuleBody[] = chapters.map((chapter, c) => {
    const chapterPath = ['details', 'chapters', c];
    checkText(issues, [...chapterPath, 'title'], chapter.title, { min: 1, max: 255 });
    if (chapter.description !== undefined) checkText(issues, [...chapterPath, 'description'], chapter.description, { max: 10_000 });
    const contents = chapter.contents ?? [];
    if (contents.length > MAX_ROWS) issues.push({ path: [...chapterPath, 'contents'], message: `At most ${MAX_ROWS} contents.` });
    const files: FileBody[] = contents.map((content, f) => {
      const path = [...chapterPath, 'contents', f];
      const id = keepIds && UPSTREAM_ID.test(content.id) ? Number(content.id) : undefined;
      checkText(issues, [...path, 'title'], content.title, { min: 1, max: 255 });
      if (content.description !== undefined) checkText(issues, [...path, 'description'], content.description, { max: 10_000 });
      if (id === undefined && !NEW_CONTENT_TYPES.has(content.type)) {
        issues.push({ path: [...path, 'type'], message: 'A new content can only be a link, a quiz or other: there is no upload.' });
      }
      const href = content.type === 'link' ? content.href?.trim() ?? '' : '';
      if (content.type === 'link' && !(isHttpsUrl(href) && href.length <= 2048)) {
        issues.push({ path: [...path, 'href'], message: 'A link needs an absolute https:// URL.' });
      }
      let seconds: number | null | undefined = content.durationSeconds ?? null;
      if (content.durationSeconds === undefined && content.duration !== undefined) {
        seconds = parseDuration(content.duration);
        if (seconds === undefined) issues.push({ path: [...path, 'duration'], message: 'Expected a duration such as 12 min or 1 h 30.' });
      }
      if (typeof seconds === 'number' && seconds > 2_147_483_647) issues.push({ path: [...path, 'duration'], message: 'Too long.' });
      return {
        ...(id === undefined ? {} : { id }),
        title: content.title.trim(),
        description: blankToNull(content.description),
        file_type: content.type,
        duration_seconds: seconds ?? null,
        is_required: content.required ?? true,
        ...(content.type === 'link' ? { url: href } : {}),
      };
    });
    const id = keepIds && UPSTREAM_ID.test(chapter.id) ? Number(chapter.id) : undefined;
    return { ...(id === undefined ? {} : { id }), name: chapter.title.trim(), description: blankToNull(chapter.description), files };
  });

  if (issues.length) throw validationError('body', issues);
  return {
    name: course.title.trim(),
    description: course.description.trim() ? course.description : null,
    category: blankToNull(course.category),
    level: levelOf(course),
    is_mandatory: course.mandatory ?? course.titleBadge?.variant === 'mandatory',
    deadline: deadline ?? null,
    source: course.source ?? 'internal',
    instructor: blankToNull(instructor),
    modules,
  };
}

/** The course as it was saved: the body sent, its fields normalised, under the id the E-learning API gave it. */
export function savedCourse(course: AdminCourseInput, body: CourseBody, id: number): BffCourse {
  const level = body.level ?? undefined;
  // The badges, level, flag and deadline are rebuilt from what was sent upstream.
  const rest: Partial<AdminCourseInput> = { ...course };
  for (const key of ['titleBadge', 'levelBadge', 'mandatory', 'level', 'deadline', 'category', 'source'] as const) delete rest[key];
  return {
    ...rest,
    id: String(id),
    title: body.name,
    description: course.description,
    ...(body.category ? { category: body.category } : {}),
    ...(level ? { level, levelBadge: { label: LEVEL_LABELS[level], variant: level } } : {}),
    mandatory: Boolean(body.is_mandatory),
    ...(body.is_mandatory ? { titleBadge: { ...MANDATORY_BADGE } } : {}),
    ...(body.deadline ? { deadline: body.deadline } : {}),
    source: body.source ?? 'internal',
  };
}

/** Field of the BFF body named by an E-learning API 400 (`name`, `url`...), when its text names a known one. */
const BFF_FIELD: Record<string, string> = {
  name: 'title', title: 'title', description: 'description', category: 'category', instructor: 'instructor',
  deadline: 'deadline', level: 'level', source: 'source', is_mandatory: 'mandatory', modules: 'details.chapters',
  files: 'contents', file_type: 'type', url: 'href', duration_seconds: 'duration', is_required: 'required', id: 'id',
};

/**
 * The BFF field an E-learning API 400 text names, read from a closed list (the text itself is never relayed): its
 * most precise known snake_case word, the last one of a path (`modules[0].files[1].url` -> `href`).
 */
export function fieldOfUpstreamError(text: unknown): string | undefined {
  if (typeof text !== 'string') return undefined;
  const words = [...text.matchAll(/\b(is_mandatory|file_type|duration_seconds|is_required|name|title|description|category|instructor|deadline|level|source|modules|files|url|id)\b/g)];
  const word = words[words.length - 1]?.[1];
  return word ? BFF_FIELD[word] : undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Training time and indicators: the E-learning API answers in snake_case, the screens read camelCase.

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const nullableText = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

/** `GET /api/v1/formations/summary/` as the training time screen reads it. */
export function trainingTime(summary: SummaryResultView): z.infer<typeof TrainingTimeResponse> {
  return {
    year: summary.year,
    goalMinutes: count(summary.annual_goal_minutes),
    timeSpentSeconds: count(summary.time_spent_seconds),
    completedCount: count(summary.completed_count),
    courses: summary.formations.map((formation) => ({
      id: String(formation.id),
      title: formation.name,
      status: courseStatus(formation.status, formation.completed_at ? 100 : 0),
      timeSpentSeconds: count(formation.time_spent_seconds),
      completedAt: nullableText(formation.completed_at),
    })),
  };
}

/** `GET /api/v1/admin/stats/` as the administration screen reads it. */
export function adminStats(stats: GetStatsResultView): z.infer<typeof AdminStatsResponse> {
  return {
    internalCourses: count(stats.internal_courses),
    platformCourses: count(stats.platform_courses),
    mandatoryInternalCourses: count(stats.mandatory_internal_courses),
    agents: count(stats.agents),
    participants: count(stats.participants),
    participationRate: count(stats.participation_rate),
    averageCompletion: count(stats.average_completion),
    lateMandatory: count(stats.late_mandatory),
    byService: stats.by_service.map((service) => ({
      serviceId: typeof service.service_id === 'number' ? String(service.service_id) : null,
      serviceName: nullableText(service.service_name),
      agents: count(service.agents),
      participants: count(service.participants),
      participationRate: count(service.participation_rate),
    })),
    byCourse: stats.by_formation.map((formation) => ({
      id: String(formation.id),
      title: formation.name,
      source: formation.source === 'platform' ? 'platform' : 'internal',
      mandatory: formation.is_mandatory === true,
      enrolled: count(formation.enrolled),
      completed: count(formation.completed),
      averageProgress: count(formation.average_progress),
    })),
    lateAgents: stats.late_agents.map((agent) => ({
      userId: String(agent.user_id),
      firstName: agent.first_name,
      lastName: agent.last_name,
      courseId: String(agent.formation_id),
      courseTitle: agent.formation_name,
      deadline: agent.deadline,
      progress: count(agent.progress),
      lastReminderAt: nullableText(agent.last_reminder_at),
    })),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Enrolment (MAIR-817): the agents of `GET /api/v1/admin/users/` and their enrolments, in camelCase.

/**
 * An agent of the E-learning API (`{ id, name }`, the name being `first_name || ' ' || last_name`): the first name is
 * what precedes the first space, the last name the rest (a first name with a space is cut there; `name` keeps it whole).
 */
export function agentIdentity(user: { id: number; name: string }): z.infer<typeof AgentIdentity> {
  const name = user.name.trim();
  const space = name.indexOf(' ');
  return {
    userId: String(user.id),
    name,
    firstName: space < 0 ? name : name.slice(0, space),
    lastName: space < 0 ? '' : name.slice(space + 1).trim(),
  };
}

/** An enrolled agent and their progress, as the learners panel of a course reads it. */
export function courseLearner(
  user: { id: number; name: string },
  enrolment: { progress_status?: unknown; started_at?: string | null; completed_at?: string | null },
  progress: number,
): z.infer<typeof CourseLearner> {
  return {
    ...agentIdentity(user),
    status: courseStatus(enrolment.progress_status, progress),
    progress: Math.min(100, Math.max(0, Math.round(progress))),
    startedAt: nullableText(enrolment.started_at),
    completedAt: nullableText(enrolment.completed_at),
  };
}
