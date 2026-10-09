import test from 'node:test'
import assert from 'node:assert/strict'
import {
  matchesProjectFilters,
  validateRoadProject,
} from '../src/projects/domain/road-project.js'
import { parseKilometerPost, validateRoadSections, hasRoadSectionErrors } from '../src/projects/domain/road-section.js'
import { useProjects } from '../src/projects/application/use-projects.js'

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

const section = { name: 'Trapiche - Chorrillos', startPk: '00+000', endPk: '32+000', workFront: 'Movimiento de tierras' }

test('road sections require valid, ascending kilometer posts without overlap', () => {
  assert.equal(parseKilometerPost('32+450'), 32450)
  assert.equal(parseKilometerPost('32-450'), null)
  assert.equal(hasRoadSectionErrors(validateRoadSections([section])), false)
  assert.equal(validateRoadSections([]).sections, 'Agrega al menos un tramo del corredor vial.')
  assert.ok(validateRoadSections([{ ...section, endPk: '00+000' }]).items[0].endPk)
  assert.ok(validateRoadSections([{ ...section, startPk: '32+100' }]).items[0].endPk)
  const overlapping = validateRoadSections([section, { ...section, name: 'Segundo tramo', startPk: '31+999', endPk: '40+000' }])
  assert.ok(overlapping.items[0].range)
  assert.ok(overlapping.items[1].range)
  assert.equal(hasRoadSectionErrors(validateRoadSections([section, { ...section, startPk: '32+000', endPk: '40+000' }])), false)
})

test('project registration and section editing preserve the project aggregate', () => {
  const store = useProjects()
  const result = store.registerProject({ ...project, sections: [section] })
  assert.ok(result.project)
  assert.equal(result.project.sections.length, 1)
  const invalid = store.saveSection(result.project.id, { ...section, name: 'Superpuesto', startPk: '01+000', endPk: '02+000' })
  assert.ok(invalid.errors.range)
  const added = store.saveSection(result.project.id, { ...section, name: 'Segundo tramo', startPk: '32+000', endPk: '40+000' })
  assert.ok(added.section)
  assert.equal(store.findProject(result.project.id).sections.length, 2)
  const updated = store.saveSection(result.project.id, { ...added.section, workFront: 'Drenajes' })
  assert.equal(updated.section.workFront, 'Drenajes')
  assert.equal(store.removeSection(result.project.id, added.section.id), true)
  assert.equal(store.findProject(result.project.id).sections.length, 1)
})
