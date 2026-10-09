import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CommercialApiError,
  createCommercialApiRepository,
} from '../src/commercial/infrastructure/commercial-api-repository.js'

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

