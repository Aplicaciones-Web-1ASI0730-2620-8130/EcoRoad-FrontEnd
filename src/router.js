import { createRouter, createWebHistory } from 'vue-router'
import commercialRoutes from './commercial/presentation/commercial-routes.js'
import projectRoutes from './projects/presentation/project-routes.js'
import monitoringRoutes from './monitoring/presentation/monitoring-routes.js'
import alertingRoutes from './alerting/presentation/alerting-routes.js'
import assetRoutes from './assets/presentation/asset-routes.js'
import complianceRoutes from './compliance/presentation/compliance-routes.js'
import { createCommercialApiRepository } from './commercial/infrastructure/commercial-api-repository.js'
import { canAccessOperationalModules } from './commercial/domain/commercial-model.js'
import { getDemoCompanyId } from './projects/infrastructure/demo-company.js'

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
    { path: '/assets', children: assetRoutes },
    { path: '/compliance', children: complianceRoutes },
    { path: '/:pathMatch(.*)*', redirect: '/projects' },
  ],
})

router.beforeEach(async (to) => {
  if (!to.path.startsWith('/projects') && !to.path.startsWith('/monitoring') && !to.path.startsWith('/alerts') && !to.path.startsWith('/assets') && !to.path.startsWith('/compliance')) return true
  try {
    const subscription = await commercialApi.getSubscription(getDemoCompanyId())
    if (canAccessOperationalModules(subscription)) return true
    return { path: '/commercial/subscription', query: { access: 'required' } }
  } catch {
    return { path: '/commercial/subscription', query: { access: 'unavailable' } }
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Proyectos viales'} | EcoRoad`
})

export default router
