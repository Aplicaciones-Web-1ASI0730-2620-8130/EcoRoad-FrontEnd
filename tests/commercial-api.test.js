import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CommercialApiError,
  createCommercialApiRepository,
} from '../src/commercial/infrastructure/commercial-api-repository.js'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  }
}

test('sends account registration without IAM credentials and encodes company identifiers', async () => {
  const calls = []
  const repository = createCommercialApiRepository({
    baseUrl: 'https://api.example.test/v1/',
    getAccessToken: () => 'session-token',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init })
      return jsonResponse({ id: 'company-1' })
    },
  })

  await repository.registerCompany({
    companyName: 'Eco Vial',
    ruc: '20601234567',
    companyType: 'construction',
    adminName: 'Ana Torres',
    adminEmail: 'ANA@EMPRESA.PE',
    acceptedTerms: true,
  })
  await repository.getSubscription('company/1')

  assert.equal(calls[0].url, 'https://api.example.test/v1/company-accounts')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer session-token')
  const body = JSON.parse(calls[0].init.body)
  assert.equal(body.administrator.email, 'ana@empresa.pe')
  assert.equal('password' in body, false)
  assert.equal(calls[1].url, 'https://api.example.test/v1/company-accounts/company%2F1/subscription')
})

test('preserves backend error status and code for UI decisions', async () => {
  const repository = createCommercialApiRepository({
    baseUrl: 'https://api.example.test/',
    fetchImpl: async () => jsonResponse({ message: 'RUC ya registrado', code: 'DUPLICATE_RUC' }, 409),
  })
  await assert.rejects(
    repository.registerCompany({
      companyName: 'Eco Vial',
      ruc: '20601234567',
      companyType: 'construction',
      adminName: 'Ana Torres',
      adminEmail: 'ana@empresa.pe',
      acceptedTerms: true,
    }),
    (error) => error instanceof CommercialApiError &&
      error.status === 409 && error.code === 'DUPLICATE_RUC',
  )
})

test('fake API completes registration, plan, activation and renewal through HTTP', async () => {
  const server = createFakeCommercialApi({ includeExample: false })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const repository = createCommercialApiRepository({
      baseUrl: `http://127.0.0.1:${server.address().port}/api/`,
    })
    const company = await repository.registerCompany({
      companyName: 'Eco Vial',
      ruc: '20601234567',
      companyType: 'construction',
      adminName: 'Ana Torres',
      adminEmail: 'ana@empresa.pe',
      acceptedTerms: true,
      planId: 'professional',
    })
    assert.equal((await repository.getSubscription(company.id)).status, 'pending')
    const selected = await repository.selectPlan(company.id, 'professional')
    assert.equal(selected.planId, 'professional')
    const activated = await repository.requestActivation(company.id)
    assert.equal(activated.subscription.status, 'active')
    assert.equal(activated.simulated, true)
    const renewed = await repository.requestRenewal(company.id)
    assert.ok(new Date(renewed.subscription.expiresAt) > new Date(activated.subscription.expiresAt))
    await assert.rejects(
      repository.registerCompany({
        companyName: 'Duplicada',
        ruc: '20601234567',
        companyType: 'construction',
        adminName: 'Otra Persona',
        adminEmail: 'otra@empresa.pe',
        acceptedTerms: true,
      }),
      (error) => error.status === 409 && error.code === 'DUPLICATE_RUC',
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
