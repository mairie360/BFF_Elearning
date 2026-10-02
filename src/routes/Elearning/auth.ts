import { HttpError } from '@mairie360/bffs-lib';
import axios from 'axios';
import type { Request } from 'express';
import { userBffClient, userBffOptions } from '../../clients/userBffClient';
import { z } from 'zod';
import { CurrentUser } from '../../openapi-registry';


type BffCurrentUser = z.infer<typeof CurrentUser>;

type UserResponse = {
  user?: {
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

type JwtPayload = {
  sub?: unknown;
};

function decodeJwtSubject(authorization: string): string | null {
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  const payload = token.split('.')[1];

  if (!payload) return null;

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const subject = (JSON.parse(decoded) as JwtPayload).sub;
    return typeof subject === 'string' || typeof subject === 'number' ? String(subject) : null;
  } catch {
    return null;
  }
}

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

function mapCurrentUser(body: UserResponse, authorization: string): BffCurrentUser {
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
    id: decodeJwtSubject(authorization) ?? name,
    name,
    initials: getInitials(firstName, lastName, name),
    ...(typeof rawUser.email === 'string' && rawUser.email.trim() ? { email: rawUser.email.trim() } : {}),
    ...(typeof phone === 'string' && phone.trim() ? { phone: phone.trim() } : {}),
    ...(groups.length ? { service: groups.join(', ') } : {}),
    role,
    isAdmin: role.toLowerCase() === 'admin',
  };
}

/** The caller's `Authorization: Bearer <token>` header, forwarded as is to the upstream services; 401 without one. */
export function callerAuthorization(req: Request): string {
  const authorization = req.header('authorization')?.trim();

  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    throw new HttpError(401, 'Missing or invalid session.');
  }

  return authorization;
}

export async function getAuthenticatedUser(req: Request): Promise<BffCurrentUser> {
  const authorization = callerAuthorization(req);

  let body: unknown;
  try {
    const response = await userBffClient.getMe(userBffOptions(authorization));
    body = response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new HttpError(401, 'Expired or invalid session.');
      }

      // Any other status, a timeout or a network failure: the upstream answer is never relayed.
      throw new HttpError(502, 'The user service is unavailable.');
    }

    throw error;
  }

  // A 2xx without a `user` object (empty body, text, unexpected JSON) does not prove the session: it must
  // not produce an authenticated "Guest" user.
  if (!isRecord(body) || !isRecord(body.user)) {
    throw new HttpError(502, 'The user service is unavailable.');
  }

  return mapCurrentUser(body as UserResponse, authorization);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
