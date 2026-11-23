import {
  asCaller, DEFAULT_CONCURRENCY, HttpError, mapWithConcurrency, upstreamError, upstreamStatus, withRetry,
} from '@mairie360/bffs-lib';
import type {
  CatalogFormation, CourseBody, GetStatsResultView, SummaryResultView, User, UsersFormation, UsersFormationModule,
} from '@mairie360/elearning-api-openapi/model';
import type { Request } from 'express';
import { elearningClient } from '../../clients/elearningClient';
import { UPSTREAM_TIMEOUT_MS } from '../../clients/upstream';
import {
  type BffChapter,
  type BffContent,
  type BffCourse,
  courseProgress,
  type CourseProgress,
  fieldOfUpstreamError,
  isRecord,
  toCourse,
  type UpstreamChapter,
} from './elearning_helpers';

// Every learner read and write goes to the E-learning API on behalf of the caller (their bearer is
// forwarded: the API resolves the user from the JWT and only shows their own enrolments and
// progress). The upstream text/plain error bodies are never relayed.

type Caller = Pick<Request, 'headers'>;
type ErrorDetail = { path: string; message: string };

const SERVICE = 'ELEARNING_API';

/** 502 for an E-learning answer without the documented shape (same message as the lib's `ZodError` mapping). */
const invalidAnswer = () => new HttpError(502, `The ${SERVICE} answer is invalid.`);

function courseNotFound(courseId: string): HttpError {
  return new HttpError(404, 'Course not found.', { details: [{ path: 'params.courseId', message: `No course ${courseId}.` }] });
}

interface CallOptions {
  /**
   * The route's own 404 for an E-learning 403 (not enrolled) or 404: the caller cannot tell a course they
   * are not enrolled in from a missing one. Without it, both are undeclared and become a 502.
   */
  notFound?: (status: 403 | 404) => HttpError;
  /** The route's own error for other upstream 4xx it declares (a 409, a 400...), from the upstream error. */
  statuses?: Partial<Record<number, (error: unknown) => HttpError>>;
  /** Idempotent GET only: retried once on a transient failure. */
  retry?: boolean;
}

/**
 * One E-learning API call, failures mapped by `upstreamError` from the lib (401 relayed, no answer or any
 * other status: 502), plus the 403/404 -> route-specific 404 mapping the course routes declare and the
 * route's own `statuses`.
 */
async function call<T>(request: () => Promise<{ data: T }>, options: CallOptions = {}): Promise<T> {
  try {
    return (await (options.retry ? withRetry(request) : request())).data;
  } catch (error) {
    const status = error instanceof HttpError ? undefined : upstreamStatus(error);
    const mapped = status === undefined ? undefined : options.statuses?.[status];
    if (mapped) throw mapped(error);
    if (options.notFound && (status === 403 || status === 404)) throw options.notFound(status);
    throw upstreamError(SERVICE, error, [401]);
  }
}

const options = (req: Caller) => asCaller(SERVICE, req, UPSTREAM_TIMEOUT_MS);

/** Options of a call answering a PDF: the bytes as they are (`Buffer` under Node), not a JSON parse. */
function pdfOptions(req: Caller) {
  const base = options(req);
  return { ...base, headers: { ...base.headers, Accept: 'application/pdf' }, responseType: 'arraybuffer' as const };
}

/** The array `key` of an upstream body, or a 502 when the answer does not have the documented shape. */
function arrayOf<T>(body: unknown, key: string): T[] {
  if (!isRecord(body) || !Array.isArray(body[key])) throw invalidAnswer();
  return body[key] as T[];
}

function toNumber(id: string): number {
  return Number.parseInt(id, 10);
}

/**
 * Courses the caller is enrolled in, with their chapters, contents and progress, in one E-learning call whatever
 * their number (`GET /api/v1/formations/catalog/`, MAIR-552): reading each formation then each module cost
 * 1 + N + N x M calls per catalogue and saturated the BFF under load.
 */
export async function loadCourses(req: Caller): Promise<BffCourse[]> {
  const body = await call(() => elearningClient.getMyCatalog(options(req)), { retry: true });
  return arrayOf<CatalogFormation>(body, 'formations').map((formation) =>
    toCourse(formation, arrayOf<CatalogFormation['modules'][number]>(formation, 'modules').map(({ files, ...module }) => ({ module, files }))),
  );
}

