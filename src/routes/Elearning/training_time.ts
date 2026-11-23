import { parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { ErrorResponse, registry, sessionErrorResponses, TrainingTimeResponse, YearQuery } from '../../openapi-registry';
import { trainingTime } from './elearning_helpers';
import { loadSummary } from './elearning_upstream';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/training-time',
  tags: ['E-learning'],
  summary: 'Training time of the caller during a year',
  description:
    'Yearly goal of the instance, time spent (the durations of the contents of the chapters completed that year), courses completed that year, and the time per course, read from the E-learning API.',
  request: { query: YearQuery },
  responses: {
    200: { description: 'Training time of the year', content: { 'application/json': { schema: TrainingTimeResponse } } },
    400: { description: 'Invalid year', content: { 'application/json': { schema: ErrorResponse } } },
    ...sessionErrorResponses,
    500: { description: 'Unexpected server error', content: { 'application/json': { schema: ErrorResponse } } },
  },
});

router.get('/', async (req: Request, res: Response) => {
  const { year } = parseRequest(YearQuery, req.query, 'query');
  return res.status(200).json(trainingTime(await loadSummary(req, year)));
});

export default router;
