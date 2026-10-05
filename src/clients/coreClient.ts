import axios from 'axios';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';

// Core API is only called through the operations of its published contract
// (@mairie360/core-api-openapi). The base URL and the caller's session are given per call
// (`asCaller('CORE_API', req)` from @mairie360/bffs-lib).
const coreApiAxios = axios.create({ headers: { Accept: 'application/json' } });

export const coreClient = getCoreAPIMairie360(coreApiAxios);

export default coreClient;
