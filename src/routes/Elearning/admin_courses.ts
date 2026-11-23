import { HttpError, parseRequest } from '@mairie360/bffs-lib';
import { Request, Response, Router } from 'express';
import {
  AdminCourseCreateBody,
  AdminCourseDeleteResponse,
  AdminCourseResponse,
  ErrorResponse,
  AdminCourseIdParams,
  ElearningCourse,
  registry,
  SendRemindersBody,
  SendRemindersResponse,
  sessionErrorResponses,
} from '../../openapi-registry';
import { isCallerAdmin } from './auth';
import { savedCourse, toCourseBody } from './elearning_helpers';
import { createCourse, deleteCourse, sendReminders, updateCourse } from './elearning_upstream';

const router = Router();

const json = (description: string) => ({ description, content: { 'application/json': { schema: ErrorResponse } } });

const invalidBody = json(
  'Invalid request payload: every invalid field is named in `details` (`body.title`, `body.details.chapters.0.contents.1.href`...). A field the e-learning service refused is named when it can be told.',
);
const commonResponses = {
  ...sessionErrorResponses,
  403: json('Restricted to administrators'),
  500: json('Unexpected server error'),
};

const COURSE_BODY_DESCRIPTION =
  'The course as the front edits it. Sent to the e-learning service: `title`, `description`, `category`, `level` (else read from `levelBadge`), `mandatory` (else `titleBadge.variant` = `mandatory`), `deadline`, `source` (default `internal`), `instructor` (else `details.instructor`) and `details.chapters[].contents[]` (`type`, `title`, `description`, `durationSeconds` or `duration`, `required` (default `true`), `href` for a link). Other fields are ignored.';

registry.registerPath({
  method: 'post',
  path: '/elearning/admin/courses',
  tags: ['E-learning administration'],
  summary: 'Creates a course',
  description: `${COURSE_BODY_DESCRIPTION} Every chapter and content is new: their ids are ignored, and a content can only be a \`link\`, a \`quiz\` or \`other\` (there is no upload).`,
  request: {
    body: { required: true, content: { 'application/json': { schema: AdminCourseCreateBody } } },
  },
  responses: {
    201: {
      description: 'Course created',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    400: invalidBody,
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Replaces a course',
  description: `${COURSE_BODY_DESCRIPTION} Full replacement: the chapters and contents whose \`id\` is the decimal id of an existing row are kept (a stored file keeps its file and its type), the others are created (a new content can only be a \`link\`, a \`quiz\` or \`other\`), and the rows left out are deleted.`,
  request: {
    params: AdminCourseIdParams,
    body: { required: true, content: { 'application/json': { schema: ElearningCourse } } },
  },
  responses: {
    200: {
      description: 'Course updated',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    400: invalidBody,
    404: json('Unknown course'),
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Deletes a course',
  description: 'Deletes the course with its chapters, contents, enrolments and progress.',
  request: { params: AdminCourseIdParams },
  responses: {
    200: {
      description: 'Course deleted',
      content: { 'application/json': { schema: AdminCourseDeleteResponse } },
    },
    400: json('Invalid course identifier'),
    404: json('Unknown course'),
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/elearning/admin/courses/{courseId}/reminders',
  tags: ['E-learning administration'],
  summary: 'Reminds the late agents of a mandatory course',
  description:
    'Sends a reminder to the given agents, or to every agent late on the course (deadline past, not completed) when `userIds` is absent. Agents not enrolled, or who completed it, are ignored.',
  request: {
    params: AdminCourseIdParams,
    body: { required: false, content: { 'application/json': { schema: SendRemindersBody } } },
  },
  responses: {
    200: { description: 'Reminders sent', content: { 'application/json': { schema: SendRemindersResponse } } },
    400: json('Invalid request payload'),
    404: json('Unknown course'),
    409: json('The course is not mandatory'),
    ...commonResponses,
  },
});

/** 403 unless the caller holds an `admin` role (from the token, or Core for an older token). */
async function ensureAdmin(req: Request): Promise<void> {
  if (!(await isCallerAdmin(req))) throw new HttpError(403, 'This action is restricted to administrators.');
}

router.post('/', async (req: Request, res: Response) => {
  const course = parseRequest(AdminCourseCreateBody, req.body, 'body');
  const body = toCourseBody(course, { keepIds: false });

  await ensureAdmin(req);

  const id = await createCourse(req, body);
  return res.status(201).json({ id: String(id), course: savedCourse(course, body, id) });
});

router.patch('/:courseId', async (req: Request, res: Response) => {
  const { courseId } = parseRequest(AdminCourseIdParams, req.params, 'params');
  const course = parseRequest(ElearningCourse, req.body, 'body');
  const body = toCourseBody(course, { keepIds: true });

  await ensureAdmin(req);

  const id = await updateCourse(req, courseId, body);
  return res.status(200).json({ id: String(id), course: savedCourse(course, body, id) });
});

router.delete('/:courseId', async (req: Request, res: Response) => {
  const { courseId } = parseRequest(AdminCourseIdParams, req.params, 'params');

  await ensureAdmin(req);

  await deleteCourse(req, courseId);
  return res.status(200).json({ deleted: true, courseId });
});

router.post('/:courseId/reminders', async (req: Request, res: Response) => {
  const { courseId } = parseRequest(AdminCourseIdParams, req.params, 'params');
  const { userIds } = parseRequest(SendRemindersBody, req.body ?? {}, 'body');

  await ensureAdmin(req);

  return res.status(200).json({ sent: await sendReminders(req, courseId, userIds) });
});

export default router;
