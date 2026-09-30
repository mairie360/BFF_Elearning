import { HttpError } from '@mairie360/bffs-lib';
import { Request, Response, Router } from 'express';
import {
  AdminCourseCreateBody,
  AdminCourseDeleteResponse,
  AdminCourseResponse,
  ErrorResponse,
  CourseIdParams,
  DeletedCourseIdParams,
  ElearningCourse,
  registry,
  sessionErrorResponses,
} from '../../openapi-registry';
import { getAuthenticatedUser } from './auth';
import { createAdminCourse, deleteAdminCourse, updateAdminCourse, validationError } from './elearning_helpers';

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
};

registry.registerPath({
  method: 'post',
  path: '/elearning/admin/courses',
  tags: ['E-learning administration'],
  summary: 'Crée une formation complète',
  request: {
    body: { required: true, content: { 'application/json': { schema: AdminCourseCreateBody } } },
  },
  responses: {
    201: {
      description: 'Formation créée',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    ...commonResponses,
    409: {
      description: 'A course already has this id',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Modifie une formation complète',
  request: {
    params: CourseIdParams,
    body: { required: true, content: { 'application/json': { schema: ElearningCourse } } },
  },
  responses: {
    200: {
      description: 'Formation mise à jour',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    ...commonResponses,
    404: {
      description: 'Course not found',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Supprime une formation',
  request: { params: DeletedCourseIdParams },
  responses: {
    200: {
      description: 'Formation supprimée',
      content: { 'application/json': { schema: AdminCourseDeleteResponse } },
    },
    401: commonResponses[401],
    403: commonResponses[403],
    500: commonResponses[500],
    502: commonResponses[502],
    404: {
      description: 'Course not found',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
});

function ensureAdmin(isAdmin: boolean): void {
  if (!isAdmin) throw new HttpError(403, 'This action is restricted to administrators.');
}

router.post('/', async (req: Request, res: Response) => {
  const bodyResult = AdminCourseCreateBody.safeParse(req.body);
  if (!bodyResult.success) throw validationError('body', bodyResult.error.issues);

  const user = await getAuthenticatedUser(req);
  ensureAdmin(user.isAdmin);

  return res.status(201).json({ course: createAdminCourse(bodyResult.data) });
});

router.patch('/:courseId', async (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = ElearningCourse.safeParse(req.body);
  if (!paramsResult.success) throw validationError('params', paramsResult.error.issues);
  if (!bodyResult.success) throw validationError('body', bodyResult.error.issues);

  const user = await getAuthenticatedUser(req);
  ensureAdmin(user.isAdmin);

  return res.status(200).json({
    course: updateAdminCourse(paramsResult.data.courseId, bodyResult.data),
  });
});

router.delete('/:courseId', async (req: Request, res: Response) => {
  const paramsResult = DeletedCourseIdParams.safeParse(req.params);
  if (!paramsResult.success) throw validationError('params', paramsResult.error.issues);

  const user = await getAuthenticatedUser(req);
  ensureAdmin(user.isAdmin);

  deleteAdminCourse(paramsResult.data.courseId);
  return res.status(200).json({ deleted: true, courseId: paramsResult.data.courseId });
});

export default router;
