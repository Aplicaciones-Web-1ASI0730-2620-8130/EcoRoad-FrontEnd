<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProjectShell from '../components/project-shell.vue'
import RoadSectionFields from '../components/road-section-fields.vue'
import { ENVIRONMENTAL_STATUSES, PROJECT_TYPES } from '../../domain/road-project.js'
import { useProjects } from '../../application/use-projects.js'

const route = useRoute()
const router = useRouter()
const { findProject, loadProject, saveSection, removeSection, loading, error } = useProjects()
const project = computed(() => findProject(route.params.id))
const typeLabel = computed(() => PROJECT_TYPES.find((type) => type.value === project.value?.type)?.label || '')
onMounted(() => loadProject(route.params.id))
watch(() => route.params.id, (id) => { if (id) loadProject(id) })
const sectionDraft = ref(null)
const sectionErrors = ref({})
const sectionNotice = ref('')

function editSection(section = null) {
  sectionDraft.value = section ? { ...section } : { name: '', startPk: '', endPk: '', workFront: '' }
  sectionErrors.value = {}
  sectionNotice.value = ''
}

async function submitSection() {
  const result = await saveSection(project.value.id, sectionDraft.value)
  if (result.errors) {
    sectionErrors.value = result.errors
    return
  }
  if (result.error) {
    sectionNotice.value = result.error
    return
  }
  sectionNotice.value = sectionDraft.value.id ? 'Tramo actualizado.' : 'Tramo agregado.'
  sectionDraft.value = null
}

async function deleteSection(section) {
  if (!window.confirm(`¿Eliminar el tramo ${section.name}?`)) return
  if (await removeSection(project.value.id, section.id)) {
    if (sectionDraft.value?.id === section.id) sectionDraft.value = null
    sectionNotice.value = 'Tramo eliminado.'
  }
}
</script>

<template>
  <ProjectShell>
    <template #breadcrumb>Proyectos / Detalle</template>
    <div class="project-detail-page">
      <Button label="Volver a proyectos" icon="pi pi-arrow-left" text @click="router.push({ name: 'projects-list' })" />
      <Message v-if="project && route.query.created === '1'" severity="success" :closable="false">Proyecto registrado en la fake API local.</Message>
      <Message v-if="error" severity="error" :closable="false">{{ error }} <button type="button" class="project-retry" @click="loadProject(route.params.id)">Reintentar</button></Message>
      <Message v-if="loading && !project" severity="info" :closable="false">Cargando proyecto...</Message>
      <div v-if="!project && !loading && !error" class="project-panel project-empty-detail">
        <h1>Proyecto no encontrado</h1>
        <p>Vuelve al listado para elegir un proyecto disponible.</p>
      </div>
      <template v-if="project">
        <div class="project-page-heading">
          <div>
            <div class="project-eyebrow">{{ project.code }}</div>
            <h1>{{ project.name }}</h1>
            <p>{{ typeLabel }} · {{ project.location }}</p>
          </div>
          <Tag :severity="ENVIRONMENTAL_STATUSES[project.environmentalStatus].severity" :value="ENVIRONMENTAL_STATUSES[project.environmentalStatus].label" />
        </div>
        <Button label="Ver monitoreo ambiental" icon="pi pi-chart-line" outlined @click="router.push({ name: 'monitoring-dashboard', query: { projectId: project.id } })" />
        <div class="project-detail-grid">
          <section class="project-panel"><h2>Información general</h2><dl><div><dt>Entidad concesionaria</dt><dd>{{ project.concessionaireName }}</dd></div><div><dt>Tipo de obra</dt><dd>{{ typeLabel }}</dd></div><div><dt>Ubicación</dt><dd>{{ project.location }}</dd></div></dl></section>
          <section class="project-panel"><h2>Resumen ambiental</h2><p>{{ project.environmentalNote }}</p><div class="detail-metrics"><span><strong>{{ project.sensorCount }}</strong>Sensores</span><span><strong>{{ project.alertCount }}</strong>Alertas</span><span><strong>{{ project.incidentCount }}</strong>Incidentes</span></div></section>
        </div>
        <section class="project-panel project-sections-panel">
          <div class="project-sections-heading"><div><h2>Tramos y frentes de trabajo</h2><p>{{ project.sections.length }} {{ project.sections.length === 1 ? 'tramo configurado' : 'tramos configurados' }} para este corredor vial.</p></div><Button label="Agregar tramo" icon="pi pi-plus" outlined @click="editSection()" /></div>
          <Message v-if="sectionNotice" severity="success" :closable="false">{{ sectionNotice }}</Message>
          <p v-if="project.sections.length === 0" class="project-empty-sections">No hay tramos configurados. Agrega uno para organizar los frentes de trabajo.</p>
          <div v-else class="project-section-list">
            <article v-for="(section, index) in project.sections" :key="section.id" class="project-section-card">
              <span class="project-section-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="project-section-summary"><strong>{{ section.name }}</strong><span>PK {{ section.startPk }} a {{ section.endPk }}</span><small>Frente: {{ section.workFront }}</small></div>
              <Tag value="Activo" severity="success" />
              <div class="project-section-actions"><Button label="Editar" icon="pi pi-pencil" text size="small" :disabled="loading" @click="editSection(section)" /><Button label="Eliminar" icon="pi pi-trash" severity="danger" text size="small" :disabled="loading || project.sections.length === 1" :title="project.sections.length === 1 ? 'El proyecto debe conservar un tramo' : ''" @click="deleteSection(section)" /></div>
            </article>
          </div>
          <form v-if="sectionDraft" class="project-section-detail-editor" novalidate @submit.prevent="submitSection">
            <h3>{{ sectionDraft.id ? 'Editar tramo' : 'Nuevo tramo' }}</h3>
            <RoadSectionFields :section="sectionDraft" :errors="sectionErrors" prefix="detail-section" @change="sectionDraft = $event" />
            <div class="project-form-actions"><Button type="button" label="Cancelar" severity="secondary" outlined @click="sectionDraft = null" /><Button type="submit" label="Guardar tramo" icon="pi pi-check" :loading="loading" /></div>
          </form>
        </section>
      </template>
    </div>
  </ProjectShell>
</template>
