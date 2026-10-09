import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessOperationalModules,
  validateCompanyRegistration,
} from '../src/commercial/domain/commercial-model.js'

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

test('operational access requires an active unexpired subscription', () => {
  assert.equal(canAccessOperationalModules({ status: 'pending' }), false)
  assert.equal(canAccessOperationalModules({ status: 'active', expiresAt: '2999-01-01T00:00:00.000Z' }), true)
  assert.equal(canAccessOperationalModules({ status: 'active', expiresAt: '2000-01-01T00:00:00.000Z' }), false)
})
