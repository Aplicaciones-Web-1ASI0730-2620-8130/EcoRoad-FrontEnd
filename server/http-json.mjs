export function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

export async function readJson(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 1_000_000) throw Object.assign(new Error('Solicitud demasiado grande.'), { status: 413 })
  }
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    throw Object.assign(new Error('JSON inválido.'), { status: 400 })
  }
}
