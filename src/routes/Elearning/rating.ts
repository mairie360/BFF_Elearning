import { Router, Request, Response } from 'express';
import { ApiError, CourseIdParams, RatingSubmitResponse, registry, SubmitRatingBody } from '../../openapi-registry';
import { handleRouteError, sendValidationError, submitCourseRating } from './elearning_helpers';

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

router.post('/:courseId/rating', (req: Request, res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = SubmitRatingBody.safeParse(req.body);

  if (!paramsResult.success) {
    return sendValidationError(res, paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    return res.status(200).json(submitCourseRating(paramsResult.data.courseId, bodyResult.data));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
