import { HttpError, parseRequest } from '@mairie360/bffs-lib';
import { Request, Response, Router } from 'express';
import {
  AdminCourseCreateBody,
  AdminCourseDeleteResponse,
  AdminCourseResponse,
  ErrorResponse,
  CourseIdParams,
  ElearningCourse,
  notImplementedResponse,
  registry,
  sessionErrorResponses,
} from '../../openapi-registry';
import { getAuthenticatedUser } from './auth';
import { notImplemented } from './elearning_helpers';

const router = Router();

const commonResponses = {
  400: {
    description: 'Invalid request payload',
    content: { 'application/json': { schema: ErrorResponse } },
  },
  ...sessionErrorResponses,
  403: {
    description: 'Restricted to administrators',
    content: { 'application/json': { schema: ErrorResponse } },
  },
  500: {
    description: 'Unexpected server error',
    content: { 'application/json': { schema: ErrorResponse } },
  },
  ...notImplementedResponse,
};

// The E-learning API publishes no operation to create, update or delete a formation (courses are
// seeded in its database). Until it does, these routes validate the request and the administrator
// role, then answer 501 instead of editing an in-memory copy that every restart or replica loses.
const NOT_AVAILABLE =
  'Course administration is not available: the e-learning service does not support creating, updating or deleting courses yet.';

registry.registerPath({
  method: 'post',
  path: '/elearning/admin/courses',
  tags: ['E-learning administration'],
  summary: 'Creates a course (not available yet: 501)',
  request: {
    body: { required: true, content: { 'application/json': { schema: AdminCourseCreateBody } } },
  },
  responses: {
    201: {
      description: 'Course created',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Updates a course (not available yet: 501)',
  request: {
    params: CourseIdParams,
    body: { required: true, content: { 'application/json': { schema: ElearningCourse } } },
  },
  responses: {
    200: {
      description: 'Course updated',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Deletes a course (not available yet: 501)',
  request: { params: CourseIdParams },
  responses: {
    200: {
      description: 'Course deleted',
      content: { 'application/json': { schema: AdminCourseDeleteResponse } },
    },
    401: commonResponses[401],
    403: commonResponses[403],
    500: commonResponses[500],
    502: commonResponses[502],
    503: commonResponses[503],
    501: commonResponses[501],
  },
});

function ensureAdmin(isAdmin: boolean): void {
  if (!isAdmin) throw new HttpError(403, 'This action is restricted to administrators.');
}

router.post('/', async (req: Request, _res: Response) => {
  parseRequest(AdminCourseCreateBody, req.body, 'body');

  const user = await getAuthenticatedUser(req);
  ensureAdmin(user.isAdmin);

  throw notImplemented(NOT_AVAILABLE);
});

router.patch('/:courseId', async (req: Request, _res: Response) => {
  parseRequest(CourseIdParams, req.params, 'params');
  parseRequest(ElearningCourse, req.body, 'body');

  const user = await getAuthenticatedUser(req);
  ensureAdmin(user.isAdmin);

  throw notImplemented(NOT_AVAILABLE);
});

router.delete('/:courseId', async (req: Request, _res: Response) => {
  parseRequest(CourseIdParams, req.params, 'params');

  const user = await getAuthenticatedUser(req);
  ensureAdmin(user.isAdmin);

  throw notImplemented(NOT_AVAILABLE);
});

export default router;
