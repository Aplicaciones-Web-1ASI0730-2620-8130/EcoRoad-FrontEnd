<script setup>
import './monitoring.css'
</script>

<template>
  <div class="monitoring-app">
    <aside class="monitoring-sidebar">
      <RouterLink class="monitoring-brand" to="/projects"><span class="monitoring-brand-mark"><i class="pi pi-leaf" aria-hidden="true"></i></span><span><strong>EcoRoad</strong><small>INFRAESTRUCTURA Y ENTORNO</small></span></RouterLink>
      <nav class="monitoring-nav" aria-label="Navegación operativa">
        <RouterLink to="/projects"><i class="pi pi-map" aria-hidden="true"></i> Proyectos</RouterLink>
        <RouterLink to="/monitoring" :class="{ active: $route.name === 'monitoring-dashboard' }" :aria-current="$route.name === 'monitoring-dashboard' ? 'page' : undefined"><i class="pi pi-chart-line" aria-hidden="true"></i> Monitoreo</RouterLink>
        <RouterLink to="/monitoring/history" :class="{ active: $route.name === 'monitoring-history' }" :aria-current="$route.name === 'monitoring-history' ? 'page' : undefined"><i class="pi pi-history" aria-hidden="true"></i> Historial</RouterLink>
        <RouterLink to="/assets" :class="{ active: $route.name === 'asset-deployment' }" :aria-current="$route.name === 'asset-deployment' ? 'page' : undefined"><i class="pi pi-wifi" aria-hidden="true"></i> Sensores y puntos</RouterLink>
        <RouterLink to="/alerts" :class="{ active: $route.name === 'alerting-list' }" :aria-current="$route.name === 'alerting-list' ? 'page' : undefined"><i class="pi pi-bell" aria-hidden="true"></i> Alertas</RouterLink>
        <RouterLink to="/compliance" :class="{ active: $route.name === 'compliance-reports' }" :aria-current="$route.name === 'compliance-reports' ? 'page' : undefined"><i class="pi pi-file" aria-hidden="true"></i> Reportes</RouterLink>
        <span class="monitoring-nav-divider">CUENTA</span>
        <RouterLink to="/commercial/subscription"><i class="pi pi-credit-card" aria-hidden="true"></i> Suscripción</RouterLink>
      </nav>
      <div class="monitoring-sidebar-footer">EcoRoad · Datos de demostración</div>
    </aside>
    <div class="monitoring-workspace">
      <header class="monitoring-topbar"><div class="monitoring-breadcrumb">EcoRoad <i class="pi pi-angle-right" aria-hidden="true"></i> <strong>{{ $route.meta.title || 'Monitoreo ambiental' }}</strong></div><div class="monitoring-user"><span class="monitoring-avatar"><i class="pi pi-user" aria-hidden="true"></i></span><span><strong>Equipo EcoRoad</strong><small>Entorno de demostración</small></span></div></header>
      <main class="monitoring-content"><slot /></main>
    </div>
  </div>
</template>
