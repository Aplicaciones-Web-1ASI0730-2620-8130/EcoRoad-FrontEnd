<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import ProjectShell from '../components/project-shell.vue'
import { ENVIRONMENTAL_STATUSES, PROJECT_TYPES } from '../../domain/road-project.js'
import { useProjects } from '../../application/use-projects.js'

const router = useRouter()
const { counts, filterProjects } = useProjects()
const filters = reactive({ search: '', status: 'all', type: 'all' })
const filteredProjects = computed(() => filterProjects(filters))
const typeLabel = (type) => PROJECT_TYPES.find((item) => item.value === type)?.label || type

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
        <p>Consulta el estado ambiental de tus proyectos y sus frentes de trabajo.</p>
      </div>
      <Button label="Nuevo proyecto" icon="pi pi-plus" @click="router.push({ name: 'projects-new' })" />
    </div>

    <div class="project-stat-grid">
      <div class="project-stat"><span>PROYECTOS REGISTRADOS</span><strong>{{ counts.total }}</strong><small>En el portafolio de ejemplo</small></div>
      <div class="project-stat"><span>ÓPTIMOS</span><strong class="stat-good">{{ counts.optimal }}</strong><small>Parámetros dentro del estándar</small></div>
      <div class="project-stat"><span>EN OBSERVACIÓN</span><strong class="stat-warn">{{ counts.observation }}</strong><small>Seguimiento preventivo</small></div>
      <div class="project-stat"><span>CRÍTICOS</span><strong class="stat-danger">{{ counts.critical }}</strong><small>Requieren atención prioritaria</small></div>
    </div>

    <section class="project-panel filters-panel" aria-label="Filtros de proyectos">
      <label class="project-search"><i class="pi pi-search" aria-hidden="true"></i><InputText v-model="filters.search" placeholder="Buscar por nombre, código o ubicación" aria-label="Buscar proyectos" /></label>
      <select v-model="filters.status" aria-label="Filtrar por estado ambiental">
        <option value="all">Todos los estados</option>
        <option v-for="(value, key) in ENVIRONMENTAL_STATUSES" :key="key" :value="key">{{ value.label }}</option>
      </select>
      <select v-model="filters.type" aria-label="Filtrar por tipo de obra">
        <option value="all">Todos los tipos de obra</option>
        <option v-for="type in PROJECT_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
      </select>
      <button type="button" class="project-clear" @click="clearFilters"><i class="pi pi-refresh" aria-hidden="true"></i> Limpiar</button>
    </section>

    <section class="project-panel project-list-panel">
      <div class="project-list-heading"><strong>{{ filteredProjects.length }} de {{ counts.total }} proyectos</strong><small>Datos de ejemplo para la interfaz</small></div>
      <div class="project-table-scroll">
        <table class="project-table">
          <thead><tr><th>PROYECTO / CÓDIGO</th><th>UBICACIÓN</th><th>TIPO DE OBRA</th><th>ESTADO AMBIENTAL</th><th>SENSORES</th><th>ALERTAS</th><th>INCIDENTES</th><th>ACCIÓN</th></tr></thead>
          <tbody>
            <tr v-for="project in filteredProjects" :key="project.id">
              <td><strong>{{ project.name }}</strong><small>{{ project.code }} · {{ project.concessionaireName }}</small></td>
              <td>{{ project.location }}</td>
              <td>{{ typeLabel(project.type) }}</td>
              <td><Tag :severity="ENVIRONMENTAL_STATUSES[project.environmentalStatus].severity" :value="ENVIRONMENTAL_STATUSES[project.environmentalStatus].label" /><small class="status-note">{{ project.environmentalNote }}</small></td>
              <td>{{ project.sensorCount }}</td>
              <td>{{ project.alertCount }}</td>
              <td>{{ project.incidentCount }}</td>
              <td><Button label="Ver proyecto" size="small" @click="router.push({ name: 'projects-detail', params: { id: project.id } })" /></td>
            </tr>
            <tr v-if="filteredProjects.length === 0"><td colspan="8" class="project-empty">No hay proyectos que coincidan con estos filtros.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </ProjectShell>
</template>

