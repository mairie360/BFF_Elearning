import { checkApis, checkApisResponseSchema, withoutSession } from '@mairie360/bffs-lib';
import { Router } from 'express';
import coreClient from '../clients/coreClient';
import elearningClient from '../clients/elearningClient';
import { UPSTREAM_TIMEOUT_MS } from '../clients/upstream';
import userBffClient from '../clients/userBffClient';
import { registry } from '../openapi-registry';

const router = Router();

// One probe per upstream the BFF calls, through the `/health` operation of its published contract and the same
// `<SERVICE>_URL` variables as the real calls. A missing variable counts as unreachable; no network detail is
// returned to the client.
const UPSTREAMS = ['core_api', 'elearning_api', 'user_bff'] as const;

export const CheckApisResponseSchema = registry.register('CheckApisResponse', checkApisResponseSchema(UPSTREAMS));

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  security: [],
  tags: ['Connectivity'],
  summary: 'Checks that Core API, E-learning API and BFF User answer their /health probe',
  responses: {
    200: {
      description: 'Every upstream is reachable',
      content: { 'application/json': { schema: CheckApisResponseSchema } },
    },
    502: {
      description: 'At least one upstream is unreachable or not configured',
      content: { 'application/json': { schema: CheckApisResponseSchema } },
    },
  },
});

router.get(
  '/',
  checkApis({
    core_api: () => coreClient.health(withoutSession('CORE_API', UPSTREAM_TIMEOUT_MS)),
    elearning_api: () => elearningClient.health(withoutSession('ELEARNING_API', UPSTREAM_TIMEOUT_MS)),
    user_bff: () => userBffClient.getHealth(withoutSession('USER_BFF', UPSTREAM_TIMEOUT_MS)),
  } satisfies Record<(typeof UPSTREAMS)[number], () => Promise<unknown>>),
);

export default router;
