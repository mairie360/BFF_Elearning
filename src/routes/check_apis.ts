import { Router } from 'express';
import axios from 'axios';
import { CheckApiResponse, CheckApiResponseSchema } from '../views/check_api_view';
import { registry } from '../openapi-registry';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  tags: ['Connectivity'],
  summary: "Vérifie la connexion avec l'API Core et E-learning (Rust)",
  responses: {
    200: {
      description: 'Connexion réussie',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
    502: {
      description: 'API Core injoignable ou API E-learning injoignable',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
  },
});

async function isReachable(service: 'CORE_API' | 'ELEARNING_API'): Promise<boolean> {
  // URL relue à chaque appel : la configuration peut changer sans recharger le module.
  const host = process.env[`${service}_URL`];
  const port = process.env[`${service}_PORT`];
  if (!host || !port) {
    return false;
  }

  try {
    const response = await axios.get(`http://${host}:${port}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

router.get('/', async (_, res) => {
  // Les deux API sont sondées indépendamment : une panne de l'une ne masque pas l'état de l'autre,
  // et aucun détail réseau n'est renvoyé au client.
  const [coreReachable, elearningReachable] = await Promise.all([isReachable('CORE_API'), isReachable('ELEARNING_API')]);
  const result: CheckApiResponse = {
    status: coreReachable && elearningReachable ? 'OK' : 'Error',
    core_api: coreReachable ? 'Connected' : 'Unreachable',
    elearning_api: elearningReachable ? 'Connected' : 'Unreachable',
  };

  res.status(coreReachable && elearningReachable ? 200 : 502).json(result);
});

export default router;
