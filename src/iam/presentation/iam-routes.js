export default [
  {
    path: 'collaborators',
    name: 'iam-collaborators',
    component: () => import('./views/collaborators-view.vue'),
    meta: { title: 'Colaboradores y permisos' },
  },
]
