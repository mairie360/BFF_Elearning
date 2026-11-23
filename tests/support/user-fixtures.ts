import { createHmac } from 'node:crypto';
import { eddsaToken } from './session-keys';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';
import type { GetMeResponseView, Group } from '@mairie360/core-api-openapi/model';
import type {
  AdminFormation, CatalogFile, CatalogFormation, CatalogModule, ContentKind, File as ElearningFile, FileType, Module, Status,
} from '@mairie360/elearning-api-openapi/model';

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

/** The historical shared secret (MAIR-680): the BFF no longer gets it, so a token signed with it must be refused. */
export const JWT_SECRET = 'elearning-contract-test-secret';

/** Numeric `sub` of a test session: a number as is, a label mapped to a stable id (one session per label). */
export function sessionSub(sub: string | number): number {
  if (typeof sub === 'number') return sub;
  return 100_000 + [...sub].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 900_000, 7);
}

/**
 * Session token of `sub` (fixed expiry, so a token is the same in every call): EdDSA signed like Core (MAIR-680), or
 * HS256 signed with `secret` when one is given (a historical token). `claims` adds claims, such as the `role` Core
 * signs (MAIR-529); without it the token predates that claim.
 */
export function sessionToken(sub: string | number, secret?: string, exp = 4_102_444_800, claims: object = {}): string {
  if (secret === undefined) return eddsaToken(sessionSub(sub), { claims: { exp, ...claims } });
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(sessionSub(sub)), exp, ...claims })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

/** `Authorization` header of a session: verified by the BFF, then forwarded unchanged to the APIs. */
export function bearer(sub: string | number, claims: object = {}): string {
  return `Bearer ${sessionToken(sub, undefined, 4_102_444_800, claims)}`;
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

/** A file of `GET /api/v1/formations/catalog/` (E-learning V2 fields included). */
export function catalogFile(id: number, fileName: string, kind: ContentKind = 'pdf', fields: Partial<CatalogFile> = {}): CatalogFile {
  const fileType: FileType = kind === 'video' ? 'Video' : kind === 'pdf' ? 'Pdf' : 'Error';
  return {
    id, file_name: fileName, file_type: fileType, file_size_bytes: 1024, kind, title: fileName, description: null,
    duration_seconds: null, is_required: true, sort_order: 1, url: null, ...fields,
  };
}

/** A module of the catalogue, its files aside. */
export function catalogModule(id: number, name: string, completed = false, fields: Partial<Omit<CatalogModule, 'files'>> = {}): Omit<CatalogModule, 'files'> {
  return { id, name, description: `${name} description`, completed, duration_seconds: 0, sort_order: null, ...fields };
}

/** A formation of the catalogue of the caller, its modules aside. */
export function catalogFormation(id: number, name: string, status: Status = 'NotStarted', fields: Partial<Omit<CatalogFormation, 'modules'>> = {}): Omit<CatalogFormation, 'modules'> {
  return {
    id, name, description: `${name} description`, status, category: null, deadline: null, instructor: null, is_mandatory: false,
    learners: 1, level: null, rating_average: null, rating_count: 0, my_rating: null, source: 'internal', started_at: null,
    completed_at: null, last_activity_at: null, last_reminder_at: null, ...fields,
  };
}

/** `GET /api/v1/formations/{f}/{m}/` file of a catalogue file. */
export function moduleFile({ id, file_name, file_type, file_size_bytes }: CatalogFile): ElearningFile {
  return { id, file_name, file_type, file_size_bytes };
}
