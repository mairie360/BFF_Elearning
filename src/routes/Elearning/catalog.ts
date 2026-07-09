import { Router, Request, Response } from 'express';
import { ApiError, ElearningCatalogQuery, ElearningCatalogResponse, registry } from '../../openapi-registry';
import { buildCatalogResponse, handleRouteError, sendValidationError } from './elearning_helpers';

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
      description: 'Parametres de recherche invalides',
      content: {
        'application/json': {
          schema: ApiError,
        },
      },
    },
    500: {
      description: 'Erreur serveur non prevue',
      content: {
        'application/json': {
          schema: ApiError,
        },
      },
    },
  },
});

router.get('/', (req: Request, res: Response) => {
  const queryResult = ElearningCatalogQuery.safeParse(req.query);

  if (!queryResult.success) {
    return sendValidationError(res, queryResult.error.issues);
  }

  try {
    return res.status(200).json(buildCatalogResponse(queryResult.data));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
