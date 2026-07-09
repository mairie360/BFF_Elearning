import { Router, Request, Response } from 'express';
import {
  ApiError,
  CompleteContentBody,
  ContentCompleteResponse,
  CourseContentParams,
  registry,
} from '../../openapi-registry';
import { completeCourseContent, handleRouteError, sendValidationError } from './elearning_helpers';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/contents/{contentId}/complete',
  tags: ['E-learning'],
  summary: 'Marque un contenu comme termine ou non termine',
  description:
    'Met a jour la progression de la formation et retourne les chapitres, le chapitre et le contenu actualises.',
  request: {
    params: CourseContentParams,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CompleteContentBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Progression mise a jour',
      content: {
        'application/json': {
          schema: ContentCompleteResponse,
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
      description: 'Formation, chapitre ou contenu introuvable',
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

router.post('/:courseId/contents/:contentId/complete', (req: Request, res: Response) => {
  const paramsResult = CourseContentParams.safeParse(req.params);
  const bodyResult = CompleteContentBody.safeParse(req.body);

  if (!paramsResult.success) {
    return sendValidationError(res, paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    return res
      .status(200)
      .json(completeCourseContent(paramsResult.data.courseId, paramsResult.data.contentId, bodyResult.data));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