/** One course of the caller; 404 when it does not exist or the caller is not enrolled in it. */
export async function loadCourse(req: Caller, courseId: string): Promise<BffCourse> {
  const course = (await loadCourses(req)).find((entry) => entry.id === courseId);
  if (!course) throw courseNotFound(courseId);
  return course;
}

export type ContentCompletion = CourseProgress & { chapters: BffChapter[]; chapter: BffChapter; content: BffContent };

/**
 * Marks the chapter (E-learning API module) holding `contentId` as completed for the caller, then
 * reads the course again. The content must belong to the chapter, which must belong to the course.
 */
export async function completeContent(req: Caller, courseId: string, chapterId: string, contentId: string): Promise<ContentCompletion> {
  const formationId = toNumber(courseId);
  const moduleId = toNumber(chapterId);
  const notFound = (path: string, message: string, detail: string) =>
    new HttpError(404, message, { details: [{ path, message: detail } satisfies ErrorDetail] });

  // 403: not enrolled in the course; 404: the chapter is not a module of this course.
  const moduleBody = await call(() => elearningClient.getModule(formationId, moduleId, options(req)), {
    retry: true,
    notFound: (status) =>
      status === 403 ? courseNotFound(courseId) : notFound('body.chapterId', 'Chapter not found.', `No chapter ${chapterId} in course ${courseId}.`),
  });
  const files = arrayOf<UpstreamChapter['files'][number]>(moduleBody, 'files');
  if (!files.some((file) => String(file.id) === contentId)) {
    throw notFound('params.contentId', 'Content not found.', `No content ${contentId} in chapter ${chapterId}.`);
  }

  // PATCH: not retried.
  await call(() => elearningClient.completeModule(formationId, moduleId, options(req)), { notFound: () => courseNotFound(courseId) });

  const course = await loadCourse(req, courseId);
  const chapters = course.details?.chapters ?? [];
  const chapter = chapters.find((entry) => entry.id === chapterId);
  const content = chapter?.contents?.find((entry) => entry.id === contentId);
  // The module was found a moment ago: missing now means the course changed under the request.
  if (!chapter || !content) throw invalidAnswer();

  return { ...courseProgress(chapters), chapters, chapter, content };
}

/** 409 of a course the caller has not completed yet (rating, attestation). */
const notCompleted = (message: string) => () => new HttpError(409, message);

export type RatingResult = { average: number; count: number; mine: number };

/** Rates a course the caller completed: 404 when they are not enrolled in it, 409 while it is not completed. */
export async function rateCourse(req: Caller, courseId: string, rating: number): Promise<RatingResult> {
  // POST: not retried.
  const body = await call(() => elearningClient.rateFormation(toNumber(courseId), { rating }, options(req)), {
    notFound: () => courseNotFound(courseId),
    statuses: { 409: notCompleted('The course must be completed before it is rated.') },
  });
  if (!isRecord(body) || typeof body.rating_average !== 'number' || typeof body.rating_count !== 'number' || typeof body.my_rating !== 'number') {
    throw invalidAnswer();
  }
  return { average: body.rating_average, count: body.rating_count, mine: body.my_rating };
}

/** Training time of the caller during `year` (the current one by default). */
export async function loadSummary(req: Caller, year: number | undefined): Promise<SummaryResultView> {
  const body = await call(() => elearningClient.getMySummary(year === undefined ? undefined : { year }, options(req)), {
    retry: true,
    statuses: { 400: () => new HttpError(400, 'Invalid year.', { details: [{ path: 'query.year', message: 'Expected a year from 2000 to 2100.' }] }) },
  });
  if (!isRecord(body) || typeof body.year !== 'number' || typeof body.annual_goal_minutes !== 'number' || typeof body.time_spent_seconds !== 'number'
    || typeof body.completed_count !== 'number') {
    throw invalidAnswer();
  }
  arrayOf(body, 'formations');
  return body as SummaryResultView;
}

export type PdfFile = { content: Buffer; disposition?: string };

