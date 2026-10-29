<script setup>
import OperationalNav from '../../../monitoring/presentation/components/operational-nav.vue'
import './projects.css'
</script>

<template>
  <div class="project-app">
    <aside class="project-sidebar">
      <RouterLink class="project-brand" to="/projects">
        <span class="project-brand-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M35 10C21 12 12 19 13 30c1 6 5 9 11 8 10-2 14-13 11-28Z" fill="#B9F2D9" />
            <path d="M13 37c6-9 13-15 22-20" stroke="#087453" stroke-width="3" stroke-linecap="round" />
          </svg>
        </span>
        <span><strong>EcoRoad</strong><small>INFRAESTRUCTURA Y ENTORNO</small></span>
      </RouterLink>
      <OperationalNav nav-class="project-nav" divider-class="project-nav-divider" />
      <div class="project-sidebar-bottom"><i class="pi pi-globe" aria-hidden="true"></i> EcoRoad · Demo</div>
    </aside>
    <div class="project-workspace">
      <header class="project-topbar">
        <div class="project-breadcrumb"><span>EcoRoad</span><i class="pi pi-angle-right" aria-hidden="true"></i><strong><slot name="breadcrumb">{{ $route.meta.title || 'Proyectos viales' }}</slot></strong></div>
        <div class="project-user"><span class="project-avatar"><i class="pi pi-user" aria-hidden="true"></i></span><span><strong>Equipo EcoRoad</strong><small>Entorno de demostración</small></span></div>
      </header>
      <main class="project-content"><slot /></main>
    </div>
  </div>
</template>
