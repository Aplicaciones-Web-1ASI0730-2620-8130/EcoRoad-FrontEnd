export class MonitoringApiError extends Error {
  constructor(message, status, code = null) {
    super(message)
    this.name = 'MonitoringApiError'
    this.status = status
    this.code = code
  }
}

export function createMonitoringApiRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  if (!baseUrl) throw new Error('Monitoring API baseUrl is required.')
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.')
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path) {
    const response = await fetchImpl(new URL(path, root), { headers: { Accept: 'application/json', 'X-Demo-Company-Id': getCompanyId() } })
    const payload = await response.json()
    if (!response.ok) throw new MonitoringApiError(payload?.message || 'La operación de monitoreo falló.', response.status, payload?.code)
    return payload
  }
  return {
    listProjects: () => request('monitoring/projects'),
    getDashboard: (projectId) => request(`monitoring/projects/${encodeURIComponent(projectId)}/dashboard`),
    getHistory: ({ projectId, sectionId, parameterId, from, to }) => {
      const query = new URLSearchParams({ sectionId, parameterId, from, to })
      return request(`monitoring/projects/${encodeURIComponent(projectId)}/history?${query}`)
    },
  }
}
