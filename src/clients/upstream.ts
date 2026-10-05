import { baseUrl } from '@mairie360/bffs-lib';
import type { AxiosRequestConfig } from 'axios';

export type UpstreamService = 'USER_BFF' | 'CORE_API' | 'ELEARNING_API';

/** Every upstream the BFF calls: `src/index.ts` refuses to start when one `<SERVICE>_URL` is missing or invalid. */
export const UPSTREAM_SERVICES: readonly UpstreamService[] = ['USER_BFF', 'CORE_API', 'ELEARNING_API'];

/**
 * Options of a call made on behalf of the caller: the base URL is read now through `baseUrl` from
 * `@mairie360/bffs-lib` (`<SERVICE>_URL` + `<SERVICE>_PORT`, 503 when missing or invalid, no `localhost`
 * fallback) and the caller's `Authorization` header is forwarded.
 */
export function asCaller(service: UpstreamService, callerAuthorization: string): AxiosRequestConfig {
  return { baseURL: baseUrl(service), headers: { Authorization: callerAuthorization } };
}
