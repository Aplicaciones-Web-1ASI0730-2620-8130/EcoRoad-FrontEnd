import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { createMonitoringApiRepository, MonitoringApiError } from '../src/monitoring/infrastructure/monitoring-api-repository.js'

async function withApi(run) {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try {
    return await run(createMonitoringApiRepository({
      baseUrl: `http://127.0.0.1:${port}/api/`,
      getCompanyId: () => 'demo-company',
    }))
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

test('fake monitoring API exposes projects, dashboard and filtered history', async () => {
  await withApi(async (api) => {
    const projects = await api.listProjects()
    assert.equal(projects.length, 3)

    const dashboard = await api.getDashboard(projects[0].id)
    assert.equal(dashboard.project.id, projects[0].id)
    assert.ok(dashboard.sections.length > 0)
    assert.equal(dashboard.status, 'critical')

    const history = await api.getHistory({ projectId: projects[0].id, sectionId: 'all', parameterId: 'pm10', from: '', to: '' })
    assert.equal(history.parameterId, 'pm10')
    assert.ok(history.readings.length > 0)
  })
})

test('fake monitoring API rejects invalid filters and inactive companies', async () => {
  await withApi(async (api) => {
    await assert.rejects(
      api.getHistory({ projectId: 'prj-arequipa-norte', sectionId: 'all', parameterId: 'pm10', from: '2026-09-18', to: '2026-09-01' }),
      (error) => error instanceof MonitoringApiError && error.status === 422 && error.code === 'INVALID_HISTORY_FILTERS',
    )
  })

  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try {
    const api = createMonitoringApiRepository({ baseUrl: `http://127.0.0.1:${port}/api/`, getCompanyId: () => 'other-company' })
    await assert.rejects(api.listProjects(), (error) => error instanceof MonitoringApiError && error.status === 403 && error.code === 'SUBSCRIPTION_REQUIRED')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
