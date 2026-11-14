import test from 'node:test'
import assert from 'node:assert/strict'
import { createProjectBackendRepository } from '../src/projects/infrastructure/project-backend-repository.js'

test('real project API sends company and converts PK values to kilometers', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), ...options })
    return Response.json({
      id: 'project-1', companyId: 'company-1', name: 'Obra Vial', code: 'VIAL-01', status: 'registered',
      sections: [{ id: 'section-1', name: 'Tramo A', startKilometer: 0, endKilometer: 1.5,
        workFronts: [{ id: 'front-1', name: 'Movimiento de tierras', status: 'registered' }] }],
    }, { status: 201 })
  }
  const api = createProjectBackendRepository({ baseUrl: 'http://localhost:5080/api/', fetchImpl, getCompanyId: () => 'company-1' })
  const project = await api.registerProject({ name: 'Obra Vial', code: 'VIAL-01', sections: [
    { name: 'Tramo A', startPk: '00+000', endPk: '01+500', workFront: 'Movimiento de tierras' },
  ] })
  assert.equal(calls[0].url, 'http://localhost:5080/api/projects')
  assert.deepEqual(JSON.parse(calls[0].body), {
    companyId: 'company-1', name: 'Obra Vial', code: 'VIAL-01', status: 'registered',
    sections: [{ name: 'Tramo A', startKilometer: 0, endKilometer: 1.5,
      workFronts: [{ name: 'Movimiento de tierras', status: 'registered' }] }],
  })
  assert.equal(project.sections[0].endPk, '01+500')
  assert.equal(project.sections[0].workFront, 'Movimiento de tierras')
})

test('real project API filters the listing to the selected company', async () => {
  const fetchImpl = async () => Response.json([
    { id: 'own', companyId: 'company-1', sections: [] },
    { id: 'other', companyId: 'company-2', sections: [] },
  ])
  const api = createProjectBackendRepository({ baseUrl: 'http://localhost:5080/api/', fetchImpl, getCompanyId: () => 'company-1' })
  assert.deepEqual((await api.listProjects()).map((project) => project.id), ['own'])
  await assert.rejects(() => api.getProject('other'), /no disponible/)
})
