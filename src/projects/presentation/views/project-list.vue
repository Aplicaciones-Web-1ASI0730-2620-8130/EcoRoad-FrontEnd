<script setup>
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProjectShell from '../components/project-shell.vue'
import { ENVIRONMENTAL_STATUSES, PROJECT_TYPES } from '../../domain/road-project.js'
import { useProjects } from '../../application/use-projects.js'
import { useFakeApi } from '../../../shared/infrastructure/api-mode.js'

const router = useRouter()
const { counts, filterProjects, loadProjects, loading, error } = useProjects()
onMounted(loadProjects)
const filters = reactive({ search: '', status: 'all', type: 'all' })
const filteredProjects = computed(() => filterProjects(filters))
const typeLabel = (type) => PROJECT_TYPES.find((item) => item.value === type)?.label || type
const projectStatusLabel = (status) => status?.toLowerCase() === 'registered' ? 'Registrado' : status || 'Sin estado'

function clearFilters() {
  filters.search = ''
  filters.status = 'all'
  filters.type = 'all'
}
</script>

<template>
  <ProjectShell>
    <template #breadcrumb>Proyectos viales</template>
    <div class="project-page-heading">
      <div>
        <div class="project-eyebrow">GESTIÓN DE OBRAS VIALES</div>
        <h1>Proyectos</h1>
        <p>Consulta los proyectos y sus tramos registrados.</p>
      </div>
      <Button label="Nuevo proyecto" icon="pi pi-plus" @click="router.push({ name: 'projects-new' })" />
    </div>

    <div v-if="useFakeApi" class="project-stat-grid">
      <div class="project-stat"><span>PROYECTOS REGISTRADOS</span><strong>{{ counts.total }}</strong><small>En el portafolio de ejemplo</small></div>
      <div class="project-stat"><span>ÓPTIMOS</span><strong class="stat-good">{{ counts.optimal }}</strong><small>Parámetros dentro del estándar</small></div>
      <div class="project-stat"><span>EN OBSERVACIÓN</span><strong class="stat-warn">{{ counts.observation }}</strong><small>Seguimiento preventivo</small></div>
      <div class="project-stat"><span>CRÍTICOS</span><strong class="stat-danger">{{ counts.critical }}</strong><small>Requieren atención prioritaria</small></div>
    </div>

    <Message v-if="error" severity="error" :closable="false">{{ error }} <button type="button" class="project-retry" @click="loadProjects">Reintentar</button></Message>
    <Message v-else-if="loading" severity="info" :closable="false">Cargando proyectos...</Message>

    <section class="project-panel filters-panel" aria-label="Filtros de proyectos">
      <label class="project-search"><i class="pi pi-search" aria-hidden="true"></i><InputText v-model="filters.search" :placeholder="useFakeApi ? 'Buscar por nombre, código o ubicación' : 'Buscar por nombre o código'" aria-label="Buscar proyectos" /></label>
      <select v-if="useFakeApi" v-model="filters.status" aria-label="Filtrar por estado ambiental">
        <option value="all">Todos los estados</option>
        <option v-for="(value, key) in ENVIRONMENTAL_STATUSES" :key="key" :value="key">{{ value.label }}</option>
      </select>
      <select v-if="useFakeApi" v-model="filters.type" aria-label="Filtrar por tipo de obra">
        <option value="all">Todos los tipos de obra</option>
        <option v-for="type in PROJECT_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
      </select>
      <button type="button" class="project-clear" @click="clearFilters"><i class="pi pi-refresh" aria-hidden="true"></i> Limpiar</button>
    </section>

    <section class="project-panel project-list-panel">
      <div class="project-list-heading"><strong>{{ filteredProjects.length }} de {{ counts.total }} proyectos</strong><small>{{ useFakeApi ? 'Datos de la API simulada' : 'Datos del backend' }}</small></div>
      <div class="project-table-scroll">
        <table class="project-table">
          <thead><tr><th>PROYECTO / CÓDIGO</th><template v-if="useFakeApi"><th>UBICACIÓN</th><th>TIPO DE OBRA</th><th>ESTADO AMBIENTAL</th><th>SENSORES</th><th>ALERTAS</th><th>INCIDENTES</th></template><template v-else><th>ESTADO DEL PROYECTO</th><th>TRAMOS</th></template><th>ACCIÓN</th></tr></thead>
          <tbody>
            <tr v-for="project in filteredProjects" :key="project.id">
              <td><strong>{{ project.name }}</strong><small>{{ project.code }}<template v-if="useFakeApi"> · {{ project.concessionaireName }}</template></small></td>
              <template v-if="useFakeApi"><td>{{ project.location }}</td><td>{{ typeLabel(project.type) }}</td><td><Tag :severity="ENVIRONMENTAL_STATUSES[project.environmentalStatus].severity" :value="ENVIRONMENTAL_STATUSES[project.environmentalStatus].label" /><small class="status-note">{{ project.environmentalNote }}</small></td><td>{{ project.sensorCount }}</td><td>{{ project.alertCount }}</td><td>{{ project.incidentCount }}</td></template>
              <template v-else><td>{{ projectStatusLabel(project.status) }}</td><td>{{ project.sections?.length || 0 }}</td></template>
              <td><Button label="Ver proyecto" size="small" @click="router.push({ name: 'projects-detail', params: { id: project.id } })" /></td>
            </tr>
            <tr v-if="filteredProjects.length === 0"><td :colspan="useFakeApi ? 8 : 4" class="project-empty">No hay proyectos que coincidan con estos filtros.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </ProjectShell>
</template>
