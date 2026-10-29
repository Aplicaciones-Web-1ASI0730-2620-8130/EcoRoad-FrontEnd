export class ComplianceApiError extends Error {
  constructor(message, status, code = null, errors = null) {
    super(message)
    this.name = 'ComplianceApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export function createComplianceApiRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  if (!baseUrl || typeof fetchImpl !== 'function' || typeof getCompanyId !== 'function') throw new Error('Compliance API requires a base URL, fetch and a company provider.')
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path, method = 'GET', body) {
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', 'X-Demo-Company-Id': getCompanyId(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const payload = await response.json()
    if (!response.ok) throw new ComplianceApiError(payload?.message || 'La operación de reportes falló.', response.status, payload?.code, payload?.errors)
    return payload
  }
  return {
    listProjects: () => request('compliance/projects'),
    previewReport: (criteria) => request('compliance/previews', 'POST', criteria),
    generateReport: (criteria) => request('compliance/reports', 'POST', criteria),
    listReports: (projectId) => request(`compliance/reports${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    getReport: (id) => request(`compliance/reports/${encodeURIComponent(id)}`),
  }
}
