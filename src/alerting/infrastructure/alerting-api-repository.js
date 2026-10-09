export class AlertingApiError extends Error {
  constructor(message, status, code = null) {
    super(message)
    this.name = 'AlertingApiError'
    this.status = status
    this.code = code
  }
}

export function createAlertingApiRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  if (!baseUrl) throw new Error('Alerting API baseUrl is required.')
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.')
  if (typeof getCompanyId !== 'function') throw new Error('getCompanyId is required.')
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  async function request(path, options = {}) {
    const response = await fetchImpl(new URL(path, root), {
      ...options,
      headers: {
        Accept: 'application/json',
        'X-Demo-Company-Id': getCompanyId(),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    const payload = await response.json()
    if (!response.ok) throw new AlertingApiError(payload?.message || 'La operación de alertas falló.', response.status, payload?.code)
    return payload
  }

  return {
    listAlerts: () => request('alerts'),
    getAlert: (id) => request(`alerts/${encodeURIComponent(id)}`),
    acknowledgeAlert: (id, acknowledgedBy) => request(`alerts/${encodeURIComponent(id)}/acknowledgments`, {
      method: 'POST', body: JSON.stringify({ acknowledgedBy }),
    }),
  }
}
