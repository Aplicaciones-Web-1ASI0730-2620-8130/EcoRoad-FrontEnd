<script setup>
import InputText from 'primevue/inputtext'

const props = defineProps({
  section: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  prefix: { type: String, required: true },
})
const emit = defineEmits(['change'])
const change = (field, value) => emit('change', { ...props.section, [field]: value })
</script>

<template>
  <div class="project-field">
    <label :for="`${prefix}-name`">Nombre del tramo <b>*</b></label>
    <InputText :id="`${prefix}-name`" :model-value="section.name" placeholder="Ej. Trapiche - Chorrillos" :invalid="!!errors.name" @update:model-value="change('name', $event)" />
    <small v-if="errors.name" class="project-field-error">{{ errors.name }}</small>
  </div>
  <div class="project-form-grid">
    <div class="project-field">
      <label :for="`${prefix}-start`">PK inicial <b>*</b></label>
      <InputText :id="`${prefix}-start`" :model-value="section.startPk" placeholder="00+000" :invalid="!!errors.startPk || !!errors.range" @update:model-value="change('startPk', $event)" />
      <small v-if="errors.startPk" class="project-field-error">{{ errors.startPk }}</small>
    </div>
    <div class="project-field">
      <label :for="`${prefix}-end`">PK final <b>*</b></label>
      <InputText :id="`${prefix}-end`" :model-value="section.endPk" placeholder="32+000" :invalid="!!errors.endPk || !!errors.range" @update:model-value="change('endPk', $event)" />
      <small v-if="errors.endPk" class="project-field-error">{{ errors.endPk }}</small>
    </div>
  </div>
  <small v-if="errors.range" class="project-field-error project-range-error">{{ errors.range }}</small>
  <div class="project-field">
    <label :for="`${prefix}-front`">Frente de trabajo <b>*</b></label>
    <InputText :id="`${prefix}-front`" :model-value="section.workFront" placeholder="Ej. Movimiento de tierras" :invalid="!!errors.workFront" @update:model-value="change('workFront', $event)" />
    <small v-if="errors.workFront" class="project-field-error">{{ errors.workFront }}</small>
  </div>
</template>
