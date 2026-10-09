<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProjectShell from '../components/project-shell.vue'
import { ENVIRONMENTAL_STATUSES, PROJECT_TYPES } from '../../domain/road-project.js'
import { useProjects } from '../../application/use-projects.js'

const route = useRoute()
const router = useRouter()
const { findProject } = useProjects()
const project = computed(() => findProject(route.params.id))
const typeLabel = computed(() => PROJECT_TYPES.find((type) => type.value === project.value?.type)?.label || '')
</script>

<template>
  <ProjectShell>
    <template #breadcrumb>Proyectos / Detalle</template>
    <div class="project-detail-page">
      <Button label="Volver a proyectos" icon="pi pi-arrow-left" text @click="router.push({ name: 'projects-list' })" />
      <Message v-if="route.query.created === '1'" severity="success" :closable="false">Proyecto registrado en esta sesión de demostración.</Message>
      <div v-if="!project" class="project-panel project-empty-detail">
        <h1>Proyecto no encontrado</h1>
        <p>Vuelve al listado para elegir un proyecto disponible.</p>
      </div>
      <template v-else>
        <div class="project-page-heading">
          <div>
            <div class="project-eyebrow">{{ project.code }}</div>
            <h1>{{ project.name }}</h1>
            <p>{{ typeLabel }} · {{ project.location }}</p>
          </div>
          <Tag :severity="ENVIRONMENTAL_STATUSES[project.environmentalStatus].severity" :value="ENVIRONMENTAL_STATUSES[project.environmentalStatus].label" />
        </div>
        <div class="project-detail-grid">
          <section class="project-panel"><h2>Información general</h2><dl><div><dt>Entidad concesionaria</dt><dd>{{ project.concessionaireName }}</dd></div><div><dt>Tipo de obra</dt><dd>{{ typeLabel }}</dd></div><div><dt>Ubicación</dt><dd>{{ project.location }}</dd></div></dl></section>
          <section class="project-panel"><h2>Resumen ambiental</h2><p>{{ project.environmentalNote }}</p><div class="detail-metrics"><span><strong>{{ project.sensorCount }}</strong>Sensores</span><span><strong>{{ project.alertCount }}</strong>Alertas</span><span><strong>{{ project.incidentCount }}</strong>Incidentes</span></div></section>
        </div>
        <section class="project-panel project-sections-empty"><h2>Tramos y frentes de trabajo</h2><p>No hay tramos configurados para mostrar en esta vista.</p></section>
      </template>
    </div>
  </ProjectShell>
</template>

