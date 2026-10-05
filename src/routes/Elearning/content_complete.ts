import { authorization } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  CompleteContentBody,
  ContentCompleteResponse,
  CourseContentParams,
  notImplementedResponse,
  registry,
  sessionErrorResponses,
} from '../../openapi-registry';
import { notImplemented, validationError } from './elearning_helpers';
import { completeContent } from './elearning_upstream';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/contents/{contentId}/complete',
  tags: ['E-learning'],
  summary: 'Marks a content as completed',
  description:
    'Records the completion in the E-learning API, which tracks progress per chapter: completing a content completes its whole chapter. Returns the updated progress, chapters, chapter and content. `completed: false` answers 501 (the E-learning API cannot undo a completion).',
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
      description: 'Progress updated',
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
      description: 'Course, chapter or content not found, or the caller is not enrolled in the course',
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
    ...notImplementedResponse,
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

  await getAuthenticatedUser(req);

  if (!bodyResult.data.completed) {
    throw notImplemented('The e-learning service cannot mark a chapter as not completed.');
  }

  const { courseId, contentId } = paramsResult.data;
  return res.status(200).json(await completeContent(authorization(req), courseId, bodyResult.data.chapterId, contentId));
});

export default router;
