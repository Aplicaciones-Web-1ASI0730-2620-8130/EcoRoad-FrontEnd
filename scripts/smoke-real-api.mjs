// Read-only verification of the running EcoRoad backend and, optionally, the Vite proxy.
const api = (process.env.ECOROAD_API_URL || 'http://127.0.0.1:5080').replace(/\/$/, '')
const frontend = process.env.ECOROAD_FRONTEND_URL?.replace(/\/$/, '')
const token = process.env.ECOROAD_TOKEN
let failed = false

async function check(label, url, validate, { authorized = false } = {}) {
  try {
    const response = await fetch(url, { headers: authorized && token ? { Authorization: `Bearer ${token}` } : {} })
    const body = await response.json()
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body?.message || 'error'}`)
    if (!validate(body)) throw new Error('La respuesta no coincide con el contrato esperado.')
    console.log(`OK  ${label}`)
    return body
  } catch (error) {
    failed = true
    console.error(`ERR ${label}: ${error.message}`)
    return null
  }
}

await check('OpenAPI', `${api}/openapi/v1.json`, (body) => body.openapi && body.paths)
const projects = await check('Proyectos', `${api}/api/projects`, Array.isArray)
await check('Perfiles de umbral', `${api}/api/monitoring/threshold-profiles`, Array.isArray)
await check('Puntos de monitoreo', `${api}/api/assets/points`, Array.isArray)
await check('Sensores', `${api}/api/assets/sensors`, Array.isArray)
await check('Alertas activas', `${api}/api/alerts`, Array.isArray)

if (projects?.length) {
  const projectId = encodeURIComponent(projects[0].id)
  await check('Dashboard de proyecto', `${api}/api/monitoring/projects/${projectId}/dashboard`, (body) => body.projectId === projects[0].id && Array.isArray(body.parameters) && Array.isArray(body.sections))
  await check('Historial de mediciones', `${api}/api/monitoring/projects/${projectId}/history?parameterType=AirQuality`, Array.isArray)
} else if (projects) console.log('INFO No hay proyectos; se omiten dashboard e historial.')

if (token) await check('Sesión IAM', `${api}/api/iam/sessions/current`, (body) => Boolean(body.id && body.companyId), { authorized: true })
else console.log('INFO Sesión IAM omitida; configura ECOROAD_TOKEN si quieres verificarla.')

if (frontend) {
  try {
    const page = await fetch(frontend)
    if (!page.ok || !(await page.text()).includes('<div id="app"')) throw new Error(`HTTP ${page.status} o respuesta inesperada`)
    console.log('OK  Aplicación Vite')
  } catch (error) { failed = true; console.error(`ERR Aplicación Vite: ${error.message}`) }
  await check('Proxy /api de Vite', `${frontend}/api/projects`, Array.isArray)
}

process.exitCode = failed ? 1 : 0
