export default [
  {
    path: '',
    name: 'monitoring-dashboard',
    component: () => import('./views/environmental-dashboard.vue'),
    meta: { title: 'Monitoreo ambiental' },
  },
  {
    path: 'operations',
    name: 'monitoring-operations',
    component: () => import('./views/monitoring-operations.vue'),
    meta: { title: 'Registrar monitoreo' },
  },
  {
    path: 'history',
    name: 'monitoring-history',
    component: () => import('./views/indicator-history.vue'),
    meta: { title: 'Historial de indicadores' },
  },
]
