import { HttpError, parseRequest } from '@mairie360/bffs-lib';
import { Request, Response, Router } from 'express';
import {
  AdminLearnerParams,
  AdminCourseIdParams,
  CourseIdParams,
  CourseLearnersQuery,
  CourseLearnersResponse,
  EnrolLearnersBody,
  EnrolLearnersResponse,
  ErrorResponse,
  registry,
  RemoveLearnerResponse,
  sessionErrorResponses,
} from '../../openapi-registry';
import { isCallerAdmin } from './auth';
import { courseLearner } from './elearning_helpers';
import { enrolLearners, loadLearners, removeLearner } from './elearning_upstream';

// MAIR-817: only an administrator enrols agents in a course (the E-learning API refuses a learner who enrols
// themselves). These routes list, enrol and unenrol the agents of a course; the agents to pick from are
// `GET /elearning/admin/agents`.

const router = Router();

const json = (description: string) => ({ description, content: { 'application/json': { schema: ErrorResponse } } });

const commonResponses = {
  ...sessionErrorResponses,
  403: json('Restricted to administrators'),
  500: json('Unexpected server error'),
};

registry.registerPath({
  method: 'get',
  path: '/elearning/admin/courses/{courseId}/learners',
  tags: ['E-learning administration'],
  summary: 'Lists the agents enrolled in a course, with their progress',
  description:
    'One page of the active (non-archived) agents enrolled in the course, by last name, first name and id, with their progress, their last activity and the last reminder sent to them. `total` counts every page; read on with `nextOffset` until it is `null`.',
  request: { params: CourseIdParams, query: CourseLearnersQuery },
  responses: {
    200: { description: 'Learners among the agents examined', content: { 'application/json': { schema: CourseLearnersResponse } } },
    400: json('Invalid course identifier, `limit` or `offset`'),
    404: json('Unknown course'),
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/elearning/admin/courses/{courseId}/learners',
  tags: ['E-learning administration'],
  summary: 'Enrols agents in a course',
  description:
    'Enrols each agent (5 at a time). An agent enrolled already keeps their progress and is listed in `alreadyEnrolled`; an unknown or archived account, or a failure of the e-learning service for one agent, lands in `failed` without stopping the others.',
  request: {
    params: AdminCourseIdParams,
    body: { required: true, content: { 'application/json': { schema: EnrolLearnersBody } } },
  },
  responses: {
    200: { description: 'Outcome per agent', content: { 'application/json': { schema: EnrolLearnersResponse } } },
    400: json('Invalid course identifier or body: every invalid field is named in `details` (`body.userIds.0`...)'),
    404: json('Unknown course'),
    ...commonResponses,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/elearning/admin/courses/{courseId}/learners/{userId}',
  tags: ['E-learning administration'],
  summary: 'Unenrols an agent from a course',
  description: 'Removes the enrolment and the progress of the agent on this course (their other courses are untouched).',
  request: { params: AdminLearnerParams },
  responses: {
    200: { description: 'Agent unenrolled', content: { 'application/json': { schema: RemoveLearnerResponse } } },
    400: json('Invalid course or agent identifier'),
    404: json('The agent is not enrolled in the course, or the course or the agent is unknown'),
    ...commonResponses,
  },
});

/** 403 unless the caller holds an `admin` role (from the token, or Core for an older token). */
async function ensureAdmin(req: Request): Promise<void> {
  if (!(await isCallerAdmin(req))) throw new HttpError(403, 'This action is restricted to administrators.');
}

router.get('/:courseId/learners', async (req: Request, res: Response) => {
  const { courseId } = parseRequest(CourseIdParams, req.params, 'params');
  const { limit, offset } = parseRequest(CourseLearnersQuery, req.query, 'query');

  await ensureAdmin(req);

  const page = await loadLearners(req, courseId, limit, offset);
  const end = offset + page.learners.length;
  return res.status(200).json({
    courseId,
    learners: page.learners.map(courseLearner),
    total: page.total,
    limit,
    offset,
    nextOffset: page.learners.length > 0 && end < page.total ? end : null,
  });
});

router.post('/:courseId/learners', async (req: Request, res: Response) => {
  const { courseId } = parseRequest(AdminCourseIdParams, req.params, 'params');
  const { userIds } = parseRequest(EnrolLearnersBody, req.body, 'body');

  await ensureAdmin(req);

  const outcome = await enrolLearners(req, courseId, [...new Set(userIds)]);
  return res.status(200).json({ courseId, ...outcome });
});

router.delete('/:courseId/learners/:userId', async (req: Request, res: Response) => {
  const { courseId, userId } = parseRequest(AdminLearnerParams, req.params, 'params');

  await ensureAdmin(req);

  await removeLearner(req, courseId, userId);
  return res.status(200).json({ removed: true, courseId, userId });
});

export default router;
