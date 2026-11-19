import type { Request } from 'express';

import { isCallerAdmin } from '../src/routes/Elearning/auth';

const mockSessionRole = jest.fn();

jest.mock('@mairie360/bffs-lib', () => ({
  ...jest.requireActual('@mairie360/bffs-lib'),
  sessionRole: (...args: unknown[]) => mockSessionRole(...args),
}));

// One role rule for every BFF (bffs-lib): this BFF compared `role.toLowerCase() === 'admin'`, so "Administrateur"
// or "ROLE_ADMIN" were administrators in BFF_Project but refused here.
describe('MAIR-689 the E-learning administrator follows the lib role rule', () => {
  test.each([
    ['admin', true],
    ['Admin', true],
    ['Administrateur', true],
    ['administrator', true],
    ['ROLE_ADMIN', true],
    [' role-admin ', true],
    ['Maire', false],
    ['Responsable', false],
    ['User', false],
    ['Guest', false],
    ['Stagiaire', false],
    ['Super Admin', false],
  ])('the role claim %p is administrator: %p', async (claim, expected) => {
    mockSessionRole.mockReturnValue(claim);
    await expect(isCallerAdmin({} as Request)).resolves.toBe(expected);
  });
});
