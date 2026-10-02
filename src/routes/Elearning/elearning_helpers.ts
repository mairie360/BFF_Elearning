import { HttpError } from '@mairie360/bffs-lib';
import type { File as UpstreamFile, Module as UpstreamModule } from '@mairie360/elearning-api-openapi/model';
import { z } from 'zod';
import {
  CourseChapter,
  CourseContent,
  CurrentUser,
  ElearningCatalogQuery,
  ElearningCatalogResponse,
  ElearningCourse,
  FooterConfig,
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
 * Formation of `GET /api/v1/formations/`. The published package types it as `AdminFormation`
 * (two upstream schemas share the name `GetFormationsResultView`), but the API also returns the
 * caller's progress `status`, read here when present.
 */
export type UpstreamFormation = { id: number; name: string; description?: string | null; status?: unknown };

/** A module with the attachments of `GET /api/v1/formations/{formation_id}/{module_id}/`. */
export type UpstreamChapter = { module: UpstreamModule; files: UpstreamFile[] };

/** 400 for a request that fails its zod schema, one detail per issue (`path` like `body.title`). */
export function validationError(location: 'body' | 'params' | 'query', issues: readonly z.core.$ZodIssue[]): HttpError {
  return new HttpError(400, 'Invalid request payload.', {
    details: issues.map((issue) => ({
      path: [location, ...issue.path.map(String)].join('.'),
      message: issue.message,
    })),
  });
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

function contentType(file: UpstreamFile): BffContent['type'] {
  if (file.file_type === 'Video') return 'video';
  if (file.file_type === 'Pdf') return 'pdf';
  return 'other';
}

/** Progress is tracked per module upstream: a content is completed when its chapter is. */
export function toChapter({ module, files }: UpstreamChapter): BffChapter {
  return {
    id: String(module.id),
    title: module.name,
    ...(module.description ? { description: module.description } : {}),
    completed: module.completed,
    active: false,
    contents: files.map((file) => ({
      id: String(file.id),
      title: file.file_name,
      type: contentType(file),
      fileName: file.file_name,
      completed: module.completed,
    })),
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

export function toCourse(formation: UpstreamFormation, upstreamChapters: UpstreamChapter[]): BffCourse {
  const chapters = upstreamChapters.map(toChapter);
  const activeChapter = chapters.find((chapter) => !chapter.completed);
  if (activeChapter) activeChapter.active = true;

  const { progress, completed } = courseProgress(chapters);
  const statusValue =
    (typeof formation.status === 'string' ? STATUS_BY_UPSTREAM[formation.status] : undefined) ?? statusFromProgress(progress);
  const description = formation.description ?? '';

  return {
    id: String(formation.id),
    title: formation.name,
    description,
    chapters: chapters.length,
    statusValue,
    statusBadge: statusBadge(statusValue),
    progress,
    details: { title: formation.name, description, progress, completed, chapters },
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
      // The E-learning API has no course category.
      categories: [{ label: 'Toutes les categories', value: 'all' }],
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
