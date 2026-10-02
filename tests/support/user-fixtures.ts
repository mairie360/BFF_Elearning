import { getBffUser } from '@mairie360/bff-user-openapi/endpoints/bffUser';
import type { SessionResponse, SessionResponseGroupsItem, SessionResponseUser } from '@mairie360/bff-user-openapi/model';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';
import type { AdminFormation, File as ElearningFile, FileType, Module, Status } from '@mairie360/elearning-api-openapi/model';

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

/**
 * JWT-shaped bearer token. The BFF only reads its `sub`; the signature is checked by BFF User and the E-learning
 * API, both mocked here, which receive the token unchanged.
 */
export function bearer(sub: string | number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `Bearer ${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(sub), exp: 4_102_444_800 })}.signature`;
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
