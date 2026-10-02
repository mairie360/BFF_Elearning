-- Minimal seed for the isolated test stacks (performance / security) of BFF Elearning.
-- The test JWTs reference two users:
--   * sub = "1": Admin role. docker-compose-security.yml injects a static token for it
--     through the ZAP replacer, so every operation (including /elearning/admin/*) is
--     scanned authenticated;
--   * sub = "2": User role only. load-test.js signs a token for it on the fly.
-- The E-learning formation of the contract examples (formation 4, module 11, attachment 27) is seeded
-- below with both users enrolled, so the learner routes are scanned on real rows.

-- users.password only accepts argon2id PHC strings since database 1.3.0 (chk_users_password_hashed):
-- this is the public hash of the template admin account, never used to log in here.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES
    (1, 'Security', 'Admin', 'security-admin@mairie360.fr',
     '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active'),
    (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr',
     '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active')
ON CONFLICT (id) DO NOTHING;

-- Core API >= 1.1.1 requires at least one role on the user for GET /user/me.
-- Core returns a single role: user 1 must only hold Admin.
DELETE FROM user_roles
WHERE user_id = 1 AND role_id <> (SELECT id FROM roles WHERE lower(name) = 'admin');

INSERT INTO user_roles (user_id, role_id)
SELECT 1, r.id FROM roles r WHERE lower(r.name) = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;

-- Explicit ids do not advance the sequence: move it past them so that users created
-- during the tests do not collide.
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users));

-- E-learning formation of the contract examples. The E-learning API has no route to create courses,
-- modules or attachments, so they are seeded with fixed ids. Progress of users 1 and 2 is reset so a
-- run on a persistent database starts from the same state.
INSERT INTO courses (id, title, description)
VALUES (4, 'RGPD pour les agents territoriaux', 'Obligations et bonnes pratiques')
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_modules (id, course_id, title, content, sort_order)
VALUES (11, 4, 'Les principes du RGPD', 'Liceite, minimisation, duree de conservation', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_attachments (id, module_id, title, file_name, file_type, file_url, file_size_bytes)
VALUES (27, 11, 'Principes du RGPD', 'rgpd-principes.pdf', 'pdf', 'elearning/rgpd-principes.pdf', 482913)
ON CONFLICT (id) DO NOTHING;

DELETE FROM user_modules WHERE user_id IN (1, 2) AND module_id = 11;

INSERT INTO user_courses (user_id, course_id) VALUES (1, 4), (2, 4)
ON CONFLICT DO NOTHING;
