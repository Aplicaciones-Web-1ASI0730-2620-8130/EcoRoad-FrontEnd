import { createRouter, createWebHistory } from 'vue-router'
import commercialRoutes from './commercial/presentation/commercial-routes.js'
import projectRoutes from './projects/presentation/project-routes.js'
import monitoringRoutes from './monitoring/presentation/monitoring-routes.js'
import alertingRoutes from './alerting/presentation/alerting-routes.js'
import assetRoutes from './assets/presentation/asset-routes.js'
import complianceRoutes from './compliance/presentation/compliance-routes.js'
import iamRoutes from './iam/presentation/iam-routes.js'
import incidentRoutes from './incidents/presentation/incident-routes.js'
import { createCommercialApiRepository } from './commercial/infrastructure/commercial-api-repository.js'
import { canAccessOperationalModules } from './commercial/domain/commercial-model.js'
import { getDemoCompanyId } from './projects/infrastructure/demo-company.js'
import { restoreSession } from './iam/application/iam-session.js'

const commercialApi = createCommercialApiRepository({
  baseUrl: import.meta.env.VITE_COMMERCIAL_API_URL || new URL('/api/', window.location.origin).href,
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/projects' },
    { path: '/commercial', children: commercialRoutes },
    { path: '/projects', children: projectRoutes },
    { path: '/monitoring', children: monitoringRoutes },
    { path: '/alerts', children: alertingRoutes },
    { path: '/incidents', children: incidentRoutes },
    { path: '/assets', children: assetRoutes },
    { path: '/compliance', children: complianceRoutes },
    { path: '/iam', children: iamRoutes },
    { path: '/:pathMatch(.*)*', redirect: '/projects' },
  ],
})

const chunkReloadKey = 'ecoroad:chunk-reload-target'

router.onError((error, to) => {
  if (!/failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(error?.message || '')) return

  const target = to.fullPath
  if (sessionStorage.getItem(chunkReloadKey) === target) return

  sessionStorage.setItem(chunkReloadKey, target)
  window.location.assign(target)
})

router.beforeEach(async (to) => {
  const protectedArea = ['/projects', '/monitoring', '/alerts', '/incidents', '/assets', '/compliance', '/iam/collaborators'].some((prefix) => to.path === prefix || to.path.startsWith(`${prefix}/`))
  if (!protectedArea) return true
  const user = await restoreSession()
  if (!user || user.companyId !== getDemoCompanyId()) return { path: '/iam/login', query: { redirect: to.fullPath } }
  const required = to.path.startsWith('/iam/') ? 'manage_users'
    : to.path.startsWith('/compliance') ? 'generate_reports'
      : to.path.startsWith('/incidents') ? ['manage_incidents', 'corrective_actions', 'field_evidence']
      : to.path.startsWith('/assets') ? 'consult_sensors'
        : to.path.startsWith('/alerts') ? 'consult_alerts'
          : to.path.startsWith('/monitoring') ? 'consult_indicators' : 'view_projects'
  if (!(Array.isArray(required) ? required.some((permission) => user.permissions.includes(permission)) : user.permissions.includes(required))) return { path: '/iam/forbidden' }
  try {
    const subscription = await commercialApi.getSubscription(getDemoCompanyId())
    if (canAccessOperationalModules(subscription)) return true
    return { path: '/commercial/subscription', query: { access: 'required' } }
  } catch {
    return { path: '/commercial/subscription', query: { access: 'unavailable' } }
  }
})

router.afterEach((to, _from, failure) => {
  if (!failure && sessionStorage.getItem(chunkReloadKey) === to.fullPath) sessionStorage.removeItem(chunkReloadKey)
  document.title = `${to.meta.title || 'Proyectos viales'} | EcoRoad`
})

export default router
