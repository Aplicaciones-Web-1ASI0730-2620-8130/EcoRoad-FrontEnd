import test from 'node:test'
import assert from 'node:assert/strict'
import { createComplianceBackendRepository } from '../src/compliance/infrastructure/compliance-backend-repository.js'

test('real report collects scoped evidence and uses request, generation and PDF routes', async () => {
  const calls = []
  const project = { id: 'p1', companyId: 'c1', name: 'Ruta', sections: [{ id: 's1', startKilometer: 0, endKilometer: 1, workFronts: [{ id: 'f1' }] }] }
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url)
    calls.push({ path: parsed.pathname, query: parsed.searchParams, method: options.method, body: options.body && JSON.parse(options.body) })
    let data
    if (parsed.pathname === '/api/projects/p1') data = project
    else if (parsed.pathname.endsWith('/history')) data = parsed.searchParams.get('parameterType') === 'AirQuality' ? [{ id: 'm1' }] : []
    else if (parsed.pathname === '/api/alerts') data = [
      { id: 'a1', workFrontId: 'f1', raisedAt: '2026-11-10T00:00:00Z' },
      { id: 'a2', workFrontId: 'other', raisedAt: '2026-11-10T00:00:00Z' },
    ]
    else if (parsed.pathname === '/api/incidents') data = [{ id: 'i1', companyId: 'c1', projectId: 'p1', openedAt: '2026-11-10T00:00:00Z', fieldEvidences: [{ id: 'e1', recordedAt: '2026-11-11T00:00:00Z' }, { id: 'e2', recordedAt: '2026-10-01T00:00:00Z' }] }]
    else if (parsed.pathname === '/api/compliance-reports' && options.method === 'POST') data = { id: 'r1', status: 'Requested' }
    else if (parsed.pathname.endsWith('/generation')) data = { id: 'r1', status: 'Generated', isSealed: true }
    else if (parsed.pathname.endsWith('/document')) return { ok: true, blob: async () => new Blob(['%PDF']) }
    else assert.fail(`Unexpected request: ${url}`)
    return { ok: true, json: async () => data }
  }
  const api = createComplianceBackendRepository({ baseUrl: 'http://localhost/api/', getCompanyId: () => 'c1', getCurrentUser: () => ({ id: 'u1' }), fetchImpl })
  const evidence = await api.collectEvidence({ projectId: 'p1', from: '2026-11-01', to: '2026-11-14' })
  assert.deepEqual(evidence.monitoringRecordIds, ['m1'])
  assert.deepEqual(evidence.alertIds, ['a1'])
  assert.deepEqual(evidence.incidentIds, ['i1'])
  assert.deepEqual(evidence.fieldEvidenceIds, ['e1'])
  assert.equal(calls.find((call) => call.path === '/api/incidents').query.get('companyId'), 'c1')
  await api.requestReport('p1')
  assert.deepEqual(calls.find((call) => call.path === '/api/compliance-reports').body, { scope: 'Project', subjectId: 'p1', requestedBy: 'u1' })
  await api.generateReport('r1', evidence, 'firma interna')
  assert.deepEqual(calls.find((call) => call.path.endsWith('/generation')).body, { monitoringRecordIds: ['m1'], alertIds: ['a1'], incidentIds: ['i1'], fieldEvidenceIds: ['e1'], digitalSignature: 'firma interna' })
  assert.equal((await api.downloadDocument('r1')).size, 4)
})
