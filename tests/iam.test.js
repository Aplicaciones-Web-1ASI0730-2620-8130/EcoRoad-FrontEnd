import test from 'node:test'
import assert from 'node:assert/strict'
import { assignRole, canSignIn, grantUserAccess, inviteUser, revokeUserAccess, setUserPermissions, validateInvitation } from '../src/iam/domain/user-access.js'
import { createDemoUsers } from '../src/iam/infrastructure/iam-demo-data.js'
import { createIamDemoStore } from '../src/iam/application/use-iam-demo.js'

const admin = createDemoUsers()[0]
const input = { companyId: 'demo-company', name: 'Roberto Sánchez', email: 'Roberto@Empresa.pe', roleId: 'inspector' }

test('invitation requires valid, unique collaborator details within the company', () => {
  assert.deepEqual(validateInvitation(input, createDemoUsers()), {})
  assert.deepEqual(Object.keys(validateInvitation({ ...input, name: '', email: 'bad', roleId: 'unknown' }, [])).sort(), ['email', 'name', 'roleId'])
  assert.equal(validateInvitation({ ...input, email: admin.email }, createDemoUsers()).email !== undefined, true)
  const invited = inviteUser(input, createDemoUsers(), admin)
  assert.equal(invited.email, 'roberto@empresa.pe')
  assert.equal(invited.invitation.status, 'pending')
  assert.equal(canSignIn(invited, 'demo-company'), false)
  assert.throws(() => inviteUser({ ...input, companyId: 'other-company' }, [], admin), { code: 'CROSS_COMPANY_FORBIDDEN' })
})

test('granting, role assignment, permission changes and revocation respect IAM policies', () => {
  const invited = inviteUser(input, [], admin)
  const active = grantUserAccess(invited, admin)
  assert.equal(canSignIn(active, 'demo-company'), true)
  assert.equal(canSignIn(active, 'other-company'), false)
  assert.throws(() => grantUserAccess(active, admin), { code: 'ALREADY_ACTIVE' })
  const assigned = assignRole(active, 'environmental_engineer', admin)
  assert.equal(assigned.roleId, 'environmental_engineer')
  assert.equal(assigned.permissions.includes('field_evidence'), false)
  const customized = setUserPermissions(assigned, ['view_projects', 'generate_reports'], admin)
  assert.deepEqual(customized.permissions, ['view_projects', 'generate_reports'])
  assert.throws(() => setUserPermissions(customized, ['unknown'], admin), { code: 'INVALID_PERMISSIONS' })
  assert.throws(() => assignRole(admin, 'field_collaborator', admin), { code: 'SELF_LOCKOUT_FORBIDDEN' })
  assert.throws(() => setUserPermissions(admin, ['view_projects'], admin), { code: 'SELF_LOCKOUT_FORBIDDEN' })
  assert.throws(() => revokeUserAccess(admin, admin), { code: 'SELF_REVOKE_FORBIDDEN' })
  const revoked = revokeUserAccess(customized, admin)
  assert.equal(canSignIn(revoked, 'demo-company'), false)
  assert.throws(() => setUserPermissions(revoked, [], admin), { code: 'ACCESS_NOT_ACTIVE' })
  assert.throws(() => grantUserAccess(invited, createDemoUsers()[3]), { code: 'ADMIN_REQUIRED' })
})

test('local IAM store updates invite and access read models for the first UI delivery', () => {
  const store = createIamDemoStore()
  assert.equal(store.users.value.length, 4)
  const invited = store.invite(input)
  assert.equal(store.selected.value.id, invited.id)
  assert.equal(store.users.value.length, 5)
  assert.equal(store.grant(invited.id), true)
  assert.equal(store.selected.value.access.status, 'active')
  assert.equal(store.changeRole(invited.id, 'site_director'), true)
  assert.equal(store.changePermissions(invited.id, ['view_projects']), true)
  assert.equal(store.selected.value.permissions.length, 1)
  assert.equal(store.revoke(invited.id), true)
  assert.equal(store.selected.value.access.status, 'revoked')
})
