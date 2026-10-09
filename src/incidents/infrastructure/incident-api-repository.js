export class IncidentApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'IncidentApiError'
    this.status = status
    this.code = code
  }
}

export function createIncidentApiRepository({ baseUrl, getCompanyId, getToken, fetchImpl = globalThis.fetch }) {
  if (!baseUrl || typeof getCompanyId !== 'function' || typeof getToken !== 'function') throw new Error('Incident API configuration is required.')
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json', 'X-Demo-Company-Id': getCompanyId() }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const response = await fetchImpl(new URL(path, root), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const payload = await response.json()
    if (!response.ok) throw new IncidentApiError(payload.message || `Error de incidentes (HTTP ${response.status}).`, response.status, payload.code)
    return payload
  }
  const resource = (id, operation) => `incidents/${encodeURIComponent(id)}/${operation}`
  return {
    list: () => request('incidents'),
    referenceData: () => request('incidents/reference-data'),
    get: (id) => request(`incidents/${encodeURIComponent(id)}`),
    create: (alertId, description) => request('incidents', { method: 'POST', body: { alertId, description } }),
    assign: (id, userId) => request(resource(id, 'assignment'), { method: 'POST', body: { userId } }),
    addAction: (id, description) => request(resource(id, 'actions'), { method: 'POST', body: { description } }),
    addEvidence: (id, note, attachment = null) => request(resource(id, 'evidence'), { method: 'POST', body: { note, attachment } }),
    async downloadEvidence(id, evidenceId) {
      const response = await fetchImpl(new URL(`${resource(id, 'evidence')}/${encodeURIComponent(evidenceId)}/file`, root), {
        headers: { 'X-Demo-Company-Id': getCompanyId(), Authorization: `Bearer ${getToken() || ''}` },
      })
      if (!response.ok) {
        const payload = await response.json()
        throw new IncidentApiError(payload.message, response.status, payload.code)
      }
      return response.blob()
    },
    resolve: (id) => request(resource(id, 'resolution'), { method: 'POST' }),
    close: (id) => request(resource(id, 'closure'), { method: 'POST' }),
  }
}
