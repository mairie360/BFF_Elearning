import { authorization } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  CourseActionResponse,
  CourseIdParams,
  registry,
  sessionErrorResponses,
  StartCourseBody,
} from '../../openapi-registry';
import { nextContentId, validationError } from './elearning_helpers';
import { loadCourse } from './elearning_upstream';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'post',
  path: '/elearning/courses/{courseId}/start',
  tags: ['E-learning'],
  summary: 'Starts or resumes a course',
  description:
    'Returns the course with its progress, the next content to open and the course URL. Nothing is written: the E-learning API records the start of a course when its first chapter is completed.',
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
      description: 'Course to start or resume',
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
      description: 'Unknown course, or the caller is not enrolled in it',
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

  await getAuthenticatedUser(req);
  const course = await loadCourse(authorization(req), paramsResult.data.courseId);
  const next = nextContentId(course);

  return res.status(200).json({
    course,
    ...(next ? { nextContentId: next } : {}),
    redirectUrl: `/courses/${course.id}`,
  });
});

export default router;