/** A PDF answer: its bytes and the `Content-Disposition` of the E-learning API, if any. */
async function pdf(request: () => Promise<{ data: unknown; headers?: unknown }>, callOptions: CallOptions): Promise<PdfFile> {
  let response: { data: unknown; headers?: unknown };
  try {
    response = await withRetry(request);
  } catch (error) {
    // Reuse the mapping of `call` on the same failure.
    return call(() => Promise.reject(error), callOptions);
  }
  const { data } = response;
  const content = Buffer.isBuffer(data) ? data : data instanceof ArrayBuffer ? Buffer.from(data) : undefined;
  if (!content || content.subarray(0, 5).toString('latin1') !== '%PDF-') throw invalidAnswer();
  const headers = isRecord(response.headers) ? response.headers : {};
  const disposition = typeof headers['content-disposition'] === 'string' ? headers['content-disposition'] : undefined;
  // Only a plain `attachment` / `inline` with a safe file name is kept.
  return /^(attachment|inline)(; *filename="[\w .-]{1,128}")?$/.test(disposition ?? '') ? { content, disposition } : { content };
}

/** Attestation of a course the caller completed: 404 when not enrolled (or no such course), 409 while not completed. */
export function loadCertificate(req: Caller, courseId: string): Promise<PdfFile> {
  return pdf(() => elearningClient.getCertificate(toNumber(courseId), pdfOptions(req)), {
    notFound: () => courseNotFound(courseId),
    statuses: { 409: notCompleted('The course is not completed yet.') },
  });
}

/** Attestations of the courses the caller completed during `year`: 404 when there is none. */
export function loadCertificates(req: Caller, year: number | undefined): Promise<PdfFile> {
  return pdf(() => elearningClient.getMyCertificates(year === undefined ? undefined : { year }, pdfOptions(req)), {
    statuses: {
      404: () => new HttpError(404, 'No course completed during this year.'),
      400: () => new HttpError(400, 'Invalid year.', { details: [{ path: 'query.year', message: 'Expected a year from 2000 to 2100.' }] }),
    },
  });
}

/**
 * Signed URL of a stored file of the course (video, PDF, document, audio). 404 when the caller is not enrolled in
 * the course, or the content is not a stored file of that chapter (a link, a quiz...).
 */
export async function loadContentFile(req: Caller, courseId: string, chapterId: string, contentId: string): Promise<{ url: string }> {
  const body = await call(() => elearningClient.getAttachmentUrl(toNumber(courseId), toNumber(chapterId), toNumber(contentId), options(req)), {
    retry: true,
    notFound: (status) =>
      status === 403
        ? courseNotFound(courseId)
        : new HttpError(404, 'File not found.', {
          details: [{ path: 'params.contentId', message: `No stored file ${contentId} in chapter ${chapterId}.` } satisfies ErrorDetail],
        }),
  });
  if (!isRecord(body) || typeof body.url !== 'string' || !body.url) throw invalidAnswer();
  return { url: body.url };
}

// --- Administration (the E-learning API checks the administrator again) ---

const forbidden = () => new HttpError(403, 'This action is restricted to administrators.');

/** An E-learning API 400 on a course body: the BFF field it names when it can be read safely, never its text. */
function refusedCourse(error: unknown): HttpError {
  const data = isRecord(error) && isRecord(error.response) ? error.response.data : undefined;
  const field = fieldOfUpstreamError(data);
  return new HttpError(400, 'The e-learning service refused the course.', {
    details: field ? [{ path: `body.${field}`, message: 'Refused by the e-learning service.' }] : [],
  });
}

const adminStatuses = { 400: refusedCourse, 403: forbidden };

function courseIdOf(body: unknown): number {
  if (!isRecord(body) || typeof body.id !== 'number') throw invalidAnswer();
  return body.id;
}

/** Creates a formation; its id. */
export async function createCourse(req: Caller, course: CourseBody): Promise<number> {
  return courseIdOf(await call(() => elearningClient.createFormation(course, options(req)), { statuses: adminStatuses }));
}

/** Replaces a formation (kept rows are the ones with an id); 404 when it does not exist. */
export async function updateCourse(req: Caller, courseId: string, course: CourseBody): Promise<number> {
  return courseIdOf(await call(() => elearningClient.updateFormation(toNumber(courseId), course, options(req)), {
    statuses: adminStatuses,
    notFound: () => courseNotFound(courseId),
  }));
}

/** Deletes a formation with its chapters, contents and enrolments; 404 when it does not exist. */
export async function deleteCourse(req: Caller, courseId: string): Promise<void> {
  await call(() => elearningClient.deleteFormation(toNumber(courseId), options(req)), {
    statuses: { 403: forbidden },
    notFound: () => courseNotFound(courseId),
  });
}

