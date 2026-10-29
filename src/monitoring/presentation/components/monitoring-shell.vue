<script setup>
import { useRouter } from 'vue-router'
import { currentUser, signOut } from '../../../iam/application/iam-session.js'
import OperationalNav from './operational-nav.vue'
import './monitoring.css'

const router = useRouter()
async function leave() {
  await signOut()
  await router.push('/iam/login')
}
</script>

<template>
  <div class="monitoring-app">
    <aside class="monitoring-sidebar">
      <RouterLink class="monitoring-brand" to="/projects"><span class="monitoring-brand-mark"><i class="pi pi-leaf" aria-hidden="true"></i></span><span><strong>EcoRoad</strong><small>INFRAESTRUCTURA Y ENTORNO</small></span></RouterLink>
      <OperationalNav nav-class="monitoring-nav" divider-class="monitoring-nav-divider" />
      <div class="monitoring-sidebar-footer">EcoRoad · Datos de demostración</div>
    </aside>
    <div class="monitoring-workspace">
      <header class="monitoring-topbar">
        <div class="monitoring-breadcrumb">EcoRoad <i class="pi pi-angle-right" aria-hidden="true"></i> <strong>{{ $route.meta.title || 'Monitoreo ambiental' }}</strong></div>
        <div class="monitoring-user">
          <span class="monitoring-avatar"><i class="pi pi-user" aria-hidden="true"></i></span>
          <span><strong>{{ currentUser?.name || 'Equipo EcoRoad' }}</strong><small>{{ currentUser?.email || 'Entorno de demostración' }}</small></span>
          <button type="button" class="iam-signout" @click="leave">Salir</button>
        </div>
      </header>
      <main class="monitoring-content"><slot /></main>
    </div>
  </div>
</template>
