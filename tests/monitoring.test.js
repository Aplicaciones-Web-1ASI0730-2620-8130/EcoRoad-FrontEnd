import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyReading, filterEnvironmentalHistory, latestReadings, summarizeMonitoring, validateHistoryFilters } from '../src/monitoring/domain/environmental-reading.js'
import { DEMO_READINGS, DEMO_THRESHOLD_PROFILES, MONITORING_PROJECTS } from '../src/monitoring/infrastructure/monitoring-fixtures.js'

test('demo threshold profiles classify maximum and range measurements', () => {
  assert.equal(classifyReading(99, DEMO_THRESHOLD_PROFILES.pm10), 'optimal')
  assert.equal(classifyReading(100, DEMO_THRESHOLD_PROFILES.pm10), 'observation')
  assert.equal(classifyReading(150, DEMO_THRESHOLD_PROFILES.pm10), 'critical')
  assert.equal(classifyReading(6.8, DEMO_THRESHOLD_PROFILES.ph), 'optimal')
  assert.equal(classifyReading(6.6, DEMO_THRESHOLD_PROFILES.ph), 'observation')
  assert.equal(classifyReading(6.4, DEMO_THRESHOLD_PROFILES.ph), 'critical')
  assert.equal(classifyReading(Number.NaN, DEMO_THRESHOLD_PROFILES.pm10), null)
})

test('dashboard uses the latest reading per section and parameter', () => {
  const project = MONITORING_PROJECTS[0]
  const readings = DEMO_READINGS.filter((reading) => reading.projectId === project.id)
  const current = latestReadings(readings)
  assert.equal(current.find((reading) => reading.sectionId === 'lim-03').value, 185)
  const summary = summarizeMonitoring(project, readings, DEMO_THRESHOLD_PROFILES)
  assert.equal(summary.status, 'critical')
  assert.deepEqual(summary.sections.map((section) => section.status), ['optimal', 'observation', 'critical', 'optimal'])
  assert.equal(summary.parameters.find((parameter) => parameter.id === 'pm10').reading.value, 185)
  assert.equal(summarizeMonitoring(project, [], DEMO_THRESHOLD_PROFILES).status, null)
})

test('indicator history combines project, section, parameter and inclusive dates', () => {
  const readings = filterEnvironmentalHistory(DEMO_READINGS, {
    projectId: 'prj-lima-canta', sectionId: 'lim-03', parameterId: 'pm10',
  })
  assert.ok(readings.length >= 5)
  assert.ok(readings.every((reading) => reading.sectionId === 'lim-03' && reading.parameterId === 'pm10'))
  assert.ok(readings.every((reading, index) => index === 0 || readings[index - 1].recordedAt <= reading.recordedAt))
  const day = readings.at(-1).recordedAt.slice(0, 10)
  assert.ok(filterEnvironmentalHistory(DEMO_READINGS, { projectId: 'prj-lima-canta', sectionId: 'lim-03', parameterId: 'pm10', from: day, to: day }).length >= 1)
  assert.equal(validateHistoryFilters({ from: '2026-10-10', to: '2026-10-09' }), 'La fecha inicial debe ser anterior o igual a la fecha final.')
})
