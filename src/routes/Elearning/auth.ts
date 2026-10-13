import type { GetMeResponseView } from '@mairie360/core-api-openapi/model/getMeResponseView';
import {
  asCaller, HttpError, INVALID_SESSION_MESSAGE, sessionRoles, sessionUserId, upstreamError, upstreamStatus, withRetry,
} from '@mairie360/bffs-lib';
import type { Request } from 'express';
import { coreClient } from '../../clients/coreClient';
import { UPSTREAM_TIMEOUT_MS } from '../../clients/upstream';
import { isRecord } from './elearning_helpers';
import { z } from 'zod';
import { CurrentUser } from '../../openapi-registry';


type BffCurrentUser = z.infer<typeof CurrentUser>;

/** Core API `GET /api/v1/user/me/` as read here: every field is checked before use. */
type CoreMe = Partial<Record<keyof GetMeResponseView, unknown>>;

function getInitials(firstName: string, lastName: string, name: string): string {
  const source = firstName || lastName ? [firstName, lastName] : name.split(/\s+/);
  return source
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Names of the roles Core lists (`roles`, or the deprecated `role` of an older Core), blank ones dropped. */
function coreRoles(me: CoreMe): string[] {
  const roles = Array.isArray(me.roles) ? me.roles : [me.role];
  return roles.map(text).filter(Boolean);
}

const isAdminRole = (role: string) => role.toLowerCase() === 'admin';

/** The Core profile mapped to the screens' user; `id` is the verified caller, never an id read from the answer. */
function mapCurrentUser(me: CoreMe, id: number): BffCurrentUser {
  const firstName = text(me.first_name);
  const lastName = text(me.last_name);
  const name = `${firstName} ${lastName}`.trim() || 'Utilisateur';
  const roles = coreRoles(me);
  const role = roles[0] ?? 'Guest';
  const email = text(me.email);
  const phone = text(me.phone);
  const groups = Array.isArray(me.groups)
    ? me.groups.map((group: unknown) => (isRecord(group) ? text(group.name) : '')).filter(Boolean)
    : [];

  return {
    id: String(id),
    name,
    initials: getInitials(firstName, lastName, name),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(groups.length ? { service: groups.join(', ') } : {}),
    role,
    // Like Core's own admin guard: any `admin` role grants the access.
    isAdmin: roles.some(isAdminRole),
  };
}

/**
 * The caller's Core profile, `GET /api/v1/user/me/` with their `Authorization: Bearer <token>` header (401 before
 * any call without one, 503 when `CORE_API_URL` is not configured), retried once on a transient failure. A Core
 * 401/403 means the session is refused: 401. Anything else, no answer or an unusable body: 502 (the upstream body
 * is never relayed). Read from Core directly, never through BFF User (MAIR-525).
 */
async function readCoreMe(req: Request): Promise<CoreMe> {
  let body: unknown;
  try {
    body = (await withRetry(() => coreClient.getMe(asCaller('CORE_API', req, UPSTREAM_TIMEOUT_MS)))).data;
  } catch (error) {
    const status = error instanceof HttpError ? undefined : upstreamStatus(error);
    if (status === 401 || status === 403) throw new HttpError(401, INVALID_SESSION_MESSAGE, { cause: error });
    throw upstreamError('CORE_API', error);
  }

  // A 2xx that is not a profile (empty body, text, unexpected JSON) does not prove the session: it must not
  // produce an authenticated "Guest" user.
  if (!isRecord(body) || typeof body.email !== 'string') {
    throw new HttpError(502, 'The CORE_API answer is invalid.');
  }
  return body as CoreMe;
}

/** The caller as the E-learning screens show them, from their Core profile. */
export async function getAuthenticatedUser(req: Request): Promise<BffCurrentUser> {
  return mapCurrentUser(await readCoreMe(req), sessionUserId(req));
}

/**
 * Whether the caller holds an `admin` role: read in the verified token (`roles` claim, MAIR-529) without any call,
 * or from Core's profile for a token issued before that claim existed.
 */
export async function isCallerAdmin(req: Request): Promise<boolean> {
  const roles = sessionRoles(req) ?? coreRoles(await readCoreMe(req));
  return roles.some(isAdminRole);
}
