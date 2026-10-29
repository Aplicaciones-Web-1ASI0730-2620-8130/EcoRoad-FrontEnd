<script setup>
import { currentUser } from '../../../iam/application/iam-session.js'

defineProps({
  navClass: { type: String, required: true },
  dividerClass: { type: String, required: true },
})
</script>

<template>
  <nav :class="navClass" aria-label="Navegación operativa">
    <RouterLink
      v-if="currentUser?.permissions?.includes('view_projects')"
      to="/projects"
      :class="{ active: $route.path.startsWith('/projects') && $route.name !== 'projects-new' }"
      :aria-current="$route.path.startsWith('/projects') && $route.name !== 'projects-new' ? 'page' : undefined"
    ><i class="pi pi-map" aria-hidden="true"></i> Proyectos</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('consult_indicators')"
      to="/monitoring"
      :class="{ active: $route.name === 'monitoring-dashboard' }"
      :aria-current="$route.name === 'monitoring-dashboard' ? 'page' : undefined"
    ><i class="pi pi-chart-line" aria-hidden="true"></i> Monitoreo</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('consult_indicators')"
      to="/monitoring/history"
      :class="{ active: $route.name === 'monitoring-history' }"
      :aria-current="$route.name === 'monitoring-history' ? 'page' : undefined"
    ><i class="pi pi-history" aria-hidden="true"></i> Historial</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('consult_sensors')"
      to="/assets"
      :class="{ active: $route.name === 'asset-deployment' }"
      :aria-current="$route.name === 'asset-deployment' ? 'page' : undefined"
    ><i class="pi pi-wifi" aria-hidden="true"></i> Sensores y puntos</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('consult_alerts')"
      to="/alerts"
      :class="{ active: $route.name === 'alerting-list' }"
      :aria-current="$route.name === 'alerting-list' ? 'page' : undefined"
    ><i class="pi pi-bell" aria-hidden="true"></i> Alertas</RouterLink>
    <RouterLink
      v-if="['manage_incidents', 'corrective_actions', 'field_evidence'].some((permission) => currentUser?.permissions?.includes(permission))"
      to="/incidents"
      :class="{ active: $route.name === 'incident-board' }"
      :aria-current="$route.name === 'incident-board' ? 'page' : undefined"
    ><i class="pi pi-exclamation-triangle" aria-hidden="true"></i> Incidentes</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('generate_reports')"
      to="/compliance"
      :class="{ active: $route.name === 'compliance-reports' }"
      :aria-current="$route.name === 'compliance-reports' ? 'page' : undefined"
    ><i class="pi pi-file" aria-hidden="true"></i> Reportes</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('manage_users')"
      to="/iam/collaborators"
      :class="{ active: $route.name === 'iam-collaborators' }"
      :aria-current="$route.name === 'iam-collaborators' ? 'page' : undefined"
    ><i class="pi pi-users" aria-hidden="true"></i> Colaboradores</RouterLink>
    <RouterLink
      v-if="currentUser?.permissions?.includes('view_projects')"
      to="/projects/new"
      :class="{ active: $route.name === 'projects-new' }"
      :aria-current="$route.name === 'projects-new' ? 'page' : undefined"
    ><i class="pi pi-plus-circle" aria-hidden="true"></i> Nuevo proyecto</RouterLink>
    <span :class="dividerClass">CUENTA</span>
    <RouterLink to="/commercial/subscription"><i class="pi pi-credit-card" aria-hidden="true"></i> Suscripción</RouterLink>
  </nav>
</template>
