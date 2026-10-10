import { createHmac } from 'node:crypto';
import { getBffUser } from '@mairie360/bff-user-openapi/endpoints/bffUser';
import type { SessionResponse, SessionResponseGroupsItem, SessionResponseUser } from '@mairie360/bff-user-openapi/model';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';
import type { AdminFormation, CatalogFormation, File as ElearningFile, FileType, Module, Status } from '@mairie360/elearning-api-openapi/model';

// Réponses BFF User typées par les modèles du paquet @mairie360/bff-user-openapi installé : un champ ajouté, retiré
// ou renommé par le contrat fait échouer la compilation des tests. Elles sont en plus validées à l'exécution contre
// le contrat reconstruit (upstream-contracts.test.ts, mock HTTP). Jetons de session des tests.

/** Chemins des opérations amont, tels que les construisent les clients générés (helpers `get*Url`). */
export const userBffUrls = getBffUser();
export const coreApiUrls = getCoreAPIMairie360();
export const elearningApiUrls = getELearningAPIMairie360();

export function group(id: number, name = `Groupe ${id}`): SessionResponseGroupsItem {
  return { id, name, owner_id: 1, description: null };
}

/** Corps de `GET /me` (SessionResponse). Les champs non lus par le BFF E-learning sont volontairement présents. */
export function sessionResponse(
  user: Partial<SessionResponseUser> = {},
  groups: SessionResponseGroupsItem[] = [group(1, 'Service urbanisme'), group(2, 'Direction générale')],
): SessionResponse {
  return {
    user: { id: 2, first_name: 'Alice', last_name: 'Martin', email: 'alice.martin@mairie.test', phone: '+33123456789', status: 'active', role: 'User', ...user },
    groups,
    roles: [{ id: 3, name: 'User' }],
  };
}

/** Secret of the tests (tests/support/env.ts): the BFF verifies the session tokens with it (bffs-lib requireSession). */
export const JWT_SECRET = 'elearning-contract-test-secret';

/** Numeric `sub` of a test session: a number as is, a label mapped to a stable id (one session per label). */
export function sessionSub(sub: string | number): number {
  if (typeof sub === 'number') return sub;
  return 100_000 + [...sub].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 900_000, 7);
}

/** HS256 session token of `sub` signed with `secret` (fixed expiry, so a token is the same in every call). */
export function sessionToken(sub: string | number, secret = JWT_SECRET, exp = 4_102_444_800): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(sessionSub(sub)), exp })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

/** `Authorization` header of a session: verified by the BFF, then forwarded unchanged to BFF User and the APIs. */
export function bearer(sub: string | number): string {
  return `Bearer ${sessionToken(sub)}`;
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

/** A formation of `GET /api/v1/formations/catalog/` (MAIR-506): the formation with its modules and their files. */
export function catalogFormation(
  base: AdminFormation & { status: Status },
  chapters: Array<{ module: Module; files: ElearningFile[] }>,
): CatalogFormation {
  return { ...base, description: base.description ?? '', modules: chapters.map(({ module, files }) => ({ ...module, files })) };
}

export function attachment(id: number, fileName: string, fileType: FileType = 'Pdf'): ElearningFile {
  return { id, file_name: fileName, file_type: fileType, file_size_bytes: 1024 };
}
