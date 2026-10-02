import { HttpError } from '@mairie360/bffs-lib';
import type { AxiosRequestConfig } from 'axios';

export type UpstreamService = 'USER_BFF' | 'CORE_API' | 'ELEARNING_API';

/** Environment variables the BFF cannot run without (checked at startup by `src/index.ts`). */
export const REQUIRED_UPSTREAM_VARIABLES = ['USER_BFF_URL', 'CORE_API_URL', 'ELEARNING_API_URL'] as const;

/**
 * Base URL of an upstream service, from `<SERVICE>_URL` (with or without `http(s)://`) and
 * `<SERVICE>_PORT` (only used when the URL carries no port). Read on every call, so the
 * configuration can change without reloading the module. `undefined` when the service is not
 * configured or its URL cannot be parsed: there is no implicit `localhost` fallback.
 */
export function configuredBaseUrl(service: UpstreamService): string | undefined {
  const configured = process.env[`${service}_URL`]?.trim();
  if (!configured) return undefined;

  try {
    const url = new URL(/^https?:\/\//i.test(configured) ? configured : `http://${configured}`);
    const port = process.env[`${service}_PORT`]?.trim();
    if (!url.port && port) url.port = port;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return undefined;
  }
}

/** Same as `configuredBaseUrl`, but a missing configuration is a 502 for the caller (and logged). */
export function baseUrl(service: UpstreamService): string {
  const url = configuredBaseUrl(service);
  if (!url) {
    console.error(`[BFF] ${service}_URL is not set or invalid`);
    throw new HttpError(502, `The ${serviceLabel(service)} is unavailable.`);
  }
  return url;
}

/** Options of a call made on behalf of the caller: their `Authorization` header is forwarded as is. */
export function asCaller(service: UpstreamService, authorization: string): AxiosRequestConfig {
  return { baseURL: baseUrl(service), headers: { Authorization: authorization } };
}

export function serviceLabel(service: UpstreamService): string {
  if (service === 'USER_BFF') return 'user service';
  if (service === 'CORE_API') return 'core service';
  return 'e-learning service';
}
