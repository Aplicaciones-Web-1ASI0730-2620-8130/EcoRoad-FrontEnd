import test from 'node:test'
import assert from 'node:assert/strict'
import { activateSensor, assignSensor, calibrateSensor, canReport, deactivateSensor, releaseSensor, summarizeAssets, validateMonitoringPoint, validateSensorAsset } from '../src/assets/domain/monitoring-asset.js'

const now = new Date('2026-10-09T12:00:00Z')
const point = { id: 'point-1', projectId: 'project-1', sectionId: 'section-1' }
const project = { sections: [{ id: 'section-1', startPk: '00+000', endPk: '20+000' }] }
const available = { id: 'sensor-1', status: 'available', pointId: null, projectId: null, sectionId: null, calibration: null }

test('monitoring points and owned sensors must have valid deployment data', () => {
  assert.deepEqual(validateMonitoringPoint({ sectionId: 'section-1', name: 'Punto 1', pk: '05+100', latitude: -12.1, longitude: -76.9 }, project), {})
  const invalid = validateMonitoringPoint({ sectionId: 'section-1', name: '', pk: '25+000', latitude: 100, longitude: '' }, project)
  assert.deepEqual(Object.keys(invalid).sort(), ['latitude', 'longitude', 'name', 'pk'])
  assert.deepEqual(validateSensorAsset({ name: 'Sensor', serialNumber: 'ECO-001', type: 'pm10' }), {})
  assert.equal(validateSensorAsset({ name: '', serialNumber: '!', type: 'unknown' }).type !== undefined, true)
})

test('only assigned and calibrated active sensors may report', () => {
  assert.equal(canReport(available, now), false)
  const assigned = assignSensor(available, point)
  assert.equal(assigned.status, 'assigned')
  assert.throws(() => activateSensor(assigned, now), { code: 'CALIBRATION_REQUIRED' })
  assert.throws(() => calibrateSensor(assigned, '2026-10-08', now), { code: 'INVALID_CALIBRATION' })
  const calibrated = calibrateSensor(assigned, '2026-11-09', now)
  const active = activateSensor(calibrated, now)
  assert.equal(canReport(active, now), true)
  assert.equal(canReport(active, new Date('2026-11-10')), false)
  assert.throws(() => assignSensor(active, point), { code: 'ACTIVE_SENSOR' })
  assert.throws(() => releaseSensor(active), { code: 'ACTIVE_SENSOR' })
  const inactive = deactivateSensor(active)
  assert.equal(canReport(inactive, now), false)
  assert.equal(assignSensor(inactive, point).calibration, null)
  assert.equal(releaseSensor(inactive).status, 'available')
  assert.deepEqual(summarizeAssets([available, assigned, active], now), { total: 3, active: 1, assigned: 1, available: 1, calibrationDue: 1 })
})
