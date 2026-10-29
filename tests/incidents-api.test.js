import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { createIamApiRepository } from '../src/iam/infrastructure/iam-api-repository.js'
import { createIncidentApiRepository } from '../src/incidents/infrastructure/incident-api-repository.js'
import { createIncidentStore } from '../src/incidents/application/use-incidents.js'
import { createCommercialApiRepository } from '../src/commercial/infrastructure/commercial-api-repository.js'

test('fake incident API persists the full workflow and enforces IAM and company isolation', async () => {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/`
  try {
    const iam = createIamApiRepository({ baseUrl })
    const adminToken = (await iam.signIn('demo-company', 'c.mendoza@empresa.pe', 'EcoRoadDemo123!')).token
    const inspectorToken = (await iam.signIn('demo-company', 'luis.garcia@empresa.pe', 'EcoRoadDemo123!')).token
    const engineerToken = (await iam.signIn('demo-company', 'ana.torres@empresa.pe', 'EcoRoadDemo123!')).token
    const repo = (token, companyId = 'demo-company') => createIncidentApiRepository({ baseUrl, getCompanyId: () => companyId, getToken: () => token })
    const admin = repo(adminToken)
    const inspector = repo(inspectorToken)
    const engineer = repo(engineerToken)
    await assert.rejects(repo(null).list(), { status: 401, code: 'SESSION_REQUIRED' })

    const store = createIncidentStore(admin)
    assert.equal(await store.load(), true)
    assert.equal(store.incidents.value.length, 3)
    assert.equal(store.alerts.value.length, 3)
    const available = store.alerts.value.find((alert) => !store.incidents.value.some((incident) => incident.alertId === alert.id))
    assert.equal(available.id, 'ALR-019')
    const opened = await store.create(available.id, 'Desviación de calidad de agua')
    assert.equal(opened.status, 'pending')
    await assert.rejects(admin.create(available.id, 'Duplicado'), { status: 409, code: 'DUPLICATE_ALERT' })
    await assert.rejects(admin.assign(opened.id, 'unknown'), { status: 422, code: 'INVALID_ASSIGNEE' })
    assert.equal(await store.assign(opened.id, 'usr-luis'), true)
    await assert.rejects(admin.resolve(opened.id), { status: 409, code: 'REMEDIATION_INCOMPLETE' })
    assert.equal(await store.addAction(opened.id, 'Barreras de escorrentía'), true)
    await assert.rejects(engineer.addEvidence(opened.id, 'Muestra'), { status: 403, code: 'PERMISSION_REQUIRED' })
    const attachment = { name: 'campo.png', mimeType: 'image/png', dataBase64: Buffer.from('demo-image-bytes').toString('base64') }
    const evidence = await inspector.addEvidence(opened.id, 'Contramuestra y fotografía', attachment)
    assert.equal(evidence.evidence.length, 1)
    assert.equal(evidence.evidence[0].attachment.name, 'campo.png')
    assert.match(evidence.evidence[0].attachment.sha256, /^[0-9a-f]{64}$/)
    const downloaded = await inspector.downloadEvidence(opened.id, evidence.evidence[0].id)
    assert.equal(Buffer.from(await downloaded.arrayBuffer()).toString(), 'demo-image-bytes')
    await assert.rejects(admin.addEvidence(opened.id, 'Archivo inválido', { name: 'malware.exe', mimeType: 'application/x-msdownload', dataBase64: 'YWJj' }), { status: 422, code: 'INVALID_ATTACHMENT' })
    assert.equal(await store.resolve(opened.id), true)
    assert.equal(await store.close(opened.id), true)
    assert.equal((await admin.get(opened.id)).status, 'closed')
    assert.equal((await admin.list()).length, 4)
    await assert.rejects(repo(adminToken, 'other-company').list(), { status: 403, code: 'COMPANY_FORBIDDEN' })

    const commercial = createCommercialApiRepository({ baseUrl })
    const company = await commercial.registerCompany({ companyName: 'Otra Constructora', ruc: '20601234999', companyType: 'construction', adminName: 'Otra Admin', adminEmail: 'admin@otra.pe', acceptedTerms: true })
    const otherToken = (await iam.signIn(company.id, 'admin@otra.pe', 'EcoRoadDemo123!')).token
    await assert.rejects(repo(otherToken, company.id).list(), { status: 403, code: 'SUBSCRIPTION_REQUIRED' })
    await commercial.selectPlan(company.id, 'base')
    await commercial.requestActivation(company.id)
    assert.deepEqual(await repo(otherToken, company.id).list(), [])
    await assert.rejects(repo(otherToken, company.id).get(opened.id), { status: 404, code: 'INCIDENT_NOT_FOUND' })
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
