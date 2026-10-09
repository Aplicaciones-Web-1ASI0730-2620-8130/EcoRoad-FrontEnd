import { acknowledgeAlert, filterAlerts } from '../src/alerting/domain/alert.js'
import { createDemoAlerts } from '../src/alerting/infrastructure/alert-fixtures.js'
import { canAccessOperationalModules } from '../src/commercial/domain/commercial-model.js'
import { readJson, sendJson } from './http-json.mjs'

export function createFakeAlertingRoutes({ subscriptions, includeExample = true }) {
  const alertsByCompany = new Map()
  if (includeExample) alertsByCompany.set('demo-company', createDemoAlerts())

  return async (request, response, path) => {
    const companyId = request.headers['x-demo-company-id']
    if (!companyId || Array.isArray(companyId)) return sendJson(response, 400, { code: 'COMPANY_REQUIRED', message: 'Selecciona una empresa.' })
    if (!canAccessOperationalModules(subscriptions.get(companyId))) {
      return sendJson(response, 403, { code: 'SUBSCRIPTION_REQUIRED', message: 'La empresa necesita una suscripción activa para consultar alertas.' })
    }

    const companyAlerts = alertsByCompany.get(companyId) || []
    if (path === '/api/alerts' && request.method === 'GET') {
      const query = new URL(request.url, 'http://localhost').searchParams
      const filters = {
        projectId: query.get('projectId') || 'all',
        risk: query.get('risk') || 'all',
        status: query.get('status') || 'all',
        search: query.get('search') || '',
      }
      return sendJson(response, 200, filterAlerts(companyAlerts, filters))
    }

    const match = /^\/api\/alerts\/([^/]+)(?:\/acknowledgments)?$/.exec(path)
    if (!match) return sendJson(response, 404, { code: 'NOT_FOUND', message: 'Ruta de alertas no encontrada.' })
    const id = decodeURIComponent(match[1])
    const index = companyAlerts.findIndex((alert) => alert.id === id)
    if (index < 0) return sendJson(response, 404, { code: 'ALERT_NOT_FOUND', message: 'Alerta no encontrada.' })

    if (path.endsWith('/acknowledgments') && request.method === 'POST') {
      const acknowledgedBy = (await readJson(request))?.acknowledgedBy
      if (typeof acknowledgedBy !== 'string' || !acknowledgedBy.trim() || acknowledgedBy.trim().length > 80) {
        return sendJson(response, 422, { code: 'INVALID_ACKNOWLEDGMENT', message: 'Indica quién atendió la alerta (máximo 80 caracteres).' })
      }
      if (companyAlerts[index].status !== 'active') return sendJson(response, 409, { code: 'ALREADY_ACKNOWLEDGED', message: 'La alerta ya fue atendida.' })
      const updated = acknowledgeAlert(companyAlerts[index], acknowledgedBy)
      companyAlerts[index] = updated
      alertsByCompany.set(companyId, companyAlerts)
      return sendJson(response, 200, updated)
    }
    if (!path.endsWith('/acknowledgments') && request.method === 'GET') return sendJson(response, 200, companyAlerts[index])
    return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación de alertas no permitida.' })
  }
}
