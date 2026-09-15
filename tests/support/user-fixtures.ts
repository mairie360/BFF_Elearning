// Réponses BFF User conformes au contrat du paquet @mairie360/bff-user-openapi installé
// (validées dans upstream-contracts.test.ts) et jetons de session des tests.

type Overrides<T> = Partial<T> & Record<string, unknown>;

export function group(id: number, name = `Groupe ${id}`) {
  return { id, name, owner_id: 1, description: null };
}

/** Corps de `GET /me` (SessionResponse). Les champs non lus par le BFF E-learning sont volontairement présents. */
export function sessionResponse(
  user: Overrides<{ first_name: string; last_name: string; email: string; phone: string | null; role: string }> = {},
  groups: Array<ReturnType<typeof group>> = [group(1, 'Service urbanisme'), group(2, 'Direction générale')],
) {
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
