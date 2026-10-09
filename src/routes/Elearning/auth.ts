import { asCaller, HttpError, INVALID_SESSION_MESSAGE, sessionUserId, upstreamError, upstreamStatus, withRetry } from '@mairie360/bffs-lib';
import type { Request } from 'express';
import { userBffClient } from '../../clients/userBffClient';
import { UPSTREAM_TIMEOUT_MS } from '../../clients/upstream';
import { isRecord } from './elearning_helpers';
import { z } from 'zod';
import { CurrentUser } from '../../openapi-registry';


type BffCurrentUser = z.infer<typeof CurrentUser>;

type UserResponse = {
  user?: {
    id?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    phone_number?: unknown;
    role?: unknown;
  };
  groups?: Array<string | { name?: unknown }>;
};

function getGroupName(group: string | { name?: unknown }): string | null {
  if (typeof group === 'string') return group.trim() || null;
  return typeof group.name === 'string' ? group.name.trim() || null : null;
}

function getInitials(firstName: string, lastName: string, name: string): string {
  const source = firstName || lastName ? [firstName, lastName] : name.split(/\s+/);
  return source
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

/** The user id as resolved by BFF User (never read from the unverified token), or `undefined` when absent. */
function mapCurrentUser(body: UserResponse, id: number): BffCurrentUser {
  const rawUser = body.user ?? {};
  const firstName = typeof rawUser.first_name === 'string' ? rawUser.first_name.trim() : '';
  const lastName = typeof rawUser.last_name === 'string' ? rawUser.last_name.trim() : '';
  const explicitName = typeof rawUser.name === 'string' ? rawUser.name.trim() : '';
  const name = explicitName || `${firstName} ${lastName}`.trim() || 'Utilisateur';
  const role = typeof rawUser.role === 'string' ? rawUser.role.trim() : 'Guest';
  const phone = rawUser.phone ?? rawUser.phone_number;
  const groups = Array.isArray(body.groups)
    ? body.groups.map(getGroupName).filter((group): group is string => Boolean(group))
    : [];

  return {
    id: String(id),
    name,
    initials: getInitials(firstName, lastName, name),
    ...(typeof rawUser.email === 'string' && rawUser.email.trim() ? { email: rawUser.email.trim() } : {}),
    ...(typeof phone === 'string' && phone.trim() ? { phone: phone.trim() } : {}),
    ...(groups.length ? { service: groups.join(', ') } : {}),
    role,
    isAdmin: role.toLowerCase() === 'admin',
  };
}

/**
 * The caller as resolved by BFF User `/me`, with their `Authorization: Bearer <token>` header forwarded
 * (401 before any call without one, 503 when `USER_BFF_URL` is not configured). A BFF User 401/403 means
 * the session is refused: 401. Anything else, no answer or an unusable body: 502 (the upstream body is
 * never relayed).
 */
export async function getAuthenticatedUser(req: Request): Promise<BffCurrentUser> {
  let body: unknown;
  try {
    // GET /me is idempotent: retried once on a transient failure.
    body = (await withRetry(() => userBffClient.getMe(asCaller('USER_BFF', req, UPSTREAM_TIMEOUT_MS)))).data;
  } catch (error) {
    const status = error instanceof HttpError ? undefined : upstreamStatus(error);
    if (status === 401 || status === 403) throw new HttpError(401, INVALID_SESSION_MESSAGE, { cause: error });
    throw upstreamError('USER_BFF', error);
  }

  // A 2xx without a `user` object (empty body, text, unexpected JSON) does not prove the session: it must
  // not produce an authenticated "Guest" user.
  if (!isRecord(body) || !isRecord(body.user)) {
    throw new HttpError(502, 'The USER_BFF answer is invalid.');
  }

  // The caller is the `sub` of the token `requireSession` verified (MAIR-474), never an id read from an answer.
  return mapCurrentUser(body as UserResponse, sessionUserId(req));
}
