import { parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  CourseIdParams,
  RatingSubmitResponse,
  registry,
  sessionErrorResponses,
  SubmitRatingBody,
} from '../../openapi-registry';
import { ratingLabel } from './elearning_helpers';
import { rateCourse } from './elearning_upstream';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/rating',
  tags: ['E-learning'],
  summary: 'Rates a course the caller completed',
  description:
    'Stores the rating of the caller (1 to 5; a new rating replaces the previous one) in the E-learning API and returns the rating of the course.',
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
    404: {
      description: 'Unknown course, or the caller is not enrolled in it',
      content: { 'application/json': { schema: ErrorResponse } },
    },
    409: {
      description: 'The caller has not completed the course yet',
      content: { 'application/json': { schema: ErrorResponse } },
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
  const { courseId } = parseRequest(CourseIdParams, req.params, 'params');
  const { rating } = parseRequest(SubmitRatingBody, req.body, 'body');

  // No profile read (MAIR-525): the E-learning API checks the session and the enrolment.
  const result = await rateCourse(req, courseId, rating);
  return res.status(200).json({
    rating: result.average,
    ratingCount: result.count,
    ratingLabel: ratingLabel(result.average, result.count),
    myRating: result.mine,
    ratingDistribution: {},
    submitted: true,
  });
});

export default router;
