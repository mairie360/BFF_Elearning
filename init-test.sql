-- Seed minimal pour les tests isolés (performance / sécurité) du BFF Elearning.
-- L'utilisateur 2 est celui référencé par les JWT de test (claim sub = "2") :
--   * load-test.js le signe dynamiquement,
--   * docker-compose-security.yml injecte un token statique via le replacer ZAP.
-- Aucun rôle ni groupe n'est nécessaire : BFF User retombe alors sur le rôle
-- "Guest", ce qui suffit à exercer /health, /check_apis, /elearning/catalog et
-- /elearning/profile (le catalogue et le profil sont générés en mémoire par le
-- BFF à partir de ce user, pas depuis Elearning API).

INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', 'dummy', 'active')
ON CONFLICT (id) DO NOTHING;
