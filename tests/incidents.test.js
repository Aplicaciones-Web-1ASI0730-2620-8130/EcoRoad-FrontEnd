import test from 'node:test'
import assert from 'node:assert/strict'
import { createDemoAlerts } from '../src/alerting/infrastructure/alert-fixtures.js'
import { createDemoUsers } from '../src/iam/infrastructure/iam-demo-data.js'
import { assignResponsible, closeIncident, filterIncidents, openIncident, recordCorrectiveAction, recordFieldEvidence, resolveIncident } from '../src/incidents/domain/incident.js'
import { createDemoIncidents } from '../src/incidents/infrastructure/incident-fixtures.js'
import { createIncidentDemoStore } from '../src/incidents/application/use-incidents-demo.js'

const [admin, engineer, inspector, fieldCollaborator] = createDemoUsers()
const alert = createDemoAlerts()[0]
const open = () => openIncident({ alert, companyId: 'demo-company', description: 'Polvo en el frente de obra' }, admin)

test('incident follows assignment, action, evidence, resolution and closure in order', () => {
  const pending = open()
  assert.equal(pending.alertId, alert.id)
  assert.throws(() => resolveIncident(pending, admin), { code: 'INVALID_STATUS' })
  assert.throws(() => assignResponsible(pending, { ...engineer, companyId: 'other-company' }, admin), { code: 'INVALID_ASSIGNEE' })
  const assigned = assignResponsible(pending, engineer, admin)
  assert.equal(assigned.status, 'in_progress')
  assert.throws(() => resolveIncident(assigned, admin), { code: 'REMEDIATION_INCOMPLETE' })
  const action = recordCorrectiveAction(assigned, 'Riego de vías', admin)
  assert.throws(() => recordFieldEvidence(action, 'Foto de campo', engineer), { code: 'PERMISSION_REQUIRED' })
  const evidence = recordFieldEvidence(action, 'Foto de campo', inspector)
  const resolved = resolveIncident(evidence, admin)
  const closed = closeIncident(resolved, admin)
  assert.equal(closed.status, 'closed')
  assert.ok(closed.closedAt)
  assert.throws(() => recordCorrectiveAction(closed, 'Otra acción', admin), { code: 'INVALID_STATUS' })
})

test('incident permissions and company boundaries are enforced by the domain', () => {
  const pending = open()
  assert.throws(() => assignResponsible(pending, engineer, fieldCollaborator), { code: 'PERMISSION_REQUIRED' })
  assert.throws(() => assignResponsible(pending, engineer, { ...admin, companyId: 'other-company' }), { code: 'CROSS_COMPANY_FORBIDDEN' })
  assert.throws(() => openIncident({ alert, companyId: 'demo-company', description: '' }, admin), { code: 'DESCRIPTION_REQUIRED' })
})

test('demo board has coherent status groups and can open an alert without an existing incident', () => {
  const fixtures = createDemoIncidents()
  assert.deepEqual(fixtures.map((item) => item.status), ['pending', 'in_progress', 'resolved'])
  assert.equal(filterIncidents(fixtures, { status: 'resolved' }).length, 1)
  const store = createIncidentDemoStore('demo-company', admin)
  const created = store.create('ALR-025', 'Nueva alerta PM10 confirmada en obra')
  assert.equal(created?.status, 'pending')
  assert.equal(store.create('ALR-025', 'Duplicado'), null)
  assert.match(store.error.value, /ya tiene un incidente/)
  assert.equal(store.assign(created.id, engineer.id), true)
  assert.equal(store.addAction(created.id, 'Riego preventivo'), true)
  assert.equal(store.addEvidence(created.id, 'Fotografía de campo'), true)
  assert.equal(store.resolve(created.id), true)
  assert.equal(store.close(created.id), true)
})
