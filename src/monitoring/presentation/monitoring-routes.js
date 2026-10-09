export default [
  {
    path: '',
    name: 'monitoring-dashboard',
    component: () => import('./views/environmental-dashboard.vue'),
    meta: { title: 'Monitoreo ambiental' },
  },
  {
    path: 'history',
    name: 'monitoring-history',
    component: () => import('./views/indicator-history.vue'),
    meta: { title: 'Historial de indicadores' },
  },
]
