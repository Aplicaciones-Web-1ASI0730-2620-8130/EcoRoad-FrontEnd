<script setup>
defineProps({
  navClass: { type: String, required: true },
  dividerClass: { type: String, required: true },
})
</script>

<template>
  <nav :class="navClass" aria-label="Navegación operativa">
    <RouterLink
      to="/projects"
      :class="{ active: $route.path.startsWith('/projects') && $route.name !== 'projects-new' }"
      :aria-current="$route.path.startsWith('/projects') && $route.name !== 'projects-new' ? 'page' : undefined"
    ><i class="pi pi-map" aria-hidden="true"></i> Proyectos</RouterLink>
    <RouterLink
      to="/monitoring"
      :class="{ active: $route.name === 'monitoring-dashboard' }"
      :aria-current="$route.name === 'monitoring-dashboard' ? 'page' : undefined"
    ><i class="pi pi-chart-line" aria-hidden="true"></i> Monitoreo</RouterLink>
    <RouterLink
      to="/monitoring/history"
      :class="{ active: $route.name === 'monitoring-history' }"
      :aria-current="$route.name === 'monitoring-history' ? 'page' : undefined"
    ><i class="pi pi-history" aria-hidden="true"></i> Historial</RouterLink>
    <RouterLink
      to="/assets"
      :class="{ active: $route.name === 'asset-deployment' }"
      :aria-current="$route.name === 'asset-deployment' ? 'page' : undefined"
    ><i class="pi pi-wifi" aria-hidden="true"></i> Sensores y puntos</RouterLink>
    <RouterLink
      to="/alerts"
      :class="{ active: $route.name === 'alerting-list' }"
      :aria-current="$route.name === 'alerting-list' ? 'page' : undefined"
    ><i class="pi pi-bell" aria-hidden="true"></i> Alertas</RouterLink>
    <RouterLink
      to="/projects/new"
      :class="{ active: $route.name === 'projects-new' }"
      :aria-current="$route.name === 'projects-new' ? 'page' : undefined"
    ><i class="pi pi-plus-circle" aria-hidden="true"></i> Nuevo proyecto</RouterLink>
    <span :class="dividerClass">CUENTA</span>
    <RouterLink to="/commercial/subscription"><i class="pi pi-credit-card" aria-hidden="true"></i> Suscripción</RouterLink>
  </nav>
</template>
