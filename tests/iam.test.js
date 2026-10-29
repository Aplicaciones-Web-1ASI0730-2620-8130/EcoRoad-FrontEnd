import test from 'node:test'
import assert from 'node:assert/strict'
import { assignRole, canSignIn, grantUserAccess, inviteUser, revokeUserAccess, setUserPermissions, validateInvitation } from '../src/iam/domain/user-access.js'
import { createDemoUsers } from '../src/iam/infrastructure/iam-demo-data.js'
import { createIamDemoStore } from '../src/iam/application/use-iam-demo.js'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { createIamApiRepository } from '../src/iam/infrastructure/iam-api-repository.js'

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

test('IAM store persists invitations and permissions through its API boundary', async () => {
  const records = createDemoUsers()
  const api = {
    listUsers: async () => [...records],
    invite: async (draft) => { const invited = inviteUser({ ...draft, companyId: 'demo-company' }, records, admin); records.push(invited); return invited },
    grant: async (id) => replace(id, grantUserAccess),
    revoke: async (id) => replace(id, revokeUserAccess),
    changeRole: async (id, roleId) => replace(id, (user, actor) => assignRole(user, roleId, actor)),
    changePermissions: async (id, permissions) => replace(id, (user, actor) => setUserPermissions(user, permissions, actor)),
  }
  function replace(id, operation) { const index = records.findIndex((user) => user.id === id); records[index] = operation(records[index], admin); return records[index] }
  const store = createIamDemoStore('demo-company', api)
  await store.load()
  assert.equal(store.users.value.length, 4)
  const invited = await store.invite(input)
  assert.equal(store.selected.value.id, invited.id)
  assert.equal(store.users.value.length, 5)
  assert.equal(await store.grant(invited.id), true)
  assert.equal(store.selected.value.access.status, 'active')
  assert.equal(await store.changeRole(invited.id, 'site_director'), true)
  assert.equal(await store.changePermissions(invited.id, ['view_projects']), true)
  assert.equal(store.selected.value.permissions.length, 1)
  assert.equal(await store.revoke(invited.id), true)
  assert.equal(store.selected.value.access.status, 'revoked')
})

test('fake IAM API authenticates, enforces company admin policy and invalidates revoked sessions', async () => {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const root = `http://127.0.0.1:${server.address().port}/api/`
  try {
    let token = null
    const api = createIamApiRepository({ baseUrl: root, getToken: () => token })
    await assert.rejects(api.listUsers(), { status: 401 })
    await assert.rejects(api.signIn('demo-company', admin.email, 'wrong'), { status: 401 })
    token = (await api.signIn('demo-company', admin.email, 'EcoRoadDemo123!')).token
    assert.equal((await api.currentSession()).user.id, admin.id)
    const invited = await api.invite({ name: 'Roberto Sánchez', email: 'roberto@empresa.pe', roleId: 'inspector' })
    assert.equal(invited.access.status, 'pending')
    await assert.rejects(api.signIn('demo-company', invited.email, 'EcoRoadDemo123!'), { status: 403 })
    await api.grant(invited.id)
    const collaboratorToken = (await api.signIn('demo-company', invited.email, 'EcoRoadDemo123!')).token
    const collaboratorApi = createIamApiRepository({ baseUrl: root, getToken: () => collaboratorToken })
    await assert.rejects(collaboratorApi.listUsers(), { status: 403 })
    await api.revoke(invited.id)
    await assert.rejects(collaboratorApi.currentSession(), { status: 401 })
    await api.signOut()
    await assert.rejects(api.currentSession(), { status: 401 })
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
