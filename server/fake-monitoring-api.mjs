import { DEMO_READINGS, DEMO_THRESHOLD_PROFILES, MONITORING_PROJECTS } from '../src/monitoring/infrastructure/monitoring-fixtures.js'
import { filterEnvironmentalHistory, summarizeMonitoring, validateHistoryFilters } from '../src/monitoring/domain/environmental-reading.js'
import { canAccessOperationalModules } from '../src/commercial/domain/commercial-model.js'
import { sendJson } from './http-json.mjs'

export function createFakeMonitoringRoutes({ subscriptions, includeExample = true }) {
  const projects = includeExample ? MONITORING_PROJECTS : []
  const readings = includeExample ? DEMO_READINGS : []
  const handleMonitoringRequest = async (request, response, path) => {
    const companyId = request.headers['x-demo-company-id']
    if (!companyId || Array.isArray(companyId)) return sendJson(response, 400, { code: 'COMPANY_REQUIRED', message: 'Selecciona una empresa.' })
    if (!canAccessOperationalModules(subscriptions.get(companyId))) return sendJson(response, 403, { code: 'SUBSCRIPTION_REQUIRED', message: 'La empresa necesita una suscripción activa para consultar monitoreo.' })

    if (path === '/api/monitoring/projects' && request.method === 'GET') return sendJson(response, 200, projects)
    const match = /^\/api\/monitoring\/projects\/([^/]+)(?:\/(dashboard|history))?$/.exec(path)
    if (!match) return sendJson(response, 404, { code: 'NOT_FOUND', message: 'Ruta de monitoreo no encontrada.' })
    const projectId = decodeURIComponent(match[1])
    const project = projects.find((item) => item.id === projectId)
    if (!project) return sendJson(response, 404, { code: 'MONITORING_PROJECT_NOT_FOUND', message: 'Proyecto de monitoreo no encontrado.' })
    const operation = match[2]
    if (operation === 'dashboard' && request.method === 'GET') {
      const projectReadings = readings.filter((reading) => reading.projectId === projectId)
      return sendJson(response, 200, { project, ...summarizeMonitoring(project, projectReadings, DEMO_THRESHOLD_PROFILES) })
    }
    if (operation === 'history' && request.method === 'GET') {
      const url = new URL(request.url, 'http://localhost')
      const filters = { projectId, sectionId: url.searchParams.get('sectionId') || 'all', parameterId: url.searchParams.get('parameterId') || 'pm10', from: url.searchParams.get('from') || '', to: url.searchParams.get('to') || '' }
      const validationError = validateHistoryFilters(filters)
      if (validationError) return sendJson(response, 422, { code: 'INVALID_HISTORY_FILTERS', message: validationError })
      return sendJson(response, 200, { project, parameterId: filters.parameterId, readings: filterEnvironmentalHistory(readings, filters) })
    }
    return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación de monitoreo no permitida.' })
  }
  handleMonitoringRequest.listReadings = (companyId) => companyId === 'demo-company' ? [...readings] : []
  return handleMonitoringRequest
}
