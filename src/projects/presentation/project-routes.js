export default [
  {
    path: '',
    name: 'projects-list',
    component: () => import('./views/project-list.vue'),
    meta: { title: 'Proyectos viales' },
  },
  {
    path: 'new',
    name: 'projects-new',
    component: () => import('./views/new-project.vue'),
    meta: { title: 'Nuevo proyecto vial' },
  },
  {
    path: ':id',
    name: 'projects-detail',
    component: () => import('./views/project-detail.vue'),
    meta: { title: 'Detalle de proyecto' },
  },
]

