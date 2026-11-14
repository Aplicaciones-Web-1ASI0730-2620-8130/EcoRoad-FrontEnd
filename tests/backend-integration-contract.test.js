import test from 'node:test'
import assert from 'node:assert/strict'
import { createCommercialBackendRepository } from '../src/commercial/infrastructure/commercial-backend-repository.js'
import { createIamBackendRepository } from '../src/iam/infrastructure/iam-backend-repository.js'

test('commercial requests match the ASP.NET routes and normalize subscription access', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options })
    if (calls.length === 1) return Response.json({ id: 'company-1', name: 'Vial', code: 'E01', segment: 'Construction', createdAt: '2026-11-14T00:00:00Z' }, { status: 201 })
    if (calls.length === 2) return Response.json({ id: 'subscription-1', plan: 'Base', status: 'Selected', currentPeriodEnd: null })
    return Response.json({ id: 'subscription-1', plan: 'Base', status: 'Active', currentPeriodEnd: '2026-12-14T00:00:00Z' })
  }
  const api = createCommercialBackendRepository({ baseUrl: 'http://localhost:5080/api/', fetchImpl })
  const account = await api.registerCompany({ companyName: 'Vial', companyCode: 'E01', companyType: 'Construction' })
  const selected = await api.selectPlan(account.id, 'base')
  const activated = await api.requestActivation(account.id)
  assert.deepEqual(JSON.parse(calls[0].body), { name: 'Vial', code: 'E01', segment: 'Construction' })
  assert.equal(calls[0].url, 'http://localhost:5080/api/company-accounts')
  assert.equal(calls[1].url, 'http://localhost:5080/api/company-accounts/company-1/subscription')
  assert.deepEqual(JSON.parse(calls[1].body), { plan: 'base', billingCycle: 'Monthly' })
  assert.equal(calls[2].url, 'http://localhost:5080/api/company-accounts/company-1/subscription/activation')
  assert.equal(selected.status, 'pending')
  assert.equal(activated.subscription.status, 'active')
  assert.equal(activated.subscription.expiresAt, '2026-12-14T00:00:00Z')
})

test('IAM session and permissions match the ASP.NET contract', async () => {
  const calls = []
  const backendUser = { id: 'user-1', companyId: 'company-1', role: 'CompanyAdmin', permissions: ['ViewProjects', 'ManageUsers'], accessStatus: 'Active' }
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options })
    return Response.json(calls.length === 1 ? { token: 'token-1', user: backendUser } : backendUser)
  }
  const api = createIamBackendRepository({ baseUrl: 'http://localhost:5080/api/', fetchImpl, getToken: () => 'token-1' })
  const session = await api.signIn(null, 'admin@example.com', 'Password1')
  const current = await api.currentSession()
  assert.deepEqual(JSON.parse(calls[0].body), { companyId: null, email: 'admin@example.com', password: 'Password1' })
  assert.equal(calls[0].url, 'http://localhost:5080/api/iam/sessions')
  assert.equal(calls[1].headers.Authorization, 'Bearer token-1')
  assert.equal(session.user.roleId, 'company_admin')
  assert.deepEqual(current.user.permissions, ['view_projects', 'manage_users'])
})