/** Reminds the late agents of a mandatory course (all of them, or `userIds`); 404 unknown course, 409 not mandatory. */
export async function sendReminders(req: Caller, courseId: string, userIds: string[] | undefined): Promise<number> {
  const body = await call(
    () => elearningClient.sendReminders(toNumber(courseId), userIds ? { user_ids: userIds.map(toNumber) } : {}, options(req)),
    {
      statuses: { 403: forbidden, 409: () => new HttpError(409, 'Reminders are only sent for a mandatory course.') },
      notFound: () => courseNotFound(courseId),
    },
  );
  if (!isRecord(body) || typeof body.sent !== 'number') throw invalidAnswer();
  return body.sent;
}

/** E-learning indicators of the instance. */
export async function loadStats(req: Caller): Promise<GetStatsResultView> {
  const body = await call(() => elearningClient.getStats(options(req)), { retry: true, statuses: { 403: forbidden } });
  if (!isRecord(body)) throw invalidAnswer();
  for (const key of ['by_service', 'by_formation', 'late_agents']) arrayOf(body, key);
  return body as unknown as GetStatsResultView;
}

// --- Enrolment (MAIR-817): only an administrator enrols agents in a course ---

/** Page size of `GET /api/v1/admin/users/` (its cap) when the BFF scans the agents for a search. */
const AGENTS_PAGE = 200;
/** Upstream pages a search reads at most per request: 1000 agents. */
const MAX_SEARCH_PAGES = 5;

export type AgentPage = { agents: User[]; nextOffset: number | null };

/** One page of the active agents (`GET /api/v1/admin/users/`), checked. */
async function agentsPage(req: Caller, limit: number, offset: number): Promise<User[]> {
  const body = await call(() => elearningClient.getUsers({ limit, offset }, options(req)), { retry: true, statuses: { 403: forbidden } });
  const users = arrayOf<unknown>(body, 'users');
  if (!users.every((user) => isRecord(user) && typeof user.id === 'number' && typeof user.name === 'string')) throw invalidAnswer();
  return users as User[];
}

/** Lower case, accents removed: the search ignores both. */
function folded(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Agents an administrator can enrol, in id order. Without `search`: one upstream page. The E-learning API cannot
 * search, so with `search` the BFF reads pages of 200 agents from `offset` (at most 5, i.e. 1000 agents) and keeps the
 * names that contain it, until `limit` matches; `nextOffset` is where to read on.
 */
export async function loadAgents(req: Caller, { search, limit, offset }: { search?: string; limit: number; offset: number }): Promise<AgentPage> {
  if (!search) {
    const agents = await agentsPage(req, limit, offset);
    return { agents, nextOffset: agents.length < limit ? null : offset + agents.length };
  }
  const term = folded(search);
  const agents: User[] = [];
  let position = offset;
  for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
    // Sequential on purpose: the next page is only read when this one did not bring `limit` matches.
    // eslint-disable-next-line no-await-in-loop
    const users = await agentsPage(req, AGENTS_PAGE, position);
    for (const user of users) {
      position += 1;
      if (folded(user.name).includes(term)) agents.push(user);
      if (agents.length === limit) return { agents, nextOffset: position };
    }
    if (users.length < AGENTS_PAGE) return { agents, nextOffset: null };
  }
  return { agents, nextOffset: position };
}

/** 404 unless the formation exists (`GET /api/v1/admin/formations/{formation_id}/`, its structure only). */
async function ensureCourse(req: Caller, courseId: string): Promise<void> {
  await call(() => elearningClient.getFormationById(toNumber(courseId), undefined, options(req)), {
    retry: true,
    statuses: { 403: forbidden },
    notFound: () => courseNotFound(courseId),
  });
}

/** The enrolment of `userId` in the course, `undefined` when not enrolled (`GET /api/v1/admin/users/{user_id}/`). */
async function enrolmentOf(req: Caller, userId: number, courseId: string): Promise<UsersFormation | undefined> {
  const body = await call(() => elearningClient.getUserFormations(userId, undefined, options(req)), { retry: true, statuses: { 403: forbidden } });
  const formations = arrayOf<unknown>(body, 'formations');
  const found = formations.find((formation) => isRecord(formation) && String(formation.id) === courseId);
  if (found !== undefined && typeof (found as UsersFormation).progress_status !== 'string') throw invalidAnswer();
  return found as UsersFormation | undefined;
}

