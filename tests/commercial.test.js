import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessOperationalModules,
  validateCompanyRegistration,
} from '../src/commercial/domain/commercial-model.js'
import { commercialDemoRepository } from '../src/commercial/infrastructure/commercial-demo-repository.js'

const data = new Map()
globalThis.localStorage = {
  getItem: (key) => data.get(key) || null,
  setItem: (key, value) => data.set(key, value),
  removeItem: (key) => data.delete(key),
}

const validRegistration = {
  companyName: 'Consorcio Vial Sierra Central S.A.C.',
  ruc: '20601234567',
  companyType: 'construction',
  adminName: 'Carlos Mendoza',
  adminEmail: 'carlos@empresa.pe',
  planId: 'professional',
  acceptedTerms: true,
}

test('rejects an invalid RUC and missing consent', () => {
  const errors = validateCompanyRegistration({ ...validRegistration, ruc: '123', acceptedTerms: false })
  assert.equal(errors.ruc, 'El RUC debe tener 11 dígitos.')
  assert.equal(errors.acceptedTerms, 'Debes aceptar los términos.')
})

test('company access starts blocked and changes only after activation', () => {
  commercialDemoRepository.clear()
  const registered = commercialDemoRepository.registerCompany(validRegistration)
  assert.equal(registered.subscription.status, 'pending')
  assert.equal(canAccessOperationalModules(registered.subscription), false)
  assert.equal(registered.company.name, validRegistration.companyName)
  assert.throws(() => commercialDemoRepository.registerCompany(validRegistration))

  const activated = commercialDemoRepository.simulateActivation()
  assert.equal(canAccessOperationalModules(activated.subscription), true)
  const firstExpiry = new Date(activated.subscription.expiresAt)
  const renewed = commercialDemoRepository.simulateRenewal()
  assert.ok(new Date(renewed.subscription.expiresAt) > firstExpiry)
  assert.equal(canAccessOperationalModules({ status: 'active', expiresAt: '2000-01-01T00:00:00.000Z' }), false)
})

