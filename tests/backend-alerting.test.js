import test from 'node:test'
import assert from 'node:assert/strict'
import { createAlertingBackendRepository } from '../src/alerting/infrastructure/alerting-backend-repository.js'
import { createAlertStore } from '../src/alerting/application/use-alerts.js'

test('real alerts belong to the selected company and acknowledgement uses the backend route', async () => {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), ...options })
    const path = new URL(url).pathname
    const body = path === '/api/projects' ? [
      { id: 'p1', companyId: 'c1', name: 'Ruta', sections: [{ id: 's1', name: 'Tramo', startKilometer: 0, endKilometer: 1, workFronts: [{ id: 'f1', name: 'Frente' }] }] },
      { id: 'p2', companyId: 'c2', name: 'Ajena', sections: [{ id: 's2', name: 'Otro', startKilometer: 0, endKilometer: 1, workFronts: [{ id: 'f2', name: 'Frente ajeno' }] }] },
    ] : path === '/api/alerts' ? [
      { id: 'a1', workFrontId: 'f1', parameter: 'PM10', measuredValue: 50, limitValue: 35, unit: 'µg/m³', severity: 'Critical', raisedAt: '2026-11-14T00:00:00Z' },
      { id: 'a2', workFrontId: 'f2', parameter: 'PM10', measuredValue: 50, limitValue: 35, unit: 'µg/m³', severity: 'Critical', raisedAt: '2026-11-14T00:00:00Z' },
    ] : { id: 'a1', workFrontId: 'f1', parameter: 'PM10', measuredValue: 50, limitValue: 35, unit: 'µg/m³', severity: 'Critical', status: 'Acknowledged', raisedAt: '2026-11-14T00:00:00Z', acknowledgedAt: '2026-11-14T01:00:00Z', acknowledgedBy: 'Ana' }
    return { ok: true, status: 200, json: async () => body }
  }
  const api = createAlertingBackendRepository({ baseUrl: 'http://localhost/api/', getCompanyId: () => 'c1', fetchImpl })
  const store = createAlertStore(api)
  assert.equal(await store.loadAlerts(), true)
  assert.deepEqual(store.alerts.value.map((alert) => alert.id), ['a1'])
  assert.equal(store.alerts.value[0].sectionName, 'Tramo')
  assert.equal(await store.acknowledge('a1', 'Ana'), true)
  assert.equal(calls.at(-1).url, 'http://localhost/api/alerts/a1/acknowledgement')
  assert.deepEqual(JSON.parse(calls.at(-1).body), { acknowledgedBy: 'Ana' })
  assert.equal(store.alerts.value.length, 0)
})
