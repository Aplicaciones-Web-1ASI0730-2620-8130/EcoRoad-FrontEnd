import test from 'node:test'
import assert from 'node:assert/strict'
import {
  matchesProjectFilters,
  validateRoadProject,
} from '../src/projects/domain/road-project.js'

const project = {
  code: 'PRJ-LIM-003',
  name: 'Carretera Lima - Canta',
  location: 'Lima · PK 00+000 a 112+000',
  type: 'construction',
  concessionaireName: 'Sierra Central',
  environmentalStatus: 'optimal',
}

test('project registration requires official name, location, type and concessionaire', () => {
  const errors = validateRoadProject({ name: ' ', location: '', type: 'unknown', concessionaireName: '' })
  assert.deepEqual(Object.keys(errors).sort(), ['concessionaireName', 'location', 'name', 'type'])
  assert.deepEqual(validateRoadProject(project), {})
})

test('project filters combine search, environmental status and work type', () => {
  assert.equal(matchesProjectFilters(project, { search: 'prj-lim', status: 'optimal', type: 'construction' }), true)
  assert.equal(matchesProjectFilters(project, { search: 'CANTA' }), true)
  assert.equal(matchesProjectFilters(project, { status: 'critical' }), false)
  assert.equal(matchesProjectFilters(project, { type: 'maintenance' }), false)
})

