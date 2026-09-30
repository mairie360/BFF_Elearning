import { Router, Request, Response } from 'express';
import { ErrorResponse, CourseIdParams, RatingSubmitResponse, registry, sessionErrorResponses, SubmitRatingBody } from '../../openapi-registry';
import { submitCourseRating, validationError } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/rating',
  tags: ['E-learning'],
  summary: 'Note une formation',
  description: 'Enregistre une note utilisateur entre 1 et 5 et retourne la repartition mise a jour.',
  request: {
    params: CourseIdParams,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SubmitRatingBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Note enregistree',
      content: {
        'application/json': {
          schema: RatingSubmitResponse,
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

router.post('/:courseId/rating', async (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = SubmitRatingBody.safeParse(req.body);

  if (!paramsResult.success) {
    throw validationError('params', paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    throw validationError('body', bodyResult.error.issues);
  }

  const user = await getAuthenticatedUser(req);
  return res.status(200).json(submitCourseRating(user.id, paramsResult.data.courseId, bodyResult.data));
});

export default router;
