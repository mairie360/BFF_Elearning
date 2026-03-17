import { Router } from 'express';
import axios from 'axios'; // La lib utilisée

const router = Router();

// Récupération des variables d'environnement
const core_api_url = process.env.CORE_API_URL;
const core_api_port = process.env.CORE_API_PORT;

const elearning_api_url = process.env.ELEARNING_API_URL;
const elearning_api_port = process.env.ELEARNING_API_PORT;

const CORE_FULL_URL = `http://${core_api_url}:${core_api_port}`;
const ELEARNING_FULL_URL = `http://${elearning_api_url}:${elearning_api_port}`;

router.get('/', async (_, res) => {
  try {
    const coreResponse = await axios.get(`${CORE_FULL_URL}/health`, { timeout: 5000 });
    console.log(coreResponse);
    const core_is_reachable = coreResponse.status === 200;
    
    const elearningResponse = await axios.get(`${ELEARNING_FULL_URL}/health`, { timeout: 5000 });
    console.log(elearningResponse);
    const elearning_is_reachable = elearningResponse.status === 200;
    
    res.status(200).json({
      status: 'OK',
      core_api: core_is_reachable ? 'Connected' : 'Unreachable',
      elearning_api: elearning_is_reachable ? 'Connected' : 'Unreachable',
      details: {
        core: coreResponse.data,
        elearning: elearningResponse.data
      }
    });
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