export class AssetApiError extends Error {
  constructor(message, status, code = null, errors = null) {
    super(message)
    this.name = 'AssetApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export function createAssetApiRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  if (!baseUrl) throw new Error('Asset API baseUrl is required.')
  if (typeof fetchImpl !== 'function' || typeof getCompanyId !== 'function') throw new Error('Fetch and getCompanyId are required.')
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  async function request(path, method = 'GET', body) {
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', 'X-Demo-Company-Id': getCompanyId(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const payload = await response.json()
    if (!response.ok) throw new AssetApiError(payload?.message || 'La operación de activos falló.', response.status, payload?.code, payload?.errors)
    return payload
  }

  return {
    listProjects: () => request('assets/projects'),
    listPoints: (projectId) => request(`assets/points${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    createPoint: (input) => request('assets/points', 'POST', input),
    updatePoint: (id, input) => request(`assets/points/${encodeURIComponent(id)}`, 'PUT', input),
    deletePoint: (id) => request(`assets/points/${encodeURIComponent(id)}`, 'DELETE'),
    listSensors: (filters = {}) => request(`assets/sensors?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== 'all'))}`),
    getSensor: (id) => request(`assets/sensors/${encodeURIComponent(id)}`),
    registerSensor: (input) => request('assets/sensors', 'POST', input),
    assignSensor: (id, pointId) => request(`assets/sensors/${encodeURIComponent(id)}/assignment`, 'POST', { pointId }),
    calibrateSensor: (id, validUntil) => request(`assets/sensors/${encodeURIComponent(id)}/calibration`, 'POST', { validUntil }),
    activateSensor: (id) => request(`assets/sensors/${encodeURIComponent(id)}/activation`, 'POST'),
    deactivateSensor: (id) => request(`assets/sensors/${encodeURIComponent(id)}/deactivation`, 'POST'),
    releaseSensor: (id) => request(`assets/sensors/${encodeURIComponent(id)}/release`, 'POST'),
  }
}
