import { HttpError, upstreamStatus } from '@mairie360/bffs-lib';
import axios from 'axios';
import { elearningClient } from '../../clients/elearningClient';
import { asCaller } from '../../clients/upstream';
import {
  type BffChapter,
  type BffContent,
  type BffCourse,
  courseProgress,
  type CourseProgress,
  toCourse,
  type UpstreamChapter,
  type UpstreamFormation,
} from './elearning_helpers';

// Every learner read and write goes to the E-learning API on behalf of the caller (their bearer is
// forwarded: the API resolves the user from the JWT and only shows their own enrolments and
// progress). The upstream text/plain error bodies are never relayed.

type ErrorDetail = { path: string; message: string };

const unavailable = () => new HttpError(502, 'The e-learning service is unavailable.');

function courseNotFound(courseId: string): HttpError {
  return new HttpError(404, 'Course not found.', { details: [{ path: 'params.courseId', message: `No course ${courseId}.` }] });
}

/**
 * Maps a failed E-learning API call. 401 is a session problem; the 403 "not enrolled" and the 404
 * of the formation routes become the `notFound` error of the route (the caller cannot tell a
 * course they are not enrolled in from a missing one); anything else is a 502.
 */
function elearningError(error: unknown, notFound?: HttpError): HttpError {
  if (error instanceof HttpError) return error;
  const status = axios.isAxiosError(error) ? upstreamStatus(error) : undefined;
  if (status === 401) return new HttpError(401, 'Expired or invalid session.');
  if (notFound && (status === 403 || status === 404)) return notFound;
  return unavailable();
}

async function call<T>(request: () => Promise<{ data: T }>, notFound?: HttpError): Promise<T> {
  try {
    return (await request()).data;
  } catch (error) {
    throw elearningError(error, notFound);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The array `key` of an upstream body, or a 502 when the answer does not have the documented shape. */
function arrayOf<T>(body: unknown, key: string): T[] {
  if (!isRecord(body) || !Array.isArray(body[key])) throw unavailable();
  return body[key] as T[];
}

function toNumber(id: string): number {
  return Number.parseInt(id, 10);
}

async function listFormations(authorization: string): Promise<UpstreamFormation[]> {
  const body = await call(() => elearningClient.getMyFormations(asCaller('ELEARNING_API', authorization)));
  return arrayOf<UpstreamFormation>(body, 'formations');
}

async function loadChapters(authorization: string, formationId: number, notFound?: HttpError): Promise<UpstreamChapter[]> {
  const options = asCaller('ELEARNING_API', authorization);
  const body = await call(() => elearningClient.getMyFormationById(formationId, options), notFound);
  const modules = arrayOf<UpstreamChapter['module']>(body, 'modules');

  return Promise.all(
    modules.map(async (module) => {
      const moduleBody = await call(() => elearningClient.getModule(formationId, module.id, options), notFound);
      return { module, files: arrayOf<UpstreamChapter['files'][number]>(moduleBody, 'files') };
    }),
  );
}

/** Courses the caller is enrolled in, with their chapters, contents and progress. */
export async function loadCourses(authorization: string): Promise<BffCourse[]> {
  const formations = await listFormations(authorization);
  return Promise.all(formations.map(async (formation) => toCourse(formation, await loadChapters(authorization, formation.id))));
}

/** One course of the caller; 404 when it does not exist or the caller is not enrolled in it. */
export async function loadCourse(authorization: string, courseId: string): Promise<BffCourse> {
  const notFound = courseNotFound(courseId);
  const formation = (await listFormations(authorization)).find((entry) => String(entry.id) === courseId);
  if (!formation) throw notFound;
  return toCourse(formation, await loadChapters(authorization, formation.id, notFound));
}

export type ContentCompletion = CourseProgress & { chapters: BffChapter[]; chapter: BffChapter; content: BffContent };

/**
 * Marks the chapter (E-learning API module) holding `contentId` as completed for the caller, then
 * reads the course again. The content must belong to the chapter, which must belong to the course.
 */
export async function completeContent(
  authorization: string,
  courseId: string,
  chapterId: string,
  contentId: string,
): Promise<ContentCompletion> {
  const options = asCaller('ELEARNING_API', authorization);
  const formationId = toNumber(courseId);
  const moduleId = toNumber(chapterId);
  const notFound = (path: string, message: string, detail: string) =>
    new HttpError(404, message, { details: [{ path, message: detail } satisfies ErrorDetail] });

  // 403: not enrolled in the course; 404: the chapter is not a module of this course.
  let moduleBody: unknown;
  try {
    moduleBody = (await elearningClient.getModule(formationId, moduleId, options)).data;
  } catch (error) {
    const status = axios.isAxiosError(error) ? upstreamStatus(error) : undefined;
    if (status === 403) throw courseNotFound(courseId);
    if (status === 404) throw notFound('body.chapterId', 'Chapter not found.', `No chapter ${chapterId} in course ${courseId}.`);
    throw elearningError(error);
  }
  const files = arrayOf<UpstreamChapter['files'][number]>(moduleBody, 'files');
  if (!files.some((file) => String(file.id) === contentId)) {
    throw notFound('params.contentId', 'Content not found.', `No content ${contentId} in chapter ${chapterId}.`);
  }

  await call(() => elearningClient.completeModule(formationId, moduleId, options), courseNotFound(courseId));

  const course = await loadCourse(authorization, courseId);
  const chapters = course.details?.chapters ?? [];
  const chapter = chapters.find((entry) => entry.id === chapterId);
  const content = chapter?.contents?.find((entry) => entry.id === contentId);
  // The module was found a moment ago: missing now means the course changed under the request.
  if (!chapter || !content) throw unavailable();

  return { ...courseProgress(chapters), chapters, chapter, content };
}
