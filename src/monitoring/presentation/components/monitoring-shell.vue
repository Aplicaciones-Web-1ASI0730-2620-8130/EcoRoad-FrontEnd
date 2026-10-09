<script setup>
import { useRouter } from 'vue-router'
import { currentUser, signOut } from '../../../iam/application/iam-session.js'
import './monitoring.css'
const router = useRouter()
async function leave() { await signOut(); await router.push('/iam/login') }
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
        <RouterLink v-if="currentUser?.permissions?.includes('view_projects')" to="/projects"><i class="pi pi-map" aria-hidden="true"></i> Proyectos</RouterLink>
        <RouterLink v-if="currentUser?.permissions?.includes('consult_indicators')" to="/monitoring" :class="{ active: $route.name === 'monitoring-dashboard' }" :aria-current="$route.name === 'monitoring-dashboard' ? 'page' : undefined"><i class="pi pi-chart-line" aria-hidden="true"></i> Monitoreo</RouterLink>
        <RouterLink v-if="currentUser?.permissions?.includes('consult_indicators')" to="/monitoring/history" :class="{ active: $route.name === 'monitoring-history' }" :aria-current="$route.name === 'monitoring-history' ? 'page' : undefined"><i class="pi pi-history" aria-hidden="true"></i> Historial</RouterLink>
        <RouterLink v-if="currentUser?.permissions?.includes('consult_sensors')" to="/assets" :class="{ active: $route.name === 'asset-deployment' }" :aria-current="$route.name === 'asset-deployment' ? 'page' : undefined"><i class="pi pi-wifi" aria-hidden="true"></i> Sensores y puntos</RouterLink>
        <RouterLink v-if="currentUser?.permissions?.includes('consult_alerts')" to="/alerts" :class="{ active: $route.name === 'alerting-list' }" :aria-current="$route.name === 'alerting-list' ? 'page' : undefined"><i class="pi pi-bell" aria-hidden="true"></i> Alertas</RouterLink>
        <RouterLink v-if="['manage_incidents', 'corrective_actions', 'field_evidence'].some(permission => currentUser?.permissions?.includes(permission))" to="/incidents" :class="{ active: $route.name === 'incident-board' }" :aria-current="$route.name === 'incident-board' ? 'page' : undefined"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i> Incidentes</RouterLink>
        <RouterLink v-if="currentUser?.permissions?.includes('generate_reports')" to="/compliance" :class="{ active: $route.name === 'compliance-reports' }" :aria-current="$route.name === 'compliance-reports' ? 'page' : undefined"><i class="pi pi-file" aria-hidden="true"></i> Reportes</RouterLink>
        <RouterLink v-if="currentUser?.permissions?.includes('manage_users')" to="/iam/collaborators" :class="{ active: $route.name === 'iam-collaborators' }" :aria-current="$route.name === 'iam-collaborators' ? 'page' : undefined"><i class="pi pi-users" aria-hidden="true"></i> Colaboradores</RouterLink>
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
      <header class="monitoring-topbar"><div class="monitoring-breadcrumb">EcoRoad <i class="pi pi-angle-right" aria-hidden="true"></i> <strong>Monitoreo ambiental</strong></div><div class="monitoring-user"><span class="monitoring-avatar"><i class="pi pi-user" aria-hidden="true"></i></span><span><strong>Equipo EcoRoad</strong><small>Entorno de demostración</small></span></div></header>
      <header class="monitoring-topbar"><div class="monitoring-breadcrumb">EcoRoad <i class="pi pi-angle-right" aria-hidden="true"></i> <strong>{{ $route.meta.title || 'Monitoreo ambiental' }}</strong></div><div class="monitoring-user"><span class="monitoring-avatar"><i class="pi pi-user" aria-hidden="true"></i></span><span><strong>{{ currentUser?.name || 'Equipo EcoRoad' }}</strong><small>{{ currentUser?.email || 'Entorno de demostración' }}</small></span><button type="button" class="iam-signout" @click="leave">Salir</button></div></header>
      <header class="monitoring-topbar"><div class="monitoring-breadcrumb">EcoRoad <i class="pi pi-angle-right" aria-hidden="true"></i> <strong>{{ $route.meta.title || 'Monitoreo ambiental' }}</strong></div><div class="monitoring-user"><span class="monitoring-avatar"><i class="pi pi-user" aria-hidden="true"></i></span><span><strong>Equipo EcoRoad</strong><small>Entorno de demostración</small></span></div></header>
      <main class="monitoring-content"><slot /></main>
    </div>
  </div>
</template>
