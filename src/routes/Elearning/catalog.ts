import { parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { ErrorResponse, ElearningCatalogQuery, ElearningCatalogResponse, registry, sessionErrorResponses } from '../../openapi-registry';
import { buildCatalogResponse } from './elearning_helpers';
import { loadCourses } from './elearning_upstream';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/catalog',
  tags: ['E-learning'],
  summary: 'Loads the E-learning catalogue',
  description:
    'Ready-to-render catalogue: user, filters, statistics, footer and the courses the caller is enrolled in, with their chapters, contents and progress, read from the E-learning API.',
  request: {
    query: ElearningCatalogQuery,
  },
  responses: {
    200: {
      description: 'Catalogue loaded',
      content: {
        'application/json': {
          schema: ElearningCatalogResponse,
        },
      },
    },
    400: {
      description: 'Invalid search parameters',
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

router.get('/', async (req: Request, res: Response) => {
  const query = parseRequest(ElearningCatalogQuery, req.query, 'query');

  const user = await getAuthenticatedUser(req);
  const courses = await loadCourses(req);
  return res.status(200).json(buildCatalogResponse(query, user, courses));
});

export default router;
