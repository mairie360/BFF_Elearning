import { getBffUser } from '@mairie360/bff-user-openapi/endpoints/bffUser';
import axios from 'axios';

// BFF User is only called through the operations of its published contract (@mairie360/bff-user-openapi). The
// base URL and the caller's session are given per call (`asCaller('USER_BFF', req)` from @mairie360/bffs-lib).
const userBffAxios = axios.create({ headers: { Accept: 'application/json' } });

export const userBffClient = getBffUser(userBffAxios);

export default userBffClient;
