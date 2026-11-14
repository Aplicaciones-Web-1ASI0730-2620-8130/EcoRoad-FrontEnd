import test from 'node:test'
import assert from 'node:assert/strict'
import { createAssetBackendRepository } from '../src/assets/infrastructure/asset-backend-repository.js'
import { createMonitoringBackendRepository } from '../src/monitoring/infrastructure/monitoring-backend-repository.js'

const project = { id: 'p1', companyId: 'c1', name: 'Ruta', code: 'R1', sections: [{ id: 's1', name: 'Tramo', startKilometer: 5, endKilometer: 6 }] }
const fetchFor = (routes, calls) => async (url, options = {}) => {
  calls.push({ url: String(url), ...options })
  const entry = routes[new URL(url).pathname + new URL(url).search]
  assert.ok(entry !== undefined, `Unexpected request: ${url}`)
  return { ok: true, status: entry === null ? 204 : 200, json: async () => entry }
}

test('real asset repository maps point and sensor contracts and handles 204 deletion', async () => {
  const calls = []
  const api = createAssetBackendRepository({ baseUrl: 'http://localhost/api/', getCompanyId: () => 'c1', fetchImpl: fetchFor({
    '/api/assets/points': [{ id: 'm1', projectId: 'p1', kilometerPost: 'PK 05+000', status: 'Enabled' }],
    '/api/assets/sensors': [{ id: 'd1', type: 'Pm10', status: 'Assigned', monitoringPointId: 'm1', calibrationValidUntil: '2027-01-01' }],
    '/api/assets/sensors/d1/assignment': { id: 'd1', type: 'Pm10', status: 'Assigned', monitoringPointId: 'm1' },
    '/api/assets/points/m1': null,
  }, calls) })
  assert.equal((await api.listPoints())[0].pk, '05+000')
  assert.equal((await api.listSensors())[0].calibration.validUntil, '2027-01-01')
  assert.equal((await api.assignSensor('d1', 'm1')).pointId, 'm1')
  assert.equal(JSON.parse(calls.at(-1).body).monitoringPointId, 'm1')
  assert.equal(await api.deletePoint('m1'), true)
})

test('real monitoring repository maps dashboard and history without demo thresholds', async () => {
  const calls = []
  const api = createMonitoringBackendRepository({ baseUrl: 'http://localhost/api/', getCompanyId: () => 'c1', fetchImpl: fetchFor({
    '/api/projects': [project],
    '/api/monitoring/projects/p1/dashboard': { projectId: 'p1', status: 'Observation', latestAt: '2026-11-14T00:00:00Z', parameters: [{ parameterType: 'AirQuality', metric: 'PM10', unit: 'µg/m³', worstReading: { measurementId: 'r1', sectionId: 's1', value: 30, status: 'Observation', source: 'Manual', recordedAt: '2026-11-14T00:00:00Z' } }], sections: [{ sectionId: 's1', status: 'Observation', readings: [] }] },
    '/api/monitoring/projects/p1/history?parameterType=AirQuality&from=2026-11-01&to=2026-11-14': [{ id: 'r1', sectionId: 's1', value: 30, status: 'Observation', source: 'Manual', recordedAt: '2026-11-14T00:00:00Z' }],
  }, calls) })
  await api.listProjects()
  const dashboard = await api.getDashboard('p1')
  assert.equal(dashboard.status, 'observation')
  assert.equal(dashboard.parameters[0].reading.status, 'observation')
  assert.equal(dashboard.sections[0].pk, '05+000')
  const history = await api.getHistory({ projectId: 'p1', sectionId: 'all', parameterId: 'pm10', from: '2026-11-01', to: '2026-11-14' })
  assert.equal(history.readings[0].status, 'observation')
  assert.equal(calls.at(-1).url.includes('parameterType=AirQuality'), true)
})
