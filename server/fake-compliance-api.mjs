import { randomUUID } from 'node:crypto'
import { canAccessOperationalModules } from '../src/commercial/domain/commercial-model.js'
import { buildReportPreview, validateReportCriteria } from '../src/compliance/domain/report-preview.js'
import { readJson, sendJson } from './http-json.mjs'

export function createFakeComplianceRoutes({ subscriptions, projects, monitoring, alerting }) {
  const reportsByCompany = new Map()
  const projectList = (companyId) => projects.listProjects(companyId)
  const sourceFor = (companyId) => ({
    projects: projectList(companyId),
    readings: monitoring.listReadings(companyId),
    alerts: alerting.listAlerts(companyId),
  })

  return async (request, response, path) => {
    const companyId = request.headers['x-demo-company-id']
    if (!companyId || Array.isArray(companyId)) return sendJson(response, 400, { code: 'COMPANY_REQUIRED', message: 'Selecciona una empresa.' })
    if (!canAccessOperationalModules(subscriptions.get(companyId))) return sendJson(response, 403, { code: 'SUBSCRIPTION_REQUIRED', message: 'La empresa necesita una suscripción activa para consultar reportes.' })

    if (path === '/api/compliance/projects' && request.method === 'GET') return sendJson(response, 200, projectList(companyId))

    if (path === '/api/compliance/previews' && request.method === 'POST') {
      const criteria = await readJson(request)
      const errors = validateReportCriteria(criteria || {}, projectList(companyId))
      if (Object.keys(errors).length) return sendJson(response, 422, { code: 'INVALID_REPORT_CRITERIA', message: 'Revisa la configuración del reporte.', errors })
      return sendJson(response, 200, buildReportPreview(criteria, sourceFor(companyId)))
    }

    if (path === '/api/compliance/reports') {
      if (request.method === 'GET') {
        const projectId = new URL(request.url, 'http://localhost').searchParams.get('projectId')
        const reports = (reportsByCompany.get(companyId) || []).filter((item) => !projectId || item.preview.project.id === projectId)
        return sendJson(response, 200, reports.map(({ preview, ...item }) => ({ ...item, project: preview.project, period: preview.period })))
      }
      if (request.method === 'POST') {
        const criteria = await readJson(request)
        const errors = validateReportCriteria(criteria || {}, projectList(companyId))
        if (Object.keys(errors).length) return sendJson(response, 422, { code: 'INVALID_REPORT_CRITERIA', message: 'Revisa la configuración del reporte.', errors })
        const preview = buildReportPreview(criteria, sourceFor(companyId))
        // Snapshot is copied on creation and never updated by subsequent source changes.
        const report = { id: randomUUID(), createdAt: new Date().toISOString(), simulation: true, preview: structuredClone(preview) }
        reportsByCompany.set(companyId, [report, ...(reportsByCompany.get(companyId) || [])])
        return sendJson(response, 201, report)
      }
      return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    }

    const match = /^\/api\/compliance\/reports\/([^/]+)$/.exec(path)
    if (match) {
      if (request.method !== 'GET') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
      const report = (reportsByCompany.get(companyId) || []).find((item) => item.id === decodeURIComponent(match[1]))
      return report
        ? sendJson(response, 200, report)
        : sendJson(response, 404, { code: 'REPORT_NOT_FOUND', message: 'Reporte no encontrado.' })
    }
    return sendJson(response, 404, { code: 'NOT_FOUND', message: 'Ruta de reportes no encontrada.' })
  }
}
