import { createProjectBackendRepository } from '../../projects/infrastructure/project-backend-repository.js'

const parameters = ['AirQuality', 'NoiseLevel', 'WaterQuality', 'Vibration']
const uniqueIds = (items) => [...new Set(items.map((item) => item.id).filter(Boolean))]

export function createComplianceBackendRepository({ baseUrl, getCompanyId, getCurrentUser, fetchImpl = globalThis.fetch }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projects = createProjectBackendRepository({ baseUrl, getCompanyId, fetchImpl })
  async function request(path, { method = 'GET', body, pdf = false } = {}) {
    const response = await fetchImpl(new URL(path, root), {
      method, headers: { Accept: pdf ? 'application/pdf' : 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const problem = await response.json().catch(() => null)
      throw new Error(problem?.message || `La operación de reportes falló (HTTP ${response.status}).`)
    }
    return pdf ? response.blob() : response.json()
  }
  async function ownedProject(projectId) {
    return projects.getProject(projectId)
  }
  return {
    listProjects: projects.listProjects,
    async collectEvidence({ projectId, from, to }) {
      const project = await ownedProject(projectId)
      const query = new URLSearchParams({ companyId: getCompanyId(), projectId })
      const history = parameters.map((parameterType) => {
        const filters = new URLSearchParams({ parameterType, from, to })
        return request(`monitoring/projects/${encodeURIComponent(projectId)}/history?${filters}`)
      })
      const [incidents, alerts, ...measurements] = await Promise.all([
        request(`incidents?${query}`), request('alerts'), ...history,
      ])
      const frontIds = new Set(project.sections.flatMap((section) => (section.workFronts || []).map((front) => front.id)))
      const activeAlerts = alerts.filter((alert) => frontIds.has(alert.workFrontId) && alert.raisedAt?.slice(0, 10) >= from && alert.raisedAt?.slice(0, 10) <= to)
      const matchingIncidents = incidents.filter((incident) => incident.companyId === getCompanyId() && incident.projectId === projectId && incident.openedAt?.slice(0, 10) >= from && incident.openedAt?.slice(0, 10) <= to)
      return {
        project, period: { from, to },
        monitoringRecordIds: uniqueIds(measurements.flat()), alertIds: uniqueIds(activeAlerts),
        incidentIds: uniqueIds(matchingIncidents),
        fieldEvidenceIds: uniqueIds(matchingIncidents.flatMap((incident) => (incident.fieldEvidences || []).filter((item) => item.recordedAt?.slice(0, 10) >= from && item.recordedAt?.slice(0, 10) <= to))),
      }
    },
    async requestReport(projectId) {
      await ownedProject(projectId)
      const requestedBy = getCurrentUser()?.id
      if (!requestedBy) throw new Error('Inicia sesión para solicitar un reporte.')
      return request('compliance-reports', { method: 'POST', body: { scope: 'Project', subjectId: projectId, requestedBy } })
    },
    generateReport: (id, evidence, digitalSignature) => request(`compliance-reports/${encodeURIComponent(id)}/generation`, {
      method: 'POST', body: { monitoringRecordIds: evidence.monitoringRecordIds, alertIds: evidence.alertIds,
        incidentIds: evidence.incidentIds, fieldEvidenceIds: evidence.fieldEvidenceIds, digitalSignature },
    }),
    getReport: (id) => request(`compliance-reports/${encodeURIComponent(id)}`),
    downloadDocument: (id) => request(`compliance-reports/${encodeURIComponent(id)}/document`, { pdf: true }),
  }
}
