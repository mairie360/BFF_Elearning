import { asCaller, callUpstream, parseRequest } from '@mairie360/bffs-lib';
import { Router, Request, Response } from 'express';
import { coreClient } from '../../clients/coreClient';
import { UPSTREAM_TIMEOUT_MS } from '../../clients/upstream';
import {
  ErrorResponse,
  ElearningProfileResponse,
  notImplementedResponse,
  ProfileUpdateResponse,
  registry,
  sessionErrorResponses,
  UpdateProfileBody,
} from '../../openapi-registry';
import { footer, notImplemented } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/profile',
  tags: ['E-learning'],
  summary: 'Loads the E-learning profile',
  description: 'The caller as resolved by BFF User `/me`, ready to render on the profile page.',
  responses: {
    200: {
      description: 'Profile loaded',
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
  summary: 'Updates the editable profile fields',
  description:
    '`email` and `phone` are saved by Core API (`PATCH /api/v1/user/me/`), then the profile is read again from BFF User. `address` and `city` are stored by no upstream service: a body carrying them answers 501 and nothing is written. Non-editable fields (role, isAdmin, service, position, lastConnection) are ignored.',
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
      description: 'Profile saved, then read again',
      content: {
        'application/json': {
          schema: ProfileUpdateResponse,
        },
      },
    },
    400: {
      description: 'Invalid request payload, or a value Core API refuses (e.g. a phone number that is not 10 to 15 digits)',
      content: {
        'application/json': {
          schema: ErrorResponse,
        },
      },
    },
    409: {
      description: 'The e-mail address is already used by another account',
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
    ...notImplementedResponse,
  },
});

router.get('/', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  return res.status(200).json({ user, footer: footer() });
});

router.patch('/', async (req: Request, res: Response) => {
  const { email, phone, address, city } = parseRequest(UpdateProfileBody, req.body, 'body');

  const user = await getAuthenticatedUser(req);

  if (address !== undefined || city !== undefined) {
    throw notImplemented('Address and city are not stored by any service yet: nothing was saved.');
  }

  if (email === undefined && phone === undefined) {
    return res.status(200).json({ user });
  }

  // Core API answers text/plain errors: only the 400, 401 and 409 the route declares are relayed (without their
  // body), anything else is a 502. PATCH: not retried.
  await callUpstream('CORE_API', () => coreClient.patchMe({ email, phone }, asCaller('CORE_API', req, UPSTREAM_TIMEOUT_MS)), {
    declared: [400, 401, 409],
  });

  return res.status(200).json({ user: await getAuthenticatedUser(req) });
});

export default router;
