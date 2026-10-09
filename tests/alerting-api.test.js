import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { createAlertingApiRepository, AlertingApiError } from '../src/alerting/infrastructure/alerting-api-repository.js'
import { createCommercialApiRepository } from '../src/commercial/infrastructure/commercial-api-repository.js'
import { createAlertStore } from '../src/alerting/application/use-alerts.js'

test('fake alerting API persists acknowledgments and isolates companies', async () => {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/`
    const demo = createAlertingApiRepository({ baseUrl, getCompanyId: () => 'demo-company' })
    const alerts = await demo.listAlerts()
    assert.equal(alerts.length, 3)
    assert.equal(alerts[0].risk, 'critical')
    assert.equal((await demo.getAlert(alerts[0].id)).id, alerts[0].id)

    const store = createAlertStore(demo)
    assert.equal(await store.loadAlerts(), true)
    assert.equal(store.summary.value.byStatus.active, 3)
    assert.equal(await store.acknowledge(alerts[0].id, 'Ana Torres'), true)
    assert.equal(store.summary.value.byStatus.active, 2)
    assert.equal((await demo.getAlert(alerts[0].id)).acknowledgedBy, 'Ana Torres')
    assert.equal((await demo.listAlerts())[0].status, 'acknowledged')

    await assert.rejects(demo.acknowledgeAlert(alerts[0].id, 'Ana Torres'),
      (error) => error instanceof AlertingApiError && error.status === 409 && error.code === 'ALREADY_ACKNOWLEDGED')
    await assert.rejects(demo.acknowledgeAlert(alerts[1].id, ' '),
      (error) => error.status === 422 && error.code === 'INVALID_ACKNOWLEDGMENT')
    await assert.rejects(demo.getAlert('ALR-unknown'),
      (error) => error.status === 404 && error.code === 'ALERT_NOT_FOUND')

    const commercial = createCommercialApiRepository({ baseUrl })
    const company = await commercial.registerCompany({
      companyName: 'Obras Test', ruc: '20601234569', companyType: 'construction',
      adminName: 'Otra Empresa', adminEmail: 'admin@obras.pe', acceptedTerms: true,
    })
    const other = createAlertingApiRepository({ baseUrl, getCompanyId: () => company.id })
    await assert.rejects(other.listAlerts(),
      (error) => error.status === 403 && error.code === 'SUBSCRIPTION_REQUIRED')
    await commercial.selectPlan(company.id, 'base')
    await commercial.requestActivation(company.id)
    assert.deepEqual(await other.listAlerts(), [])
    await assert.rejects(other.getAlert(alerts[0].id),
      (error) => error.status === 404 && error.code === 'ALERT_NOT_FOUND')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