/** Share of the modules `userId` completed in the course, percent (`GET /api/v1/admin/users/{user_id}/{formation_id}/`). */
async function moduleProgress(req: Caller, userId: number, courseId: string): Promise<number> {
  const body = await call(() => elearningClient.getUserFormation(userId, toNumber(courseId), undefined, options(req)), {
    retry: true,
    statuses: { 403: forbidden },
    notFound: () => courseNotFound(courseId),
  });
  const modules = arrayOf<UsersFormationModule>(body, 'modules');
  if (modules.length === 0) return 0;
  return Math.round((100 * modules.filter((module) => isRecord(module) && module.is_completed === true).length) / modules.length);
}

export type Learner = { user: User; enrolment: UsersFormation; progress: number };

/**
 * The agents enrolled in the course among one page of the active agents (`limit` from `offset`). The E-learning API
 * has no list of the learners of a formation, so the BFF reads the page of agents, then the enrolments of each agent
 * (5 at a time), then the module progress of those in progress: at most 2 + 2 x `limit` calls (`limit` <= 50).
 * 404 when the course does not exist.
 */
export async function loadLearners(req: Caller, courseId: string, limit: number, offset: number): Promise<{ learners: Learner[]; nextOffset: number | null }> {
  const [, users] = await Promise.all([ensureCourse(req, courseId), agentsPage(req, limit, offset)]);
  const learners = await mapWithConcurrency(users, DEFAULT_CONCURRENCY, async (user): Promise<Learner | undefined> => {
    const enrolment = await enrolmentOf(req, user.id, courseId);
    if (!enrolment) return undefined;
    const progress = enrolment.progress_status === 'Completed' ? 100
      : enrolment.progress_status === 'NotStarted' ? 0
        : await moduleProgress(req, user.id, courseId);
    return { user, enrolment, progress };
  });
  return {
    learners: learners.filter((learner): learner is Learner => learner !== undefined),
    nextOffset: users.length < limit ? null : offset + users.length,
  };
}

export type EnrolmentOutcome = { enrolled: string[]; alreadyEnrolled: string[]; failed: string[] };

/**
 * Enrols each agent in the course (`POST /api/v1/admin/formations/{formation_id}/`, idempotent upstream), 5 at a time.
 * The API answers the same 200 to an agent who was enrolled already, so each enrolment is read first: at most
 * 1 + 2 x 200 calls. 404 when the course does not exist; per agent, an unknown or archived account (upstream 404) or
 * any other failure of that agent's calls lands in `failed`. A refused session (401) or administrator (403) fails the
 * whole request once every agent was handled.
 */
export async function enrolLearners(req: Caller, courseId: string, userIds: string[]): Promise<EnrolmentOutcome> {
  await ensureCourse(req, courseId);
  const formationId = toNumber(courseId);
  const outcome: EnrolmentOutcome = { enrolled: [], alreadyEnrolled: [], failed: [] };
  const results = await mapWithConcurrency(userIds, DEFAULT_CONCURRENCY, async (userId) => {
    try {
      if (await enrolmentOf(req, toNumber(userId), courseId)) return 'alreadyEnrolled' as const;
      // POST: not retried.
      await call(() => elearningClient.registerUserToFormation(formationId, { user_id: toNumber(userId) }, options(req)), {
        statuses: { 403: forbidden, 404: () => new HttpError(404, 'Unknown agent or course.') },
      });
      return 'enrolled' as const;
    } catch (error) {
      if (error instanceof HttpError && (error.status === 401 || error.status === 403)) return error;
      return 'failed' as const;
    }
  });
  const fatal = results.find((result): result is HttpError => result instanceof HttpError);
  if (fatal) throw fatal;
  results.forEach((result, index) => outcome[result as keyof EnrolmentOutcome].push(userIds[index]));
  return outcome;
}

/** Unenrols an agent (`DELETE /api/v1/admin/users/{user_id}/{formation_id}/`): 404 when not enrolled or unknown. */
export async function removeLearner(req: Caller, courseId: string, userId: string): Promise<void> {
  await call(() => elearningClient.unsubFormation(toNumber(userId), toNumber(courseId), options(req)), {
    statuses: {
      403: forbidden,
      404: () => new HttpError(404, 'Enrolment not found.', {
        details: [{ path: 'params.userId', message: `Agent ${userId} is not enrolled in course ${courseId}.` } satisfies ErrorDetail],
      }),
    },
  });
}
