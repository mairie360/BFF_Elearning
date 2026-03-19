import { Router } from 'express';
import axios from 'axios';
import { CheckApiResponse, CheckApiResponseSchema } from '../views/check_api_view';
import { registry } from '../openapi-registry';

const router = Router();

const CORE_FULL_URL = `http://${process.env.CORE_API_URL}:${process.env.CORE_API_PORT}`;
const ELEARNING_FULL_URL = `http://${process.env.ELEARNING_API_URL}:${process.env.ELEARNING_API_PORT}`;

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
    },
  },
});

router.get('/', async (_, res) => {
  try {
    const coreResponse = await axios.get(`${CORE_FULL_URL}/health`, { timeout: 5000 });
    console.log(coreResponse);
    const core_is_reachable = coreResponse.status === 200;
    
    const elearningResponse = await axios.get(`${ELEARNING_FULL_URL}/health`, { timeout: 5000 });
    console.log(elearningResponse);
    const elearning_is_reachable = elearningResponse.status === 200;
    const result: CheckApiResponse = {
      status: 'OK',
      core_api: core_is_reachable ? 'Connected' : 'Unreachable',
      elearning_api: elearning_is_reachable ? 'Connected' : 'Unreachable'
    };
    res.status(200).json(result);
  } catch (error) {
    res.status(502).json({
      status: 'Error',
      core_api: 'Unreachable',
      elearning_api: 'Unreachable',
      message: (error as Error).message
    });
  }
});

export default router;