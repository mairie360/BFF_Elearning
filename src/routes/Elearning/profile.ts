import { HttpError, upstreamStatus } from '@mairie360/bffs-lib';
import axios from 'axios';
import { Router, Request, Response } from 'express';
import { coreClient } from '../../clients/coreClient';
import { asCaller } from '../../clients/upstream';
import {
  ErrorResponse,
  ElearningProfileResponse,
  notImplementedResponse,
  ProfileUpdateResponse,
  registry,
  sessionErrorResponses,
  UpdateProfileBody,
} from '../../openapi-registry';
import { footer, notImplemented, validationError } from './elearning_helpers';
import { callerAuthorization, getAuthenticatedUser } from './auth';

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

/** Core API answers text/plain errors: only its 400, 401 and 409 are kept, without their body. */
function coreError(error: unknown): HttpError {
  const status = axios.isAxiosError(error) ? upstreamStatus(error) : undefined;
  if (status === 400) return new HttpError(400, 'The core service refused the profile values.');
  if (status === 401) return new HttpError(401, 'Expired or invalid session.');
  if (status === 409) return new HttpError(409, 'This e-mail address is already used by another account.');
  return error instanceof HttpError ? error : new HttpError(502, 'The core service is unavailable.');
}

router.patch('/', async (req: Request, res: Response) => {
  const bodyResult = UpdateProfileBody.safeParse(req.body);

  if (!bodyResult.success) {
    throw validationError('body', bodyResult.error.issues);
  }

  const user = await getAuthenticatedUser(req);
  const { email, phone, address, city } = bodyResult.data;

  if (address !== undefined || city !== undefined) {
    throw notImplemented('Address and city are not stored by any service yet: nothing was saved.');
  }

  if (email === undefined && phone === undefined) {
    return res.status(200).json({ user });
  }

  try {
    await coreClient.patchMe({ email, phone }, asCaller('CORE_API', callerAuthorization(req)));
  } catch (error) {
    throw coreError(error);
  }

  return res.status(200).json({ user: await getAuthenticatedUser(req) });
});

export default router;
