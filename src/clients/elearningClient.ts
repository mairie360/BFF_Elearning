import axios from 'axios';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';

// E-learning API is only called through the operations of its published contract
// (@mairie360/elearning-api-openapi). The base URL and the caller's session are given per call
// (`asCaller('ELEARNING_API', req)` from @mairie360/bffs-lib).
const elearningApiAxios = axios.create({ headers: { Accept: 'application/json' } });

export const elearningClient = getELearningAPIMairie360(elearningApiAxios);

export default elearningClient;
