import test from 'node:test'
import assert from 'node:assert/strict'
import { acknowledgeAlert, createAlertFromReading, evaluateRisk, filterAlerts, summarizeAlerts } from '../src/alerting/domain/alert.js'
import { createDemoAlerts, DEMO_RISK_PROFILES } from '../src/alerting/infrastructure/alert-fixtures.js'

test('classifies maximum and range readings at both risk boundaries', () => {
  assert.equal(evaluateRisk(50, DEMO_RISK_PROFILES.pm25), 'critical')
  assert.equal(evaluateRisk(35, DEMO_RISK_PROFILES.pm25), 'observation')
  assert.equal(evaluateRisk(34, DEMO_RISK_PROFILES.pm25), null)
  assert.equal(evaluateRisk(8.6, DEMO_RISK_PROFILES.ph), 'critical')
  assert.equal(evaluateRisk(8.3, DEMO_RISK_PROFILES.ph), 'observation')
  assert.equal(evaluateRisk(7.2, DEMO_RISK_PROFILES.ph), null)
})

test('creates alerts only for evaluated risk readings', () => {
  const alerts = createDemoAlerts(new Date('2026-09-17T19:00:00.000Z'))
  assert.equal(alerts.length, 3)
  assert.deepEqual(summarizeAlerts(alerts), { total: 3, byStatus: { active: 3 }, byRisk: { critical: 1, observation: 2 } })
  assert.equal(createAlertFromReading({ reading: { id: 'safe', value: 20 }, profile: DEMO_RISK_PROFILES.pm25 }), null)
})

test('filters and prioritizes alerts without changing source data', () => {
  const alerts = createDemoAlerts()
  assert.equal(filterAlerts(alerts, { projectId: 'prj-arequipa-norte', risk: 'critical', search: 'pm2.5' })[0].id, 'ALR-024')
  assert.equal(filterAlerts(alerts)[0].risk, 'critical')
  assert.equal(alerts.length, 3)
})

test('acknowledgment preserves the original alert and records its author', () => {
  const original = createDemoAlerts()[0]
  const updated = acknowledgeAlert(original, 'Ana Torres', '2026-09-17T15:00:00-05:00')
  assert.equal(original.status, 'active')
  assert.equal(updated.status, 'acknowledged')
  assert.equal(updated.acknowledgedBy, 'Ana Torres')
  assert.equal(acknowledgeAlert(updated, 'Ana Torres'), null)
})
