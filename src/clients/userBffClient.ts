import { getBffUser } from '@mairie360/bff-user-openapi/endpoints/bffUser';
import axios, { type AxiosRequestConfig } from 'axios';
import { asCaller } from './upstream';

// BFF User is only called through the operations of its published contract (@mairie360/bff-user-openapi).
const userBffAxios = axios.create({ timeout: 5_000, headers: { Accept: 'application/json' } });

export const userBffClient = getBffUser(userBffAxios);

/** URL read on every call (the environment can change without a restart); 502 when `USER_BFF_URL` is unset. */
export function userBffOptions(authorization: string): AxiosRequestConfig {
  return asCaller('USER_BFF', authorization);
}

export default userBffClient;
