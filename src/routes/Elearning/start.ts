import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  CourseActionResponse,
  CourseIdParams,
  registry,
  sessionErrorResponses,
  StartCourseBody,
} from '../../openapi-registry';
import { startCourse, validationError } from './elearning_helpers';
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
      description: 'Invalid request payload',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    404: {
      description: 'Course not found',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    422: {
      description: 'Course details unavailable',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    ...sessionErrorResponses,
    500: {
      description: 'Unexpected server error',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
  },
});

router.post('/:courseId/start', async (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = StartCourseBody.safeParse(req.body ?? {});

  if (!paramsResult.success) {
    throw validationError('params', paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    throw validationError('body', bodyResult.error.issues);
  }

  const user = await getAuthenticatedUser(req);
  return res.status(200).json(startCourse(user.id, paramsResult.data.courseId));
});

export default router;
