import { createFakeCommercialApi } from './fake-commercial-api.mjs'

const port = Number(process.env.FAKE_API_PORT || 3001)
createFakeCommercialApi().listen(port, '127.0.0.1', () => {
  console.log(`Fake Commercial API: http://127.0.0.1:${port}/api/health`)
})

