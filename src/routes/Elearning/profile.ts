import { Router, Request, Response } from 'express';
import { ErrorResponse, ElearningProfileResponse, registry, sessionErrorResponses } from '../../openapi-registry';
import { footer } from './elearning_helpers';
import { getAuthenticatedUser } from './auth';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/elearning/profile',
  tags: ['E-learning'],
  summary: 'Loads the E-learning profile',
  description: 'The caller as read from Core API (`GET /api/v1/user/me/`), ready to render on the profile page. Read-only: a user edits their own profile in Settings, never through this BFF.',
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

router.get('/', async (req: Request, res: Response) => {
  const user = await getAuthenticatedUser(req);
  return res.status(200).json({ user, footer: footer() });
});

// Profile edits are not served here: a user edits their own profile in Settings (BFF_Settings → Core API).

export default router;
