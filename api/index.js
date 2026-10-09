import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'

// A single Vercel Function keeps the local fake API routes under /api/*.
// Data stored in memory remains temporary between function instances.
const api = createFakeCommercialApi({ portableDemoSessions: true })

export default function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const route = url.searchParams.get('route')
  if (route) {
    url.searchParams.delete('route')
    request.url = `/api/${route}${url.search}`
  } else if (!url.pathname.startsWith('/api/') || url.pathname === '/api/index') {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Ruta de API no encontrada.' }))
    return
  }

  return new Promise((resolve) => {
    response.once('finish', resolve)
    response.once('close', resolve)
    api.emit('request', request, response)
  })
}
