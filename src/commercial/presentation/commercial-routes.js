export default [
  {
    path: 'register',
    name: 'commercial-register',
    component: () => import('./views/company-registration.vue'),
    meta: { title: 'Registro de empresa' },
  },
  {
    path: 'subscription',
    name: 'commercial-subscription',
    component: () => import('./views/subscription-view.vue'),
    meta: { title: 'Suscripción' },
  },
]

