import { getBffUser } from '@mairie360/bff-user-openapi/endpoints/bffUser';
import type { SessionResponse, SessionResponseGroupsItem, SessionResponseUser } from '@mairie360/bff-user-openapi/model';
import { getCoreAPIMairie360 } from '@mairie360/core-api-openapi/endpoints/coreAPIMairie360';
import { getELearningAPIMairie360 } from '@mairie360/elearning-api-openapi/endpoints/eLearningAPIMairie360';

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
 * Jeton Bearer au format JWT dont seul le `sub` est lu par le BFF E-learning (la signature est vérifiée par
 * BFF User, simulé ici). Un `sub` différent par test isole la progression, stockée en mémoire par utilisateur.
 */
export function bearer(sub: string | number): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `Bearer ${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: String(sub), exp: 4_102_444_800 })}.signature`;
}
