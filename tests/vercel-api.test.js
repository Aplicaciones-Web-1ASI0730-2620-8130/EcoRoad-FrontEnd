import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import handler from '../api/index.js'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { readJson } from '../server/http-json.mjs'

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${server.address().port}`
}

async function close(server) {
  await new Promise((resolve) => server.close(resolve))
}

test('Vercel API route serves JSON and demo sessions work in a new instance', async () => {
  const edge = createServer(handler)
  const freshInstance = createFakeCommercialApi({ portableDemoSessions: true })
  const edgeUrl = await listen(edge)
  const freshUrl = await listen(freshInstance)
  try {
    const health = await fetch(`${edgeUrl}/api/index?route=health`)
    assert.equal(health.status, 200)
    assert.equal((await health.json()).status, 'ok')

    const login = await fetch(`${edgeUrl}/api/index?route=iam/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: 'demo-company', email: 'c.mendoza@empresa.pe', password: 'EcoRoadDemo123!' }),
    })
    assert.equal(login.status, 201)
    const { token } = await login.json()
    assert.ok(token.startsWith('demo.'))

    const current = await fetch(`${freshUrl}/api/iam/sessions/current`, { headers: { Authorization: `Bearer ${token}` } })
    assert.equal(current.status, 200)
    assert.equal((await current.json()).user.id, 'usr-carlos')
  } finally {
    await close(edge)
    await close(freshInstance)
  }
})

test('JSON reader accepts an already parsed Vercel request body', async () => {
  assert.deepEqual(await readJson({ body: { companyId: 'demo-company' } }), { companyId: 'demo-company' })
})
