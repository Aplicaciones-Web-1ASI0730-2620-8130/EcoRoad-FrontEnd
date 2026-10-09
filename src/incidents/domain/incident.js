export const INCIDENT_STATUSES = Object.freeze({
  pending: { label: 'Pendiente', rank: 0 },
  in_progress: { label: 'En progreso', rank: 1 },
  resolved: { label: 'Resuelto', rank: 2 },
  closed: { label: 'Cerrado', rank: 3 },
})

export class IncidentPolicyError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'IncidentPolicyError'
    this.code = code
  }
}

function requirePermission(actor, incident, permission) {
  if (!actor?.permissions?.includes(permission)) throw new IncidentPolicyError('PERMISSION_REQUIRED', 'No tienes permiso para realizar esta acción.')
  if (actor.companyId !== incident.companyId) throw new IncidentPolicyError('CROSS_COMPANY_FORBIDDEN', 'No puedes gestionar incidentes de otra empresa.')
}

export function openIncident({ alert, companyId, description }, actor, now = new Date()) {
  if (!companyId || actor?.companyId !== companyId || !actor.permissions?.includes('manage_incidents')) throw new IncidentPolicyError('PERMISSION_REQUIRED', 'No tienes permiso para registrar este incidente.')
  if (!alert?.id || !alert.projectId || !alert.sectionId) throw new IncidentPolicyError('ALERT_REQUIRED', 'Selecciona una alerta válida.')
  if (!description?.trim()) throw new IncidentPolicyError('DESCRIPTION_REQUIRED', 'Describe el impacto ambiental observado.')
  return {
    id: globalThis.crypto.randomUUID(), companyId, alertId: alert.id,
    projectId: alert.projectId, projectName: alert.projectName,
    sectionId: alert.sectionId, sectionName: alert.sectionName,
    title: alert.indicator, description: description.trim(), risk: alert.risk,
    status: 'pending', openedAt: now.toISOString(), openedBy: actor.id,
    assignee: null, actions: [], evidence: [], resolvedAt: null, closedAt: null,
  }
}

export function assignResponsible(incident, user, actor) {
  requirePermission(actor, incident, 'manage_incidents')
  if (incident.status !== 'pending' && incident.status !== 'in_progress') throw new IncidentPolicyError('INVALID_STATUS', 'Solo se puede asignar un incidente pendiente o en progreso.')
  if (!user || user.companyId !== incident.companyId || user.access?.status !== 'active') throw new IncidentPolicyError('INVALID_ASSIGNEE', 'Selecciona un colaborador activo de la empresa.')
  return { ...incident, status: 'in_progress', assignee: { id: user.id, name: user.name } }
}

export function recordCorrectiveAction(incident, description, actor, now = new Date()) {
  requirePermission(actor, incident, 'corrective_actions')
  if (incident.status !== 'in_progress') throw new IncidentPolicyError('INVALID_STATUS', 'Asigna un responsable antes de registrar acciones.')
  if (!description?.trim()) throw new IncidentPolicyError('DESCRIPTION_REQUIRED', 'Describe la acción correctiva.')
  return { ...incident, actions: [...incident.actions, { id: globalThis.crypto.randomUUID(), description: description.trim(), recordedAt: now.toISOString(), recordedBy: actor.id }] }
}

export function recordFieldEvidence(incident, note, actor, now = new Date()) {
  requirePermission(actor, incident, 'field_evidence')
  if (incident.status !== 'in_progress') throw new IncidentPolicyError('INVALID_STATUS', 'La evidencia requiere un incidente en progreso.')
  if (!note?.trim()) throw new IncidentPolicyError('EVIDENCE_REQUIRED', 'Describe la evidencia de campo.')
  return { ...incident, evidence: [...incident.evidence, { id: globalThis.crypto.randomUUID(), note: note.trim(), recordedAt: now.toISOString(), recordedBy: actor.id }] }
}

export function resolveIncident(incident, actor, now = new Date()) {
  requirePermission(actor, incident, 'manage_incidents')
  if (incident.status !== 'in_progress') throw new IncidentPolicyError('INVALID_STATUS', 'Solo un incidente en progreso puede resolverse.')
  if (!incident.actions.length || !incident.evidence.length) throw new IncidentPolicyError('REMEDIATION_INCOMPLETE', 'Registra una acción correctiva y evidencia antes de resolver.')
  return { ...incident, status: 'resolved', resolvedAt: now.toISOString() }
}

export function closeIncident(incident, actor, now = new Date()) {
  requirePermission(actor, incident, 'manage_incidents')
  if (incident.status !== 'resolved') throw new IncidentPolicyError('INVALID_STATUS', 'Solo un incidente resuelto puede cerrarse.')
  return { ...incident, status: 'closed', closedAt: now.toISOString() }
}

export function filterIncidents(incidents, { status = 'all', projectId = 'all', search = '' } = {}) {
  const term = search.trim().toLocaleLowerCase('es')
  return incidents.filter((incident) =>
    (status === 'all' || incident.status === status) &&
    (projectId === 'all' || incident.projectId === projectId) &&
    (!term || `${incident.id} ${incident.title} ${incident.projectName} ${incident.sectionName}`.toLocaleLowerCase('es').includes(term)),
  ).sort((a, b) => INCIDENT_STATUSES[a.status].rank - INCIDENT_STATUSES[b.status].rank || b.openedAt.localeCompare(a.openedAt))
}
