import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { ComplianceApiError, createComplianceApiRepository } from '../src/compliance/infrastructure/compliance-api-repository.js'
import { createCommercialApiRepository } from '../src/commercial/infrastructure/commercial-api-repository.js'
import { createProjectApiRepository } from '../src/projects/infrastructure/project-api-repository.js'
import { createAlertingApiRepository } from '../src/alerting/infrastructure/alerting-api-repository.js'

const period = { from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }

test('fake compliance API builds live previews and stores report snapshots by company', async () => {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/`
    const demo = createComplianceApiRepository({ baseUrl, getCompanyId: () => 'demo-company' })
    const criteria = { projectId: 'prj-lima-canta', ...period, sections: ['indicators', 'alerts'] }
    assert.equal((await demo.listProjects()).length, 3)
    const initial = await demo.previewReport(criteria)
    assert.ok(initial.readingCount > 0)
    assert.equal(initial.alertCount, 1)
    assert.equal(initial.acknowledgedAlertCount, 0)
    assert.equal(initial.incidentCount, null)
    await assert.rejects(demo.previewReport({ ...criteria, to: '2027-01-01' }),
      (error) => error instanceof ComplianceApiError && error.status === 422 && error.code === 'INVALID_REPORT_CRITERIA')
    await assert.rejects(demo.previewReport({ ...criteria, sections: 'indicators' }),
      (error) => error.status === 422 && error.code === 'INVALID_REPORT_CRITERIA')

    const saved = await demo.generateReport(criteria)
    assert.equal(saved.simulation, true)
    assert.equal(saved.preview.readingCount, initial.readingCount)
    assert.equal((await demo.listReports()).length, 1)
    assert.equal((await demo.listReports('prj-arequipa-norte')).length, 0)
    assert.equal((await demo.getReport(saved.id)).id, saved.id)

    const alerting = createAlertingApiRepository({ baseUrl, getCompanyId: () => 'demo-company' })
    const matching = (await alerting.listAlerts()).find((item) => item.projectId === criteria.projectId)
    await alerting.acknowledgeAlert(matching.id, 'Ana Torres')
    assert.equal((await demo.previewReport(criteria)).acknowledgedAlertCount, 1)
    assert.equal((await demo.getReport(saved.id)).preview.acknowledgedAlertCount, 0)

    const commercial = createCommercialApiRepository({ baseUrl })
    const company = await commercial.registerCompany({ companyName: 'Obras Test', ruc: '20601234569', companyType: 'construction', adminName: 'Ana Torres', adminEmail: 'ana@obras.pe', acceptedTerms: true })
    const tenant = createComplianceApiRepository({ baseUrl, getCompanyId: () => company.id })
    await assert.rejects(tenant.listProjects(), (error) => error.status === 403 && error.code === 'SUBSCRIPTION_REQUIRED')
    await commercial.selectPlan(company.id, 'base')
    await commercial.requestActivation(company.id)
    assert.deepEqual(await tenant.listProjects(), [])
    assert.deepEqual(await tenant.listReports(), [])
    await assert.rejects(tenant.getReport(saved.id), (error) => error.status === 404 && error.code === 'REPORT_NOT_FOUND')

    const projectApi = createProjectApiRepository({ baseUrl, getCompanyId: () => company.id })
    const project = await projectApi.registerProject({ name: 'Proyecto nuevo', location: 'Lima', type: 'construction', concessionaireName: 'Obras Test', sections: [{ name: 'Tramo 1', startPk: '00+000', endPk: '10+000', workFront: 'Tierra' }] })
    assert.equal((await tenant.listProjects())[0].id, project.id)
    const empty = await tenant.previewReport({ ...criteria, projectId: project.id })
    assert.equal(empty.readingCount, 0)
    assert.equal(empty.alertCount, 0)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
