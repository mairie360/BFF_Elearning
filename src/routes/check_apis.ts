import { Router } from 'express';
import axios from 'axios';
import { CheckApiResponse, CheckApiResponseSchema } from '../views/check_api_view';
import { registry } from '../openapi-registry';
import { configuredBaseUrl } from '../clients/upstream';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  security: [],
  tags: ['Connectivity'],
  summary: 'Checks that Core API and E-learning API answer their /health probe',
  responses: {
    200: {
      description: 'Both APIs are reachable',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
    502: {
      description: 'Core API or E-learning API is unreachable or not configured',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
  },
});

async function isReachable(service: 'CORE_API' | 'ELEARNING_API'): Promise<boolean> {
  // Read on every call: the configuration can change without reloading the module. The URL may carry
  // its scheme (`http://core-api:3000`) or not (`core-api` + `CORE_API_PORT`).
  const baseUrl = configuredBaseUrl(service);
  if (!baseUrl) return false;

  try {
    const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

router.get('/', async (_, res) => {
  // Both APIs are probed independently: an outage of one does not hide the state of the other, and no
  // network detail is returned to the client.
  const [coreReachable, elearningReachable] = await Promise.all([isReachable('CORE_API'), isReachable('ELEARNING_API')]);
  const result: CheckApiResponse = {
    status: coreReachable && elearningReachable ? 'OK' : 'Error',
    core_api: coreReachable ? 'Connected' : 'Unreachable',
    elearning_api: elearningReachable ? 'Connected' : 'Unreachable',
  };

  res.status(coreReachable && elearningReachable ? 200 : 502).json(result);
});

export default router;
