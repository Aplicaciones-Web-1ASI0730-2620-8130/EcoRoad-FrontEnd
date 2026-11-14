import { createProjectBackendRepository } from '../../projects/infrastructure/project-backend-repository.js'
import { createIamBackendRepository } from '../../iam/infrastructure/iam-backend-repository.js'
import { createAlertingBackendRepository } from '../../alerting/infrastructure/alerting-backend-repository.js'

const statuses = { Open: 'pending', Assigned: 'in_progress', Attended: 'resolved', Closed: 'closed' }
const risk = (severity) => severity === 'Critical' ? 'critical' : 'observation'
const path = (id, suffix = '') => `incidents/${encodeURIComponent(id)}${suffix ? `/${suffix}` : ''}`

export function createIncidentBackendRepository({ baseUrl, getCompanyId, getToken, getCurrentUser, fetchImpl = globalThis.fetch }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projects = createProjectBackendRepository({ baseUrl, getCompanyId, fetchImpl })
  const iam = createIamBackendRepository({ baseUrl, getToken, fetchImpl })
  const alerting = createAlertingBackendRepository({ baseUrl, getCompanyId, fetchImpl })
  let locations = new Map()
  let alerts = []
  let collaborators = []
  const actor = () => {
    const id = getCurrentUser()?.id
    if (!id) throw new Error('Inicia sesión para gestionar incidentes.')
    return id
  }
  async function request(endpoint, { method = 'GET', body } = {}) {
    const response = await fetchImpl(new URL(endpoint, root), {
      method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La operación de incidentes falló (HTTP ${response.status}).`)
    return payload
  }
  async function loadLocations() {
    const owned = await projects.listProjects()
    locations = new Map(owned.flatMap((project) => project.sections.map((section) => [section.id, {
      projectId: project.id, projectName: project.name, sectionName: section.name,
    }])))
  }
  const normalize = (incident) => {
    const location = locations.get(incident.sectionId)
    return {
      ...incident, projectName: location?.projectName || 'Proyecto no disponible',
      sectionName: location?.sectionName || 'Tramo no disponible',
      risk: risk(incident.severity), status: statuses[incident.status] || 'pending',
      assignee: incident.responsibleUserId ? { id: incident.responsibleUserId, name: incident.responsibleName || 'Responsable' } : null,
      actions: (incident.correctiveActions || []).map((action) => ({ ...action, recordedAt: action.assignedAt, status: action.status?.toLowerCase() })),
      evidence: (incident.fieldEvidences || []).map((item) => ({ ...item, note: item.notes })),
    }
  }
  const refresh = async (id) => normalize(await request(path(id)))
  const actionPath = (id, actionId, operation) => `${path(id, 'actions')}/${encodeURIComponent(actionId)}/${operation}`
  return {
    async list() {
      await loadLocations()
      return (await request(`incidents?companyId=${encodeURIComponent(getCompanyId())}`)).map(normalize)
    },
    async referenceData() {
      const [users, activeAlerts] = await Promise.all([iam.listUsers(), alerting.listAlerts()])
      collaborators = users
      alerts = activeAlerts
      return { collaborators: users, alerts: activeAlerts }
    },
    get: refresh,
    async create(alertId, description) {
      const alert = alerts.find((item) => item.id === alertId)
      if (!alert) throw new Error('Selecciona una alerta activa de tu empresa.')
      return normalize(await request('incidents', { method: 'POST', body: {
        companyId: getCompanyId(), alertId, projectId: alert.projectId, sectionId: alert.sectionId,
        title: alert.indicator, description, severity: alert.risk === 'critical' ? 'Critical' : 'Warning', openedBy: actor(),
      } }))
    },
    async assign(id, userId) {
      const user = collaborators.find((item) => item.id === userId)
      if (!user) throw new Error('Selecciona un colaborador de tu empresa.')
      return normalize(await request(path(id, 'assignment'), { method: 'POST', body: { userId, userName: user.name } }))
    },
    async addAction(id, description) {
      await request(path(id, 'actions'), { method: 'POST', body: { description, assignedBy: actor() } })
      return refresh(id)
    },
    async startAction(id, actionId) {
      await request(actionPath(id, actionId, 'start'), { method: 'POST' })
      return refresh(id)
    },
    async executeAction(id, actionId) {
      await request(actionPath(id, actionId, 'execution'), { method: 'POST' })
      return refresh(id)
    },
    async addEvidence(id, note, fileUrl = null) {
      await request(path(id, 'evidence'), { method: 'POST', body: { notes: note, fileUrl: fileUrl || null, registeredBy: actor() } })
      return refresh(id)
    },
    async resolve(id) { return normalize(await request(path(id, 'resolution'), { method: 'POST' })) },
    async close(id) { return normalize(await request(path(id, 'closure'), { method: 'POST', body: { closedBy: actor(), notes: null } })) },
  }
}
