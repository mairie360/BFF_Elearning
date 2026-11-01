import { createHmac } from 'node:crypto';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';
import type { GetMeResponseView, Group } from '@mairie360/core-api-openapi/model';
import type { AdminFormation, File as ElearningFile, FileType, Module, Status } from '@mairie360/elearning-api-openapi/model';

// Upstream bodies typed by the models of the installed @mairie360/*-openapi packages: a field added, removed or renamed
// by a contract breaks the compilation of the tests. They are also validated at run time against the rebuilt contract
// (upstream-contracts.test.ts, HTTP mock). Session tokens of the tests.

/** Chemins des opérations amont, tels que les construisent les clients générés (helpers `get*Url`). */
export const coreApiUrls = getCoreAPIMairie360();
export const elearningApiUrls = getELearningAPIMairie360();

export function group(id: number, name = `Groupe ${id}`): Group {
  return { id, name, owner_id: 1, description: null };
}

/** Body of Core `GET /api/v1/user/me/`. Fields the BFF E-learning does not read are present on purpose. */
export function coreMe(
  fields: Partial<GetMeResponseView> = {},
  groups: Group[] = [group(1, 'Service urbanisme'), group(2, 'Direction générale')],
): GetMeResponseView {
  return {
    first_name: 'Alice', last_name: 'Martin', email: 'alice.martin@mairie.test', phone: '+33123456789', status: 'active',
    role: 'User', roles: ['User'], groups, ...fields,
  };
}

/** Secret of the tests (tests/support/env.ts): the BFF verifies the session tokens with it (bffs-lib requireSession). */
export const JWT_SECRET = 'elearning-contract-test-secret';

/** Numeric `sub` of a test session: a number as is, a label mapped to a stable id (one session per label). */
export function sessionSub(sub: string | number): number {
  if (typeof sub === 'number') return sub;
  return 100_000 + [...sub].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 900_000, 7);
}

/**
 * HS256 session token of `sub` signed with `secret` (fixed expiry, so a token is the same in every call). `claims`
 * adds claims, such as the `role` Core signs (MAIR-529); without it the token predates that claim.
 */
export function sessionToken(sub: string | number, secret = JWT_SECRET, exp = 4_102_444_800, claims: object = {}): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(sessionSub(sub)), exp, ...claims })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

/** `Authorization` header of a session: verified by the BFF, then forwarded unchanged to the APIs. */
export function bearer(sub: string | number, claims: object = {}): string {
  return `Bearer ${sessionToken(sub, JWT_SECRET, 4_102_444_800, claims)}`;
}

// ---------------------------------------------------------------------------------------------------------------
// E-learning API bodies, typed by the models of the installed @mairie360/elearning-api-openapi package.

/** A formation of `GET /api/v1/formations/`; the API adds the caller's `status`, absent from the published model. */
export function formation(id: number, name: string, status: Status = 'NotStarted'): AdminFormation & { status: Status } {
  return { id, name, description: `${name} description`, status };
}

export function learnerModule(id: number, name: string, completed = false): Module {
  return { id, name, description: `${name} description`, completed };
}

export function attachment(id: number, fileName: string, fileType: FileType = 'Pdf'): ElearningFile {
  return { id, file_name: fileName, file_type: fileType, file_size_bytes: 1024 };
}
