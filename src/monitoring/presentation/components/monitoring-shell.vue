<script setup>
import OperationalNav from './operational-nav.vue'
import './monitoring.css'
</script>

<template>
  <div class="monitoring-app">
    <aside class="monitoring-sidebar">
      <RouterLink class="monitoring-brand" to="/projects"><span class="monitoring-brand-mark"><i class="pi pi-leaf" aria-hidden="true"></i></span><span><strong>EcoRoad</strong><small>INFRAESTRUCTURA Y ENTORNO</small></span></RouterLink>
      <OperationalNav nav-class="monitoring-nav" divider-class="monitoring-nav-divider" />
      <div class="monitoring-sidebar-footer">EcoRoad · Datos de demostración</div>
    </aside>
    <div class="monitoring-workspace">
      <header class="monitoring-topbar"><div class="monitoring-breadcrumb">EcoRoad <i class="pi pi-angle-right" aria-hidden="true"></i> <strong>{{ $route.meta.title || 'Monitoreo ambiental' }}</strong></div><div class="monitoring-user"><span class="monitoring-avatar"><i class="pi pi-user" aria-hidden="true"></i></span><span><strong>Equipo EcoRoad</strong><small>Entorno de demostración</small></span></div></header>
      <main class="monitoring-content"><slot /></main>
    </div>
  </div>
</template>
