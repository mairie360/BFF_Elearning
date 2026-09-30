import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  CompleteContentBody,
  ContentCompleteResponse,
  CourseContentParams,
  registry,
  sessionErrorResponses,
} from '../../openapi-registry';
import { completeCourseContent, validationError } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

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
      description: 'Invalid request payload',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    404: {
      description: 'Course, chapter or content not found',
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

router.post('/:courseId/contents/:contentId/complete', async (req: Request, res: Response) => {
  const paramsResult = CourseContentParams.safeParse(req.params);
  const bodyResult = CompleteContentBody.safeParse(req.body);

  if (!paramsResult.success) {
    throw validationError('params', paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    throw validationError('body', bodyResult.error.issues);
  }

  const user = await getAuthenticatedUser(req);
  return res
    .status(200)
    .json(completeCourseContent(user.id, paramsResult.data.courseId, paramsResult.data.contentId, bodyResult.data));
});

export default router;
