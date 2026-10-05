export type UpstreamService = 'USER_BFF' | 'CORE_API' | 'ELEARNING_API';

/** Every upstream the BFF calls: `src/index.ts` refuses to start when one `<SERVICE>_URL` is missing or invalid. */
export const UPSTREAM_SERVICES: readonly UpstreamService[] = ['USER_BFF', 'CORE_API', 'ELEARNING_API'];

/**
 * Timeout of every upstream call, in ms. The base URL and the caller's session are given per call with
 * `asCaller(service, req, UPSTREAM_TIMEOUT_MS)` / `withoutSession(service, UPSTREAM_TIMEOUT_MS)` from
 * `@mairie360/bffs-lib`: `<SERVICE>_URL` + `<SERVICE>_PORT` read on each call, 503 when missing.
 */
export const UPSTREAM_TIMEOUT_MS = 5_000;
