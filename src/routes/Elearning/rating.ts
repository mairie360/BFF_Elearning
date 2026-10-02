import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  CourseIdParams,
  notImplementedResponse,
  RatingSubmitResponse,
  registry,
  sessionErrorResponses,
  SubmitRatingBody,
} from '../../openapi-registry';
import { notImplemented, validationError } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/rating',
  tags: ['E-learning'],
  summary: 'Rates a course',
  description:
    'Not available yet: the E-learning API does not store ratings, so a valid request from an authenticated caller answers 501. The 200 answer is the contract the route will keep once ratings are persisted upstream.',
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
      description: 'Rating recorded',
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

router.post('/:courseId/rating', async (req: Request, _res: Response) => {
  const paramsResult = CourseIdParams.safeParse(req.params);
  const bodyResult = SubmitRatingBody.safeParse(req.body);

  if (!paramsResult.success) {
    throw validationError('params', paramsResult.error.issues);
  }

  if (!bodyResult.success) {
    throw validationError('body', bodyResult.error.issues);
  }

  await getAuthenticatedUser(req);
  throw notImplemented('Course ratings are not stored by the e-learning service yet.');
});

export default router;
