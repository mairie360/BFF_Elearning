import { Router, Request, Response } from 'express';
import {
  ErrorResponse,
  ElearningProfileResponse,
  ProfileUpdateResponse,
  registry,
  sessionErrorResponses,
  UpdateProfileBody,
} from '../../openapi-registry';
import { buildProfileResponse, updateProfile, validationError } from './elearning_helpers';
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
      description: 'Invalid request payload',
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
  const user = await getAuthenticatedUser(req);
  return res.status(200).json(buildProfileResponse(user));
});

router.patch('/', async (req: Request, res: Response) => {
  const bodyResult = UpdateProfileBody.safeParse(req.body);

  if (!bodyResult.success) {
    throw validationError('body', bodyResult.error.issues);
  }

  const user = await getAuthenticatedUser(req);
  return res.status(200).json(updateProfile(bodyResult.data, user));
});

export default router;
