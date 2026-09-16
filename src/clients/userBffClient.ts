import { getBffUser } from '@mairie360/bff-user-openapi/endpoints/bffUser';
import axios, { type AxiosRequestConfig } from 'axios';

// BFF User n'est appelé que par les opérations de son contrat publié (@mairie360/bff-user-openapi).
const userBffAxios = axios.create({ timeout: 5_000, headers: { Accept: 'application/json' } });

export const userBffClient = getBffUser(userBffAxios);

/** URL relue à chaque appel : la variable d'environnement peut changer sans redémarrage. */
export function userBffOptions(authorization: string): AxiosRequestConfig {
  const configured = process.env.USER_BFF_URL ?? 'http://localhost:4000';
  const baseUrl = /^https?:\/\//i.test(configured) ? configured : `http://${configured}`;
  return {
    baseURL: baseUrl.replace(/\/+$/, ''),
    headers: { Authorization: authorization },
  };
}

export default userBffClient;
