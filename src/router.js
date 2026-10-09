import { createRouter, createWebHistory } from 'vue-router'
import commercialRoutes from './commercial/presentation/commercial-routes.js'
import projectRoutes from './projects/presentation/project-routes.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/commercial/register' },
    { path: '/commercial', children: commercialRoutes },
    { path: '/projects', children: projectRoutes },
    { path: '/:pathMatch(.*)*', redirect: '/commercial/register' },
  ],
})

router.afterEach((to) => {
  document.title = `${to.meta.title || 'Gestión comercial'} | EcoRoad`
})

export default router
