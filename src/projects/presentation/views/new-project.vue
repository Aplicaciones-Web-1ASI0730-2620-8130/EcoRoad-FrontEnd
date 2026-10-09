<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProjectShell from '../components/project-shell.vue'
import RoadSectionFields from '../components/road-section-fields.vue'
import { PROJECT_TYPES } from '../../domain/road-project.js'
import { useProjects } from '../../application/use-projects.js'

const router = useRouter()
const { registerProject } = useProjects()
const emptySection = () => ({ name: '', startPk: '', endPk: '', workFront: '' })
const form = reactive({ name: '', location: '', type: '', concessionaireName: '', sections: [emptySection()] })
const errors = ref({})

function addSection() {
  form.sections.push(emptySection())
}

function removeSection(index) {
  form.sections.splice(index, 1)
  errors.value = {}
}

function submit() {
  const result = registerProject(form)
  errors.value = result.errors
  if (result.project) router.push({ name: 'projects-detail', params: { id: result.project.id }, query: { created: '1' } })
}
</script>

<template>
  <ProjectShell>
    <template #breadcrumb>Proyectos / Nuevo proyecto</template>
    <div class="project-form-wrap">
      <div class="project-page-heading">
        <div>
          <div class="project-eyebrow">ALTA DE PROYECTO</div>
          <h1>Nuevo proyecto vial</h1>
          <p>Registra la información principal de la obra y su concesión.</p>
        </div>
      </div>
      <Message severity="info" :closable="false">Los proyectos y tramos de esta versión se conservan solo durante la sesión. La siguiente versión conectará la fake API.</Message>
      <form class="project-panel new-project-form" novalidate @submit.prevent="submit">
        <div class="project-form-section-title"><span>01</span><div><h2>Información del proyecto</h2><p>Datos oficiales de la concesión y del corredor vial.</p></div></div>
        <div class="project-field">
          <label for="project-name">Nombre del proyecto <b>*</b></label>
          <InputText id="project-name" v-model="form.name" placeholder="Ej. Carretera Lima - Canta" :invalid="!!errors.name" />
          <small v-if="errors.name" class="project-field-error">{{ errors.name }}</small>
        </div>
        <div class="project-field">
          <label for="project-location">Ubicación <b>*</b></label>
          <InputText id="project-location" v-model="form.location" placeholder="Ej. Lima · PK 00+000 a 112+000" :invalid="!!errors.location" />
          <small v-if="errors.location" class="project-field-error">{{ errors.location }}</small>
        </div>
        <div class="project-form-grid">
          <div class="project-field">
            <label for="project-type">Tipo de obra <b>*</b></label>
            <select id="project-type" v-model="form.type" :aria-invalid="!!errors.type">
              <option value="" disabled>Selecciona un tipo</option>
              <option v-for="type in PROJECT_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option>
            </select>
            <small v-if="errors.type" class="project-field-error">{{ errors.type }}</small>
          </div>
          <div class="project-field">
            <label for="concessionaire">Entidad concesionaria <b>*</b></label>
            <InputText id="concessionaire" v-model="form.concessionaireName" placeholder="Ej. Consorcio Vial Sierra Central S.A.C." :invalid="!!errors.concessionaireName" />
            <small v-if="errors.concessionaireName" class="project-field-error">{{ errors.concessionaireName }}</small>
          </div>
        </div>
        <div class="project-form-section-title project-form-section-divider"><span>02</span><div><h2>Tramos y frentes de trabajo</h2><p>Divide el corredor en progresivas sin superposición.</p></div></div>
        <small v-if="errors.roadSections?.sections" class="project-field-error">{{ errors.roadSections.sections }}</small>
        <div v-for="(section, index) in form.sections" :key="index" class="project-section-editor">
          <div class="project-section-editor-heading"><strong>Tramo {{ String(index + 1).padStart(2, '0') }}</strong><Button v-if="form.sections.length > 1" type="button" label="Quitar tramo" icon="pi pi-trash" severity="danger" text size="small" @click="removeSection(index)" /></div>
          <RoadSectionFields :section="section" :errors="errors.roadSections?.items?.[index]" :prefix="`new-section-${index}`" @change="form.sections[index] = $event" />
        </div>
        <Button type="button" label="Agregar otro tramo" icon="pi pi-plus-circle" outlined class="project-add-section" @click="addSection" />
        <div class="project-form-actions">
          <Button type="button" label="Cancelar" severity="secondary" outlined @click="router.push({ name: 'projects-list' })" />
          <Button type="submit" label="Registrar proyecto" icon="pi pi-check" />
        </div>
      </form>
    </div>
  </ProjectShell>
</template>
