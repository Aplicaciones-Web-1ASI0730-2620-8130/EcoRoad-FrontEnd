import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { sendJson as send, readJson } from './http-json.mjs'
import { createFakeProjectRoutes } from './fake-project-api.mjs'
import { createFakeMonitoringRoutes } from './fake-monitoring-api.mjs'
import { createFakeAlertingRoutes } from './fake-alerting-api.mjs'
import { createFakeAssetRoutes } from './fake-asset-api.mjs'
import { createFakeComplianceRoutes } from './fake-compliance-api.mjs'
import { createFakeIamRoutes } from './fake-iam-api.mjs'

const planIds = new Set(['base', 'professional', 'enterprise'])
const companyTypes = new Set(['construction', 'maintenance', 'supervision'])

function oneYearLater(date) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + 1)
  return next.toISOString()
}

export function createFakeCommercialApi({ includeExample = true } = {}) {
  const accounts = new Map()
  const subscriptions = new Map()
  const now = new Date().toISOString()

  if (includeExample) {
    accounts.set('demo-company', {
      id: 'demo-company',
      name: 'Consorcio Vial Sierra Central S.A.C.',
      ruc: '20601234567',
      type: 'construction',
      adminName: 'Ing. Carlos Mendoza Ruiz',
      adminEmail: 'c.mendoza@empresa.pe',
      professionalLicense: 'CIP #84920',
      registeredAt: now,
    })
    subscriptions.set('demo-company', {
      companyId: 'demo-company',
      planId: 'professional',
      status: 'active',
      activatedAt: now,
      expiresAt: oneYearLater(now),
    })
  }

  const handleProjects = createFakeProjectRoutes({ subscriptions, includeExample })
  const handleMonitoring = createFakeMonitoringRoutes({ subscriptions, includeExample })
  const handleAlerting = createFakeAlertingRoutes({ subscriptions, includeExample })
  const handleAssets = createFakeAssetRoutes({ subscriptions, projects: handleProjects, includeExample })
  const handleCompliance = createFakeComplianceRoutes({ subscriptions, projects: handleProjects, monitoring: handleMonitoring, alerting: handleAlerting })
  const iam = createFakeIamRoutes({ includeExample })

  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname
      if (path === '/api/health' && request.method === 'GET') {
        return send(response, 200, { status: 'ok', service: 'fake-commercial-api' })
      }
      if (path.startsWith('/api/iam/')) return await iam.handle(request, response, path)
      if (path === '/api/projects' || path.startsWith('/api/projects/')) {
        return await handleProjects(request, response, path)
      }
      if (path === '/api/monitoring/projects' || path.startsWith('/api/monitoring/projects/')) {
        return await handleMonitoring(request, response, path)
      }
      if (path === '/api/alerts' || path.startsWith('/api/alerts/')) {
        return await handleAlerting(request, response, path)
      }
      if (path === '/api/assets' || path.startsWith('/api/assets/')) {
        return await handleAssets(request, response, path)
      }
      if (path === '/api/compliance' || path.startsWith('/api/compliance/')) {
        return await handleCompliance(request, response, path)
      }
      if (path === '/api/company-accounts' && request.method === 'POST') {
        const input = await readJson(request)
        if (!input.name?.trim() || !/^\d{11}$/.test(input.ruc || '') ||
          !companyTypes.has(input.type) || !input.administrator?.name?.trim() ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.administrator?.email || '') ||
          input.acceptedTerms !== true) {
          return send(response, 422, { code: 'INVALID_COMPANY', message: 'Revisa los datos obligatorios de la empresa.' })
        }
        if ([...accounts.values()].some((account) => account.ruc === input.ruc)) {
          return send(response, 409, { code: 'DUPLICATE_RUC', message: 'Ya existe una empresa con ese RUC.' })
        }
        const id = randomUUID()
        const company = {
          id,
          name: input.name.trim(),
          ruc: input.ruc,
          type: input.type,
          adminName: input.administrator.name.trim(),
          adminEmail: input.administrator.email.trim().toLowerCase(),
          professionalLicense: input.administrator.professionalLicense || '',
          registeredAt: new Date().toISOString(),
        }
        accounts.set(id, company)
        subscriptions.set(id, {
          companyId: id,
          planId: null,
          status: 'pending',
          activatedAt: null,
          expiresAt: null,
        })
        iam.provisionAdmin(company)
        return send(response, 201, company)
      }

      const match = path.match(/^\/api\/company-accounts\/([^/]+)(?:\/subscription(?:\/(plan|activation-requests|renewal-requests))?)?$/)
      if (!match) return send(response, 404, { code: 'NOT_FOUND', message: 'Ruta no encontrada.' })
      const id = decodeURIComponent(match[1])
      const operation = match[2]
      const account = accounts.get(id)
      const subscription = subscriptions.get(id)
      if (!account) return send(response, 404, { code: 'ACCOUNT_NOT_FOUND', message: 'Empresa no encontrada.' })

      if (!path.includes('/subscription') && request.method === 'GET') return send(response, 200, account)
      if (path.endsWith('/subscription') && request.method === 'GET') return send(response, 200, subscription)

      if (operation === 'plan' && request.method === 'PUT') {
        const { planId } = await readJson(request)
        if (!planIds.has(planId)) return send(response, 422, { code: 'INVALID_PLAN', message: 'El plan no existe.' })
        if (subscription.status === 'active') {
          return send(response, 409, { code: 'ACTIVE_PLAN_LOCKED', message: 'No se puede cambiar un plan activo en esta simulación.' })
        }
        subscription.planId = planId
        return send(response, 200, subscription)
      }
      if (operation === 'activation-requests' && request.method === 'POST') {
        if (!subscription.planId) return send(response, 409, { code: 'PLAN_REQUIRED', message: 'Selecciona un plan primero.' })
        if (subscription.status === 'active') return send(response, 409, { code: 'ALREADY_ACTIVE', message: 'La suscripción ya está activa.' })
        const activatedAt = new Date().toISOString()
        Object.assign(subscription, { status: 'active', activatedAt, expiresAt: oneYearLater(activatedAt) })
        return send(response, 200, { simulated: true, subscription })
      }
      if (operation === 'renewal-requests' && request.method === 'POST') {
        if (subscription.status !== 'active') {
          return send(response, 409, { code: 'NOT_ACTIVE', message: 'Activa la suscripción antes de renovarla.' })
        }
        subscription.expiresAt = oneYearLater(subscription.expiresAt)
        return send(response, 200, { simulated: true, subscription })
      }
      return send(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    } catch (error) {
      return send(response, error.status || 500, {
        code: error.status ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
        message: error.status ? error.message : 'Error interno de la fake API.',
      })
    }
  })

  return server
}
