import { Request, Response, Router } from 'express';
import {
  AdminCourseDeleteResponse,
  AdminCourseResponse,
  ApiError,
  CourseIdParams,
  ElearningCourse,
  registry,
} from '../../openapi-registry';
import { getAuthenticatedUser } from './auth';
import {
  createAdminCourse,
  deleteAdminCourse,
  handleRouteError,
  sendError,
  sendValidationError,
  updateAdminCourse,
} from './elearning_helpers';

const router = Router();

const commonResponses = {
  400: {
    description: 'Payload invalide',
    content: { 'application/json': { schema: ApiError } },
  },
  401: {
    description: 'Session invalide',
    content: { 'application/json': { schema: ApiError } },
  },
  403: {
    description: 'Accès réservé aux administrateurs',
    content: { 'application/json': { schema: ApiError } },
  },
};

registry.registerPath({
  method: 'post',
  path: '/elearning/admin/courses',
  tags: ['E-learning administration'],
  summary: 'Crée une formation complète',
  request: {
    body: { required: true, content: { 'application/json': { schema: ElearningCourse } } },
  },
  responses: {
    201: {
      description: 'Formation créée',
      content: { 'application/json': { schema: AdminCourseResponse } },
    },
    ...commonResponses,
    409: {
      description: 'Identifiant déjà utilisé',
      content: { 'application/json': { schema: ApiError } },
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
      description: 'Formation introuvable',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/elearning/admin/courses/{courseId}',
  tags: ['E-learning administration'],
  summary: 'Supprime une formation',
  request: { params: CourseIdParams },
  responses: {
    200: {
      description: 'Formation supprimée',
      content: { 'application/json': { schema: AdminCourseDeleteResponse } },
    },
    401: commonResponses[401],
    403: commonResponses[403],
    404: {
      description: 'Formation introuvable',
      content: { 'application/json': { schema: ApiError } },
    },
  },
});

function ensureAdmin(isAdmin: boolean, res: Response): Response | null {
  return isAdmin ? null : sendError(res, 403, 'FORBIDDEN', 'Cette action est réservée aux administrateurs.');
}

router.post('/', async (req: Request, res: Response) => {
  const bodyResult = ElearningCourse.safeParse(req.body);
  if (!bodyResult.success) return sendValidationError(res, bodyResult.error.issues);

  try {
    const user = await getAuthenticatedUser(req);
    const forbiddenResponse = ensureAdmin(user.isAdmin, res);
    if (forbiddenResponse) return forbiddenResponse;

    return res.status(201).json({ course: createAdminCourse(bodyResult.data) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/:courseId', async (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = ElearningCourse.safeParse(req.body);
  if (!paramsResult.success) return sendValidationError(res, paramsResult.error.issues);
  if (!bodyResult.success) return sendValidationError(res, bodyResult.error.issues);

  try {
    const user = await getAuthenticatedUser(req);
    const forbiddenResponse = ensureAdmin(user.isAdmin, res);
    if (forbiddenResponse) return forbiddenResponse;

    return res.status(200).json({
      course: updateAdminCourse(paramsResult.data.courseId, bodyResult.data),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete('/:courseId', async (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  if (!paramsResult.success) return sendValidationError(res, paramsResult.error.issues);

  try {
    const user = await getAuthenticatedUser(req);
    const forbiddenResponse = ensureAdmin(user.isAdmin, res);
    if (forbiddenResponse) return forbiddenResponse;

    deleteAdminCourse(paramsResult.data.courseId);
    return res.status(200).json({ deleted: true, courseId: paramsResult.data.courseId });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
