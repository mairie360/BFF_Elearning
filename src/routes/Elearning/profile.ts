import { Router, Request, Response } from 'express';
import {
  ApiError,
  ElearningProfileResponse,
  ProfileUpdateResponse,
  registry,
  UpdateProfileBody,
} from '../../openapi-registry';
import { buildProfileResponse, handleRouteError, sendValidationError, updateProfile } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/profile',
  tags: ['E-learning'],
  summary: 'Charge le profil E-learning',
  description: 'Retourne les informations necessaires au rendu direct de la page profil.',
  responses: {
    200: {
      description: 'Profil charge avec succes',
      content: {
        'application/json': {
          schema: ElearningProfileResponse,
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

registry.registerPath({
  method: 'patch',
  path: '/elearning/profile',
  tags: ['E-learning'],
  summary: 'Met a jour les champs editables du profil',
  description: 'Ignore les champs non editables comme role, isAdmin, service, position et lastConnection.',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UpdateProfileBody,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profil mis a jour',
      content: {
        'application/json': {
          schema: ProfileUpdateResponse,
        },
      },
    },
    400: {
      description: 'Payload invalide',
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

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    return res.status(200).json(buildProfileResponse(user));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch('/', async (req: Request, res: Response) => {
  const bodyResult = UpdateProfileBody.safeParse(req.body);

  if (!bodyResult.success) {
    return sendValidationError(res, bodyResult.error.issues);
  }

  try {
    const user = await getAuthenticatedUser(req);
    return res.status(200).json(updateProfile(bodyResult.data, user));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
