import { asCaller, HttpError, upstreamError, upstreamStatus, withRetry } from '@mairie360/bffs-lib';
import type { Request } from 'express';
import { elearningClient } from '../../clients/elearningClient';
import { UPSTREAM_TIMEOUT_MS } from '../../clients/upstream';
import {
  type BffChapter,
  type BffContent,
  type BffCourse,
  courseProgress,
  type CourseProgress,
  isRecord,
  toCourse,
  type UpstreamCatalogFormation,
  type UpstreamChapter,
  type UpstreamFormation,
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
  /** Idempotent GET only: retried once on a transient failure. */
  retry?: boolean;
}

/**
 * One E-learning API call, failures mapped by `upstreamError` from the lib (401 relayed, no answer or any
 * other status: 502), plus the 403/404 -> route-specific 404 mapping the course routes declare.
 */
async function call<T>(request: () => Promise<{ data: T }>, options: CallOptions = {}): Promise<T> {
  try {
    return (await (options.retry ? withRetry(request) : request())).data;
  } catch (error) {
    const status = error instanceof HttpError ? undefined : upstreamStatus(error);
    if (options.notFound && (status === 403 || status === 404)) throw options.notFound(status);
    throw upstreamError(SERVICE, error, [401]);
  }
}

const options = (req: Caller) => asCaller(SERVICE, req, UPSTREAM_TIMEOUT_MS);

/** The array `key` of an upstream body, or a 502 when the answer does not have the documented shape. */
function arrayOf<T>(body: unknown, key: string): T[] {
  if (!isRecord(body) || !Array.isArray(body[key])) throw invalidAnswer();
  return body[key] as T[];
}

function toNumber(id: string): number {
  return Number.parseInt(id, 10);
}

/**
 * The caller's whole catalogue, formations with their modules and files, in ONE E-learning API call
 * (`GET /api/v1/formations/catalog/`, MAIR-506): the per-formation and per-module reads it replaces
 * cost 1 + 15 + 150 calls for a learner of 15 formations of 10 modules.
 */
async function loadCatalog(req: Caller): Promise<Array<{ formation: UpstreamFormation; chapters: UpstreamChapter[] }>> {
  const body = await call(() => elearningClient.getMyCatalog(options(req)), { retry: true });
  return arrayOf<UpstreamCatalogFormation>(body, 'formations').map(({ modules, ...formation }) => {
    if (!Array.isArray(modules)) throw invalidAnswer();
    return {
      formation,
      chapters: modules.map(({ files, ...module }) => {
        if (!Array.isArray(files)) throw invalidAnswer();
        return { module, files };
      }),
    };
  });
}

/** Courses the caller is enrolled in, with their chapters, contents and progress. */
export async function loadCourses(req: Caller): Promise<BffCourse[]> {
  return (await loadCatalog(req)).map(({ formation, chapters }) => toCourse(formation, chapters));
}

/** One course of the caller; 404 when it does not exist or the caller is not enrolled in it. */
export async function loadCourse(req: Caller, courseId: string): Promise<BffCourse> {
  const entry = (await loadCatalog(req)).find(({ formation }) => String(formation.id) === courseId);
  if (!entry) throw courseNotFound(courseId);
  return toCourse(entry.formation, entry.chapters);
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
