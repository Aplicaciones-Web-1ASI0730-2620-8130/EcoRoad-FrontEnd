import { canAccessOperationalModules } from '../src/commercial/domain/commercial-model.js'
import { assignResponsible, closeIncident, filterIncidents, IncidentPolicyError, openIncident, recordCorrectiveAction, recordFieldEvidence, resolveIncident } from '../src/incidents/domain/incident.js'
import { createDemoIncidents } from '../src/incidents/infrastructure/incident-fixtures.js'
import { readJson, sendJson as send } from './http-json.mjs'
import { createHash } from 'node:crypto'

const readPermissions = ['manage_incidents', 'corrective_actions', 'field_evidence']
const errorStatuses = {
  PERMISSION_REQUIRED: 403, CROSS_COMPANY_FORBIDDEN: 403,
  ALERT_REQUIRED: 422, DESCRIPTION_REQUIRED: 422, EVIDENCE_REQUIRED: 422, INVALID_ASSIGNEE: 422,
  INVALID_STATUS: 409, REMEDIATION_INCOMPLETE: 409,
}

export function createFakeIncidentRoutes({ subscriptions, alerting, iam, includeExample = true }) {
  const incidentsByCompany = new Map()
  const evidenceFiles = new Map()
  if (includeExample) incidentsByCompany.set('demo-company', createDemoIncidents())

  return async function handle(request, response, path) {
    const auth = iam.authenticate(request)
    if (!auth) return send(response, 401, { code: 'SESSION_REQUIRED', message: 'Inicia sesión para gestionar incidentes.' })
    const companyId = request.headers['x-demo-company-id']
    if (typeof companyId !== 'string' || companyId !== auth.user.companyId) return send(response, 403, { code: 'COMPANY_FORBIDDEN', message: 'No puedes consultar otra empresa.' })
    if (!canAccessOperationalModules(subscriptions.get(companyId))) return send(response, 403, { code: 'SUBSCRIPTION_REQUIRED', message: 'La empresa necesita una suscripción activa.' })
    if (!readPermissions.some((permission) => auth.user.permissions.includes(permission))) return send(response, 403, { code: 'PERMISSION_REQUIRED', message: 'No tienes permiso para consultar incidentes.' })

    const incidents = incidentsByCompany.get(companyId) || []
    const fileMatch = /^\/api\/incidents\/([^/]+)\/evidence\/([^/]+)\/file$/.exec(path)
    if (fileMatch && request.method === 'GET') {
      const incident = incidents.find((item) => item.id === decodeURIComponent(fileMatch[1]))
      const evidence = incident?.evidence.find((item) => item.id === decodeURIComponent(fileMatch[2]))
      const file = evidence && evidenceFiles.get(evidence.id)
      if (!file) return send(response, 404, { code: 'EVIDENCE_FILE_NOT_FOUND', message: 'Archivo de evidencia no encontrado.' })
      const filename = evidence.attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      response.writeHead(200, { 'Content-Type': evidence.attachment.mimeType, 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': file.length })
      return response.end(file)
    }
    if (path === '/api/incidents/reference-data' && request.method === 'GET') {
      return send(response, 200, { alerts: alerting.listAlerts(companyId), collaborators: iam.listUsers(companyId).filter((user) => user.access.status === 'active') })
    }
    if (path === '/api/incidents') {
      if (request.method === 'GET') {
        const query = new URL(request.url, 'http://localhost').searchParams
        return send(response, 200, filterIncidents(incidents, { status: query.get('status') || 'all', projectId: query.get('projectId') || 'all', search: query.get('search') || '' }))
      }
      if (request.method === 'POST') {
        const { alertId, description } = await readJson(request)
        const alert = alerting.listAlerts(companyId).find((item) => item.id === alertId)
        if (!alert) return send(response, 404, { code: 'ALERT_NOT_FOUND', message: 'Alerta no encontrada en esta empresa.' })
        if (incidents.some((item) => item.alertId === alertId)) return send(response, 409, { code: 'DUPLICATE_ALERT', message: 'Esta alerta ya tiene un incidente vinculado.' })
        try {
          const created = openIncident({ alert, companyId, description }, auth.user)
          incidentsByCompany.set(companyId, [created, ...incidents])
          return send(response, 201, created)
        } catch (error) { return policyError(response, error) }
      }
      return send(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' })
    }

    const match = /^\/api\/incidents\/([^/]+)(?:\/(assignment|actions|evidence|resolution|closure))?$/.exec(path)
    if (!match) return send(response, 404, { code: 'NOT_FOUND', message: 'Ruta de incidentes no encontrada.' })
    const id = decodeURIComponent(match[1])
    const index = incidents.findIndex((item) => item.id === id)
    if (index < 0) return send(response, 404, { code: 'INCIDENT_NOT_FOUND', message: 'Incidente no encontrado.' })
    if (!match[2] && request.method === 'GET') return send(response, 200, incidents[index])
    if (!match[2] || request.method !== 'POST') return send(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' })

    const operation = match[2]
    const input = ['assignment', 'actions', 'evidence'].includes(operation) ? await readJson(request) : {}
    try {
      const current = incidents[index]
      const attachment = operation === 'evidence' ? parseAttachment(input.attachment) : null
      if (attachment?.error) return send(response, 422, { code: 'INVALID_ATTACHMENT', message: attachment.error })
      const changed = operation === 'assignment'
        ? assignResponsible(current, iam.listUsers(companyId).find((user) => user.id === input.userId), auth.user)
        : operation === 'actions' ? recordCorrectiveAction(current, input.description, auth.user)
          : operation === 'evidence' ? recordFieldEvidence(current, input.note, auth.user, new Date(), attachment?.metadata || null)
            : operation === 'resolution' ? resolveIncident(current, auth.user)
              : closeIncident(current, auth.user)
      incidents[index] = changed
      if (attachment?.buffer) evidenceFiles.set(changed.evidence.at(-1).id, attachment.buffer)
      incidentsByCompany.set(companyId, incidents)
      return send(response, 200, changed)
    } catch (error) { return policyError(response, error) }
  }
}

function parseAttachment(input) {
  if (input == null) return null
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 ||
    !['image/png', 'image/jpeg', 'application/pdf'].includes(input.mimeType) ||
    typeof input.dataBase64 !== 'string' || input.dataBase64.length > 2_800_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(input.dataBase64)) return { error: 'Adjunta un PNG, JPG o PDF válido de hasta 2 MB.' }
  const buffer = Buffer.from(input.dataBase64, 'base64')
  if (!buffer.length || buffer.length > 2_000_000) return { error: 'El archivo debe tener hasta 2 MB.' }
  return { buffer, metadata: { name: input.name.trim(), mimeType: input.mimeType, size: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') } }
}

function policyError(response, error) {
  if (!(error instanceof IncidentPolicyError)) throw error
  return send(response, errorStatuses[error.code] || 422, { code: error.code, message: error.message })
}
