import { Router, Request, Response } from 'express';
import {
  ApiError,
  CourseActionResponse,
  CourseIdParams,
  registry,
  StartCourseBody,
} from '../../openapi-registry';
import { handleRouteError, sendValidationError, startCourse } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/start',
  tags: ['E-learning'],
  summary: 'Demarre ou reprend une formation',
  description: 'Retourne la formation actualisee, le prochain contenu et une URL de reprise optionnelle.',
  request: {
    params: CourseIdParams,
    body: {
      required: false,
      content: {
        'application/json': {
          schema: StartCourseBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Formation demarree ou reprise',
      content: {
        'application/json': {
          schema: CourseActionResponse,
        },
      },
    },
    400: {
      description: 'Payload invalide',
      content: {
        'application/json': {
          schema: ApiError,
        },
      },
    },
    404: {
      description: 'Formation introuvable',
      content: {
        'application/json': {
          schema: ApiError,
        },
      },
    },
    422: {
      description: 'Formation incoherente ou detail indisponible',
      content: {
        'application/json': {
          schema: ApiError,
        },
      },
    },
    500: {
      description: 'Erreur serveur non prevue',
      content: {
        'application/json': {
          schema: ApiError,
        },
      },
    },
  },
});

router.post('/:courseId/start', async (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = StartCourseBody.safeParse(req.body ?? {});

  if (!paramsResult.success) {
    return sendValidationError(res, paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    const user = await getAuthenticatedUser(req);
    return res.status(200).json(startCourse(user.id, paramsResult.data.courseId));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
