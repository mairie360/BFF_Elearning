import { Router, Request, Response } from 'express';
import { ErrorResponse, ElearningCatalogQuery, ElearningCatalogResponse, registry, sessionErrorResponses } from '../../openapi-registry';
import { buildCatalogResponse, validationError } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/catalog',
  tags: ['E-learning'],
  summary: 'Charge le catalogue E-learning',
  description:
    'Retourne les donnees pretes a afficher pour le catalogue : utilisateur, notifications, filtres, statistiques, formations et footer.',
  request: {
    query: ElearningCatalogQuery,
  },
  responses: {
    200: {
      description: 'Catalogue charge avec succes',
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
  const queryResult = ElearningCatalogQuery.safeParse(req.query);

  if (!queryResult.success) {
    throw validationError('query', queryResult.error.issues);
  }

  const user = await getAuthenticatedUser(req);
  return res.status(200).json(buildCatalogResponse(queryResult.data, user));
});

export default router;
