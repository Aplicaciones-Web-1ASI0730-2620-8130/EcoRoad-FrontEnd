import test from 'node:test'
import assert from 'node:assert/strict'
import { createMonitoringOperationsBackendRepository } from '../src/monitoring/infrastructure/monitoring-operations-backend-repository.js'

test('monitoring operations send ASP.NET profile, measurement and alert contracts', async () => {
  const calls = []
  const fetchImpl = async (url, options = {}) => {
    const path = new URL(url).pathname
    const body = options.body ? JSON.parse(options.body) : null
    calls.push({ path, method: options.method, body })
    const data = path === '/api/monitoring/threshold-profiles' && options.method === 'GET' ? []
      : path === '/api/assets/sensors' ? [{ id: 's1', type: 'Pm10', projectId: 'p1', sectionId: 'r1', monitoringPointId: 'm1', status: 'Active', canReport: true }]
        : path === '/api/alerts/evaluations' ? { deviationDetected: true, isCritical: false, alert: { id: 'a1' } }
          : { id: 'x1' }
    return { ok: true, status: 200, json: async () => data }
  }
  const api = createMonitoringOperationsBackendRepository({ baseUrl: 'http://localhost/api/', getCompanyId: () => 'c1', fetchImpl })
  assert.deepEqual(await api.listProfiles(), [])
  const sensor = (await api.listSensors('p1'))[0]
  assert.equal(sensor.parameterId, 'pm10')
  assert.equal(calls.at(-1).path, '/api/assets/sensors')
  const limits = { kind: 'Maximum', warningThreshold: 35, criticalThreshold: 50, minimum: null, optimalMinimum: null, optimalMaximum: null, maximum: null }
  await api.configureProfile('PM10 aprobado', 'pm10', limits)
  assert.deepEqual(calls.at(-1).body, { name: 'PM10 aprobado', parameterType: 'AirQuality', limits })
  await api.updateProfile('profile1', limits)
  assert.equal(calls.at(-1).path, '/api/monitoring/threshold-profiles/profile1/thresholds')
  assert.equal(calls.at(-1).method, 'PUT')
  await api.recordManual({ projectId: 'p1', sectionId: 'r1', operatorId: 'u1', parameterId: 'pm10', value: '42', notes: 'Campo' })
  assert.deepEqual(calls.at(-1).body, { projectId: 'p1', sectionId: 'r1', operatorId: 'u1', parameterType: 'AirQuality', value: 42, recordedAt: null, notes: 'Campo' })
  await api.recordTelemetry({ sensor, value: '45' })
  assert.deepEqual(calls.at(-1).body, { projectId: 'p1', sectionId: 'r1', monitoringPointId: 'm1', sensorId: 's1', parameterType: 'AirQuality', value: 45, recordedAt: null })
  await api.registerAlertRule({ parameter: 'PM10', unit: 'µg/m³', timeBand: 'Daytime', limit: '35', criticalExcess: '15' })
  assert.deepEqual(calls.at(-1).body, { parameter: 'PM10', unit: 'µg/m³', timeBand: 'Daytime', limit: 35, criticalExcess: 15 })
  const result = await api.evaluateAlert({ workFrontId: 'f1', parameter: 'PM10', timeBand: 'Daytime', measuredValue: '42' })
  assert.deepEqual(calls.at(-1).body, { workFrontId: 'f1', parameter: 'PM10', timeBand: 'Daytime', measuredValue: 42 })
  assert.equal(result.alert.id, 'a1')
})
