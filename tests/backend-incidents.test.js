import test from 'node:test'
import assert from 'node:assert/strict'
import { createIncidentBackendRepository } from '../src/incidents/infrastructure/incident-backend-repository.js'

test('real incident workflow uses ASP.NET resources and reloads actions and evidence', async () => {
  const calls = []
  let status = 'Open'
  let actions = []
  let evidence = []
  const incident = () => ({ id: 'i1', companyId: 'c1', alertId: 'a1', projectId: 'p1', sectionId: 's1', title: 'PM10', description: 'Polvo', severity: 'Critical', status, openedAt: '2026-11-14T00:00:00Z', correctiveActions: actions, fieldEvidences: evidence })
  const fetchImpl = async (url, options = {}) => {
    const path = new URL(url).pathname
    const body = options.body && JSON.parse(options.body)
    calls.push({ path, method: options.method, body })
    let payload
    if (path === '/api/projects') payload = [{ id: 'p1', companyId: 'c1', name: 'Ruta', sections: [{ id: 's1', name: 'Tramo', startKilometer: 0, endKilometer: 1, workFronts: [{ id: 'f1', name: 'Frente' }] }] }]
    else if (path === '/api/incidents' && options.method === 'GET') payload = []
    else if (path === '/api/iam/users') payload = [{ id: 'u2', name: 'Ana', companyId: 'c1', accessStatus: 'Active', permissions: [] }]
    else if (path === '/api/alerts') payload = [{ id: 'a1', workFrontId: 'f1', parameter: 'PM10', severity: 'Critical', measuredValue: 50, limitValue: 35, unit: 'µg/m³', raisedAt: '2026-11-14T00:00:00Z' }]
    else if (path === '/api/incidents' && options.method === 'POST') payload = incident()
    else if (path.endsWith('/assignment')) { status = 'Assigned'; payload = { ...incident(), responsibleUserId: 'u2', responsibleName: 'Ana' } }
    else if (path.endsWith('/actions') && options.method === 'POST') { actions = [{ id: 'x1', description: body.description, assignedAt: '2026-11-14T00:00:00Z', status: 'Assigned' }]; payload = actions[0] }
    else if (path.endsWith('/start')) { actions[0].status = 'InProgress'; payload = actions[0] }
    else if (path.endsWith('/execution')) { actions[0].status = 'Executed'; payload = actions[0] }
    else if (path.endsWith('/evidence') && options.method === 'POST') { evidence = [{ id: 'e1', notes: body.notes, fileUrl: body.fileUrl, recordedAt: '2026-11-14T00:00:00Z' }]; payload = evidence[0] }
    else if (path.endsWith('/resolution')) { status = 'Attended'; payload = incident() }
    else if (path.endsWith('/closure')) { status = 'Closed'; payload = incident() }
    else if (path === '/api/incidents/i1') payload = incident()
    else assert.fail(`Unexpected request ${path}`)
    return { ok: true, status: 200, json: async () => payload }
  }
  const api = createIncidentBackendRepository({ baseUrl: 'http://localhost/api/', getCompanyId: () => 'c1', getToken: () => 'token', getCurrentUser: () => ({ id: 'u1' }), fetchImpl })
  assert.deepEqual(await api.list(), [])
  const reference = await api.referenceData()
  assert.equal(reference.alerts[0].sectionId, 's1')
  assert.equal((await api.create('a1', 'Polvo')).status, 'pending')
  assert.deepEqual(calls.find((call) => call.path === '/api/incidents' && call.method === 'POST').body, { companyId: 'c1', alertId: 'a1', projectId: 'p1', sectionId: 's1', title: 'PM10', description: 'Polvo', severity: 'Critical', openedBy: 'u1' })
  assert.equal((await api.assign('i1', 'u2')).status, 'in_progress')
  assert.deepEqual(calls.find((call) => call.path.endsWith('/assignment')).body, { userId: 'u2', userName: 'Ana' })
  assert.equal((await api.addAction('i1', 'Regar vía')).actions.length, 1)
  assert.equal((await api.startAction('i1', 'x1')).actions[0].status, 'inprogress')
  assert.equal((await api.executeAction('i1', 'x1')).actions[0].status, 'executed')
  assert.equal((await api.addEvidence('i1', 'Foto', 'https://example.com/foto.jpg')).evidence[0].note, 'Foto')
  assert.deepEqual(calls.find((call) => call.path.endsWith('/evidence')).body, { notes: 'Foto', fileUrl: 'https://example.com/foto.jpg', registeredBy: 'u1' })
  assert.equal((await api.resolve('i1')).status, 'resolved')
  assert.equal((await api.close('i1')).status, 'closed')
  assert.deepEqual(calls.find((call) => call.path.endsWith('/closure')).body, { closedBy: 'u1', notes: null })
})
