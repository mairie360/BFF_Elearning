import { HttpError, parseRequest } from '@mairie360/bffs-lib';
import { Request, Response, Router } from 'express';
import { AdminAgentsQuery, AdminAgentsResponse, ErrorResponse, registry, sessionErrorResponses } from '../../openapi-registry';
import { isCallerAdmin } from './auth';
import { agentIdentity } from './elearning_helpers';
import { loadAgents } from './elearning_upstream';

// MAIR-817: the agents an administrator picks from to enrol them in a course.

const router = Router();

const json = (description: string) => ({ description, content: { 'application/json': { schema: ErrorResponse } } });

registry.registerPath({
  method: 'get',
  path: '/elearning/admin/agents',
  tags: ['E-learning administration'],
  summary: 'Lists the agents an administrator can enrol',
  description:
    'One page of the active (non-archived) agents, in id order, read from the e-learning service. With `search`, the BFF filters the names itself (the service cannot search): it reads at most 1000 agents from `offset` per request, stops at `limit` matches, and `nextOffset` tells where to read on (`null` after the last agent). No total is given.',
  request: { query: AdminAgentsQuery },
  responses: {
    200: { description: 'Agents of the page', content: { 'application/json': { schema: AdminAgentsResponse } } },
    400: json('Invalid `search`, `limit` or `offset`'),
    ...sessionErrorResponses,
    403: json('Restricted to administrators'),
    500: json('Unexpected server error'),
  },
});

router.get('/', async (req: Request, res: Response) => {
  const query = parseRequest(AdminAgentsQuery, req.query, 'query');

  if (!(await isCallerAdmin(req))) throw new HttpError(403, 'This action is restricted to administrators.');

  const { agents, nextOffset } = await loadAgents(req, query);
  return res.status(200).json({ agents: agents.map(agentIdentity), limit: query.limit, offset: query.offset, nextOffset });
});

export default router;
