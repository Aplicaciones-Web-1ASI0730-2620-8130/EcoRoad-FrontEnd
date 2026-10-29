import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReportPreview, validateReportCriteria } from '../src/compliance/domain/report-preview.js'

const projects = [{ id: 'p1', name: 'Carretera uno', code: 'P-001' }, { id: 'p2', name: 'Carretera dos' }]
const criteria = { projectId: 'p1', from: '2026-09-01', to: '2026-09-30', sections: ['indicators', 'alerts'] }

test('report criteria reject invalid dates, projects and unavailable sources', () => {
  assert.deepEqual(validateReportCriteria(criteria, projects, '2026-10-09'), {})
  const invalid = validateReportCriteria({ projectId: 'missing', from: '2026-02-30', to: '2026-01-01', sections: ['incidents'] }, projects, '2026-10-09')
  assert.deepEqual(Object.keys(invalid).sort(), ['from', 'projectId', 'sections'])
  assert.equal(validateReportCriteria({ ...criteria, from: '2026-10-01' }, projects, '2026-10-09').to !== undefined, true)
  assert.equal(validateReportCriteria({ ...criteria, to: '2027-01-01' }, projects, '2026-10-09').to !== undefined, true)
  assert.equal(validateReportCriteria({ ...criteria, sections: ['indicators', 'evidence'] }, projects, '2026-10-09').sections !== undefined, true)
})

test('preview consolidates only one project and an inclusive period without inventing missing sources', () => {
  const source = {
    projects,
    readings: [
      { projectId: 'p1', parameterId: 'pm10', value: 42, recordedAt: '2026-09-01T00:00:00Z' },
      { projectId: 'p1', parameterId: 'pm10', value: 70, recordedAt: '2026-09-30T23:59:59Z' },
      { projectId: 'p1', parameterId: 'noise', value: 60, recordedAt: '2026-09-20T12:00:00Z' },
      { projectId: 'p2', parameterId: 'pm10', value: 200, recordedAt: '2026-09-15T12:00:00Z' },
      { projectId: 'p1', parameterId: 'pm10', value: 100, recordedAt: '2026-10-01T00:00:00Z' },
    ],
    alerts: [
      { projectId: 'p1', risk: 'critical', detectedAt: '2026-09-30T23:59:59Z' },
      { projectId: 'p2', risk: 'critical', detectedAt: '2026-09-20T12:00:00Z' },
    ],
  }
  const result = buildReportPreview(criteria, source)
  assert.equal(result.readingCount, 3)
  assert.deepEqual(result.indicators[0], { parameterId: 'pm10', count: 2, minimum: 42, maximum: 70 })
  assert.equal(result.alertCount, 1)
  assert.equal(result.criticalAlertCount, 1)
  assert.equal(result.incidentCount, null)
  assert.equal(result.evidenceCount, null)
  assert.equal(result.sourceAvailability.incidents, false)
  assert.equal(buildReportPreview({ ...criteria, projectId: 'missing' }, source).errors.projectId !== undefined, true)
})
