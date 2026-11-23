import { HttpError } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { AdminStatsResponse, ErrorResponse, registry, sessionErrorResponses } from '../../openapi-registry';
import { isCallerAdmin } from './auth';
import { adminStats } from './elearning_helpers';
import { loadStats } from './elearning_upstream';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/admin/stats',
  tags: ['E-learning administration'],
  summary: 'E-learning indicators of the instance',
  description:
    'Courses by origin, participation (overall and per service), average completion, indicators per course and the agents late on a mandatory course, read from the E-learning API.',
  responses: {
    200: { description: 'Indicators', content: { 'application/json': { schema: AdminStatsResponse } } },
    ...sessionErrorResponses,
    403: { description: 'Restricted to administrators', content: { 'application/json': { schema: ErrorResponse } } },
    500: { description: 'Unexpected server error', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

router.get('/', async (req: Request, res: Response) => {
  if (!(await isCallerAdmin(req))) throw new HttpError(403, 'This action is restricted to administrators.');
  return res.status(200).json(adminStats(await loadStats(req)));
});

export default router;
