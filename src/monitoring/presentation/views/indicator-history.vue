<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import MonitoringShell from '../components/monitoring-shell.vue'
import HistoryChart from '../components/history-chart.vue'
import { ENVIRONMENTAL_PARAMETERS, MONITORING_STATUSES, classifyReading, validateHistoryFilters } from '../../domain/environmental-reading.js'
import { DEMO_THRESHOLD_PROFILES } from '../../infrastructure/monitoring-fixtures.js'
import { useMonitoring } from '../../application/use-monitoring.js'

const route = useRoute()
const router = useRouter()
const monitoring = useMonitoring()
const projects = monitoring.projects
const loading = monitoring.loading
const error = monitoring.error
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString().slice(0, 10)
const initialProjectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
const filters = reactive({ projectId: initialProjectId, sectionId: 'all', parameterId: 'pm10', from: weekAgo, to: today })
const applied = ref({ ...filters })
const filterError = ref('')
watch(() => route.query.projectId, (id) => {
  if (typeof id === 'string' && id !== filters.projectId) {
    filters.projectId = id
    filters.sectionId = 'all'
    applied.value = { ...filters }
    monitoring.loadHistory(applied.value)
  }
})

const formProject = computed(() => projects.value.find((project) => project.id === filters.projectId))
const project = computed(() => projects.value.find((item) => item.id === applied.value.projectId))
const parameter = computed(() => ENVIRONMENTAL_PARAMETERS[applied.value.parameterId])
const profile = computed(() => DEMO_THRESHOLD_PROFILES[applied.value.parameterId])
const historyResponse = computed(() => monitoring.history(JSON.stringify(applied.value)))
const readings = computed(() => historyResponse.value?.readings || [])
const summary = computed(() => {
  if (!readings.value.length) return null
  const values = readings.value.map((reading) => reading.value)
  return { average: (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1), maximum: Math.max(...values), minimum: Math.min(...values) }
})

async function consult() {
  filterError.value = validateHistoryFilters(filters)
  if (filterError.value) return
  applied.value = { ...filters }
  router.replace({ name: 'monitoring-history', query: { projectId: filters.projectId } })
  await monitoring.loadHistory(applied.value)
}

function onProjectChange() { filters.sectionId = 'all' }
const sectionName = (id) => project.value?.sections.find((section) => section.id === id)?.name || 'Tramo no disponible'
const formattedDate = (date) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
onMounted(async () => {
  await monitoring.loadProjects()
  if (!filters.projectId) {
    filters.projectId = projects.value[0]?.id || ''
    applied.value = { ...filters }
  }
  if (applied.value.projectId) await monitoring.loadHistory(applied.value)
})
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading"><div><span class="monitoring-eyebrow">CONSULTA DE MEDICIONES</span><h1>Historial de indicadores</h1><p>Explora la evolución de las lecturas ambientales por proyecto y tramo.</p></div><RouterLink class="monitoring-history-link" :to="{ name: 'monitoring-dashboard', query: { projectId: applied.projectId } }"><i class="pi pi-arrow-left" aria-hidden="true"></i> Volver al dashboard</RouterLink></div>
    <Message severity="info" :closable="false" class="monitoring-demo-note">Datos servidos por la fake API local. Los umbrales se aplican en el dominio de Environmental Monitoring.</Message>
    <Message v-if="error" severity="error" :closable="false" class="monitoring-filter-error">{{ error }}</Message>
    <Message v-if="loading" severity="info" :closable="false" class="monitoring-demo-note">Consultando lecturas...</Message>
    <form class="monitoring-history-filters" @submit.prevent="consult">
      <label>Proyecto<select v-model="filters.projectId" @change="onProjectChange"><option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
      <label>Indicador<select v-model="filters.parameterId"><option v-for="(item, id) in ENVIRONMENTAL_PARAMETERS" :key="id" :value="id">{{ item.metric }} · {{ item.label }}</option></select></label>
      <label>Tramo<select v-model="filters.sectionId"><option value="all">Todos los tramos</option><option v-for="section in formProject?.sections || []" :key="section.id" :value="section.id">{{ section.name }}</option></select></label>
      <label>Desde<input v-model="filters.from" type="date" /></label>
      <label>Hasta<input v-model="filters.to" type="date" /></label>
      <Button type="submit" label="Consultar" icon="pi pi-search" />
    </form>
    <Message v-if="filterError" severity="error" :closable="false" class="monitoring-filter-error">{{ filterError }}</Message>
    <div v-if="!project" class="monitoring-empty"><h2>Proyecto no disponible</h2><p>Selecciona un proyecto de demostración.</p></div>
    <template v-else>
      <section class="monitoring-history-panel"><div class="monitoring-history-heading"><div><span class="monitoring-eyebrow">{{ project.name }} · {{ project.corridor }}</span><h2>{{ parameter.metric }} · {{ parameter.label }}</h2><p>{{ readings.length }} lecturas entre {{ applied.from }} y {{ applied.to }}</p></div><Tag :value="`${parameter.unit} · muestra`" severity="secondary" /></div><HistoryChart v-if="readings.length" :readings="readings" :unit="parameter.unit" :profile="profile" /><div v-else class="monitoring-empty monitoring-history-empty"><h3>Sin lecturas en este periodo</h3><p>Prueba otro tramo, indicador o rango de fechas.</p></div></section>
      <div v-if="summary" class="monitoring-history-stats"><div><span>PROMEDIO DEL PERIODO</span><strong>{{ summary.average }} <small>{{ parameter.unit }}</small></strong></div><div><span>VALOR MÁXIMO</span><strong>{{ summary.maximum }} <small>{{ parameter.unit }}</small></strong></div><div><span>VALOR MÍNIMO</span><strong>{{ summary.minimum }} <small>{{ parameter.unit }}</small></strong></div></div>
      <section class="monitoring-history-panel monitoring-history-log"><h2>Detalle de lecturas</h2><div class="monitoring-history-table-wrap"><table><thead><tr><th>FECHA Y HORA</th><th>TRAMO</th><th>VALOR</th><th>FUENTE</th><th>ESTADO DEMO</th></tr></thead><tbody><tr v-for="reading in [...readings].reverse()" :key="reading.id"><td>{{ formattedDate(reading.recordedAt) }}</td><td>{{ sectionName(reading.sectionId) }}</td><td><strong>{{ reading.value }} {{ parameter.unit }}</strong></td><td>{{ reading.source === 'manual' ? 'Registro de campo' : 'Telemetría' }}</td><td><Tag :severity="MONITORING_STATUSES[classifyReading(reading.value, profile)].severity" :value="MONITORING_STATUSES[classifyReading(reading.value, profile)].label" /></td></tr><tr v-if="!readings.length"><td colspan="5">No hay registros para los filtros seleccionados.</td></tr></tbody></table></div></section>
    </template>
  </MonitoringShell>
</template>
