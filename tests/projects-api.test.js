import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { createProjectApiRepository, ProjectApiError } from '../src/projects/infrastructure/project-api-repository.js'
import { createCommercialApiRepository } from '../src/commercial/infrastructure/commercial-api-repository.js'

const firstSection = { name: 'Tramo 01', startPk: '00+000', endPk: '25+000', workFront: 'Movimiento de tierras' }

test('fake project API persists CRUD during server lifetime and isolates companies', async () => {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/`
    const api = createProjectApiRepository({ baseUrl, getCompanyId: () => 'demo-company' })
    assert.equal((await api.listProjects()).length, 3)

    const created = await api.registerProject({
      name: 'Carretera de prueba', location: 'Lima · PK 00+000 a 50+000',
      type: 'construction', concessionaireName: 'Empresa demo', sections: [firstSection],
    })
    assert.equal(created.sections.length, 1)
    assert.equal((await api.getProject(created.id)).name, 'Carretera de prueba')
    assert.equal((await api.listProjects()).length, 4)

    await assert.rejects(api.addSection(created.id, { ...firstSection, name: 'Solapado' }),
      (error) => error instanceof ProjectApiError && error.status === 422 && error.code === 'INVALID_SECTION')
    const second = await api.addSection(created.id, { ...firstSection, name: 'Tramo 02', startPk: '25+000', endPk: '50+000' })
    assert.equal((await api.getProject(created.id)).sections.length, 2)
    await api.updateSection(created.id, second.id, { ...second, workFront: 'Drenajes' })
    assert.equal((await api.getProject(created.id)).sections[1].workFront, 'Drenajes')
    await api.removeSection(created.id, second.id)
    assert.equal((await api.getProject(created.id)).sections.length, 1)
    await assert.rejects(api.removeSection(created.id, created.sections[0].id),
      (error) => error.status === 409 && error.code === 'LAST_SECTION')

    const missing = createProjectApiRepository({ baseUrl, getCompanyId: () => 'other-company' })
    await assert.rejects(missing.getProject(created.id),
      (error) => error.status === 403 && error.code === 'SUBSCRIPTION_REQUIRED')

    const commercial = createCommercialApiRepository({ baseUrl })
    const company = await commercial.registerCompany({
      companyName: 'Obras Test', ruc: '20601234568', companyType: 'construction',
      adminName: 'Ana Torres', adminEmail: 'ana@empresa.pe', acceptedTerms: true,
    })
    const tenant = createProjectApiRepository({ baseUrl, getCompanyId: () => company.id })
    await assert.rejects(tenant.listProjects(),
      (error) => error.status === 403 && error.code === 'SUBSCRIPTION_REQUIRED')
    await commercial.selectPlan(company.id, 'base')
    await commercial.requestActivation(company.id)
    assert.deepEqual(await tenant.listProjects(), [])
    await assert.rejects(tenant.getProject(created.id),
      (error) => error.status === 404 && error.code === 'PROJECT_NOT_FOUND')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
