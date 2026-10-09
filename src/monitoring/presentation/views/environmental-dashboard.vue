<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import MonitoringShell from '../components/monitoring-shell.vue'
import { MONITORING_STATUSES } from '../../domain/environmental-reading.js'
import { useMonitoring } from '../../application/use-monitoring.js'

const route = useRoute()
const router = useRouter()
const monitoring = useMonitoring()
const projects = monitoring.projects
const selectedProjectId = ref(typeof route.query.projectId === 'string' ? route.query.projectId : '')
const dashboard = computed(() => monitoring.dashboard(selectedProjectId.value))
const loading = monitoring.loading
const error = monitoring.error
onMounted(async () => {
  await monitoring.loadProjects()
  if (!selectedProjectId.value) selectedProjectId.value = projects.value[0]?.id || ''
  if (selectedProjectId.value) await monitoring.loadDashboard(selectedProjectId.value)
})
watch(() => route.query.projectId, async (id) => { if (typeof id === 'string') { selectedProjectId.value = id; await monitoring.loadDashboard(id) } })
const sectionCounts = computed(() => Object.fromEntries(Object.keys(MONITORING_STATUSES).map((status) => [status, dashboard.value?.sections.filter((section) => section.status === status).length || 0])))
const latestLabel = computed(() => dashboard.value?.latestAt
  ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dashboard.value.latestAt))
  : 'Sin lecturas')

function selectProject(event) {
  selectedProjectId.value = event.target.value
  router.replace({ name: 'monitoring-dashboard', query: { projectId: selectedProjectId.value } })
  monitoring.loadDashboard(selectedProjectId.value)
}
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading"><div><span class="monitoring-eyebrow">CONTROL AMBIENTAL POR CORREDOR</span><h1>Dashboard ambiental</h1><p>Indicadores y estado de los tramos de un proyecto vial.</p></div><label class="monitoring-project-picker">Proyecto <select :value="selectedProjectId" aria-label="Seleccionar proyecto" @change="selectProject"><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option></select></label></div>
    <Message severity="info" :closable="false" class="monitoring-demo-note">Lecturas y umbrales de demostración. Esta vista no muestra telemetría real ni certifica cumplimiento normativo.</Message>
    <Message v-if="error" severity="error" :closable="false" class="monitoring-demo-note">{{ error }} <button type="button" class="monitoring-retry" @click="monitoring.loadProjects">Reintentar</button></Message>
    <div v-if="loading && !dashboard" class="monitoring-empty"><h2>Cargando monitoreo...</h2><p>Consultando lecturas de la fake API.</p></div>
    <div v-else-if="!dashboard" class="monitoring-empty"><h2>Sin datos de monitoreo</h2><p>Este proyecto aún no tiene mediciones de ejemplo. Elige uno de los proyectos disponibles.</p></div>
    <template v-else>
      <section class="monitoring-overview" :class="`monitoring-overview--${dashboard.status || 'empty'}`"><div><small>ESTADO AMBIENTAL DE LA MUESTRA</small><div class="monitoring-overview-status"><Tag v-if="dashboard.status" :severity="MONITORING_STATUSES[dashboard.status].severity" :value="MONITORING_STATUSES[dashboard.status].label" /><Tag v-else severity="secondary" value="Sin mediciones" /><strong>{{ dashboard.project.name }}</strong></div><p>{{ dashboard.project.corridor }} · {{ dashboard.sections.length }} tramos viales</p></div><div class="monitoring-sync"><i class="pi pi-clock" aria-hidden="true"></i><div><strong>ÚLTIMA LECTURA DE EJEMPLO</strong><span>{{ latestLabel }}</span></div></div></section>
      <div class="monitoring-section-title"><div><h2>Indicadores ambientales</h2><p>Valor más relevante de la última lectura por tramo</p></div><RouterLink class="monitoring-history-link" :to="{ name: 'monitoring-history', query: { projectId: selectedProjectId } }">Ver historial <i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink></div>
      <div class="monitoring-indicator-grid"><article v-for="parameter in dashboard.parameters" :key="parameter.id" class="monitoring-indicator"><div class="monitoring-indicator-top"><span>{{ parameter.label }}</span><i :class="parameter.icon" aria-hidden="true"></i></div><div class="monitoring-value">{{ parameter.reading?.value ?? '—' }} <span v-if="parameter.reading">{{ parameter.unit }}</span></div><p>{{ parameter.metric }}<template v-if="parameter.reading"> · {{ dashboard.sections.find((section) => section.id === parameter.reading.sectionId)?.name }}</template></p><div class="monitoring-indicator-bottom"><Tag v-if="parameter.reading" :severity="MONITORING_STATUSES[parameter.reading.status].severity" :value="MONITORING_STATUSES[parameter.reading.status].label" /><Tag v-else severity="secondary" value="Sin datos" /></div></article></div>
      <div class="monitoring-section-title monitoring-sections-title"><div><h2>Estado por tramo</h2><p>Distribución del monitoreo a lo largo del corredor</p></div><div class="monitoring-legend"><span><i class="dot optimal"></i> Óptimo {{ sectionCounts.optimal }}</span><span><i class="dot observation"></i> En observación {{ sectionCounts.observation }}</span><span><i class="dot critical"></i> Crítico {{ sectionCounts.critical }}</span></div></div>
      <div class="monitoring-section-grid"><article v-for="(section, index) in dashboard.sections" :key="section.id" class="monitoring-section-card" :class="`monitoring-section-card--${section.status || 'empty'}`"><div class="monitoring-section-card-top"><span>TRAMO {{ String(index + 1).padStart(2, '0') }}</span><Tag v-if="section.status" :severity="MONITORING_STATUSES[section.status].severity" :value="MONITORING_STATUSES[section.status].label" /><Tag v-else severity="secondary" value="Sin datos" /></div><h3>{{ section.name }}</h3><p>PK {{ section.pk }}</p><div class="monitoring-front">Frente: {{ section.workFront }}</div><div class="monitoring-section-readings"><span>{{ section.readings.length }} {{ section.readings.length === 1 ? 'parámetro' : 'parámetros' }} medidos</span><strong v-if="section.readings.length">{{ section.readings.map((reading) => reading.value).join(' · ') }}</strong></div></article></div>
    </template>
  </MonitoringShell>
</template>
