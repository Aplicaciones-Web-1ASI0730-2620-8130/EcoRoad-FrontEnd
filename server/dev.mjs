import { createServer as createViteServer } from 'vite'
import { createFakeCommercialApi } from './fake-commercial-api.mjs'

const port = Number(process.env.FAKE_API_PORT || 3001)
const api = createFakeCommercialApi()
await new Promise((resolve, reject) => {
  api.once('error', reject)
  api.listen(port, '127.0.0.1', resolve)
})

try {
  const vite = await createViteServer({ configLoader: 'native' })
  await vite.listen()
  vite.printUrls()
  console.log(`Fake API: http://127.0.0.1:${port}/api/health`)

  async function shutdown() {
    await vite.close()
    api.close()
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
} catch (error) {
  api.close()
  throw error
}
