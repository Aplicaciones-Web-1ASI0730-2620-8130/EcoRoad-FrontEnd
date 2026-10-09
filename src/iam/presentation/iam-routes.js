export default [
  {
    path: 'login',
    name: 'iam-login',
    component: () => import('./views/sign-in-view.vue'),
    meta: { title: 'Iniciar sesión' },
  },
  {
    path: 'forbidden',
    name: 'iam-forbidden',
    component: () => import('./views/forbidden-view.vue'),
    meta: { title: 'Acceso restringido' },
  },
  {
    path: 'collaborators',
    name: 'iam-collaborators',
    component: () => import('./views/collaborators-view.vue'),
    meta: { title: 'Colaboradores y permisos' },
  },
]
