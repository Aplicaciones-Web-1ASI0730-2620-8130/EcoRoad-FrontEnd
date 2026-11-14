import { createProjectBackendRepository } from '../../projects/infrastructure/project-backend-repository.js'

function fromBackend(alert, fronts) {
  const location = fronts.get(alert.workFrontId)
  return {
    id: alert.id,
    projectId: location?.projectId || '', projectName: location?.projectName || 'Proyecto no disponible',
    sectionId: location?.sectionId || '', sectionName: location?.sectionName || 'Tramo no disponible',
    indicator: alert.parameter, value: alert.measuredValue, unit: alert.unit,
    thresholdLabel: `${alert.limitValue} ${alert.unit}`,
    risk: alert.severity?.toLowerCase() === 'critical' ? 'critical' : 'observation',
    status: alert.status?.toLowerCase() === 'acknowledged' ? 'acknowledged' : 'active',
    detectedAt: alert.raisedAt, acknowledgedAt: alert.acknowledgedAt, acknowledgedBy: alert.acknowledgedBy,
    workFrontId: alert.workFrontId, timeBand: alert.timeBand,
  }
}

export function createAlertingBackendRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projects = createProjectBackendRepository({ baseUrl, fetchImpl, getCompanyId })
  let fronts = new Map()
  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetchImpl(new URL(path, root), {
      method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La operación de alertas falló (HTTP ${response.status}).`)
    return payload
  }
  return {
    activeOnly: true,
    async listAlerts() {
      const ownedProjects = await projects.listProjects()
      fronts = new Map(ownedProjects.flatMap((project) => project.sections.flatMap((section) =>
        (section.workFronts || []).map((front) => [front.id, { projectId: project.id, projectName: project.name, sectionId: section.id, sectionName: section.name }]))))
      const alerts = await request('alerts')
      return alerts.filter((alert) => fronts.has(alert.workFrontId)).map((alert) => fromBackend(alert, fronts))
    },
    acknowledgeAlert: async (id, acknowledgedBy) => fromBackend(await request(`alerts/${encodeURIComponent(id)}/acknowledgement`, {
      method: 'POST', body: { acknowledgedBy },
    }), fronts),
  }
}
