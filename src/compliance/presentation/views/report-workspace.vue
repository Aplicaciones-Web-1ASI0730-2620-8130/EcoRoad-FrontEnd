<script setup>
import { computed, reactive, ref } from 'vue'
import Button from 'primevue/button'
import MonitoringShell from '../../../monitoring/presentation/components/monitoring-shell.vue'
import { buildReportPreview, REPORT_SECTIONS, validateReportCriteria } from '../../domain/report-preview.js'
import { getDemoReportSource } from '../../infrastructure/demo-report-source.js'
import '../reports.css'

const source = getDemoReportSource()
const today = new Date().toISOString().slice(0, 10)
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
const criteria = reactive({ projectId: source.projects.find((project) => project.id === 'prj-lima-canta')?.id || source.projects[0]?.id || '', from: weekAgo, to: today, sections: ['indicators', 'alerts'] })
const errors = ref({})
const preview = ref(null)
const configuredSections = computed(() => Object.entries(REPORT_SECTIONS))
const indicatorNames = { pm10: 'Material particulado PM10', noise: 'Ruido ambiental LAeq', ph: 'Calidad de agua · pH', vibration: 'Vibración' }
const indicatorUnits = { pm10: 'µg/m³', noise: 'dBA', ph: 'pH', vibration: 'mm/s' }
const dateLabel = (value) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

function toggleSection(section) {
  criteria.sections = criteria.sections.includes(section)
    ? criteria.sections.filter((item) => item !== section)
    : [...criteria.sections, section]
}

function refreshPreview() {
  errors.value = validateReportCriteria(criteria, source.projects, today)
  if (Object.keys(errors.value).length) return
  preview.value = buildReportPreview({ ...criteria, sections: [...criteria.sections] }, source)
}

refreshPreview()
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading reports-heading">
      <div><span class="monitoring-eyebrow">AUDITORÍA Y CUMPLIMIENTO</span><h1>Reportes ambientales</h1><p>Consolida indicadores y alertas por proyecto y periodo.</p></div>
      <span class="reports-demo-badge"><i class="pi pi-info-circle" aria-hidden="true"></i> Vista previa de demostración</span>
    </div>
    <div class="reports-notice" role="note"><i class="pi pi-info-circle" aria-hidden="true"></i> Esta primera versión muestra datos simulados. No genera un documento oficial ni certifica cumplimiento normativo.</div>

    <div class="reports-layout">
      <section class="reports-card reports-configuration" aria-labelledby="report-config-title">
        <div class="reports-section-title"><div><span>PASO 1 DE 2</span><h2 id="report-config-title"><i class="pi pi-sliders-h" aria-hidden="true"></i> Configuración</h2></div></div>
        <div class="reports-fields">
          <label>Proyecto vial <span aria-hidden="true">*</span>
            <select v-model="criteria.projectId" :aria-invalid="Boolean(errors.projectId)"><option v-for="project in source.projects" :key="project.id" :value="project.id">{{ project.name }}</option></select>
            <small v-if="errors.projectId" class="reports-error">{{ errors.projectId }}</small>
          </label>
          <div class="reports-dates">
            <label>Desde <span aria-hidden="true">*</span><input v-model="criteria.from" type="date" :max="today" :aria-invalid="Boolean(errors.from)" /><small v-if="errors.from" class="reports-error">{{ errors.from }}</small></label>
            <label>Hasta <span aria-hidden="true">*</span><input v-model="criteria.to" type="date" :max="today" :aria-invalid="Boolean(errors.to)" /><small v-if="errors.to" class="reports-error">{{ errors.to }}</small></label>
          </div>
        </div>
        <fieldset class="reports-sections"><legend>Contenido de la vista previa</legend>
          <label v-for="[key, label] in configuredSections" :key="key" :class="{ 'is-unavailable': key === 'incidents' || key === 'evidence' }">
            <input type="checkbox" :checked="criteria.sections.includes(key)" :disabled="key === 'incidents' || key === 'evidence'" @change="toggleSection(key)" />
            <span>{{ label }}<small>{{ key === 'incidents' || key === 'evidence' ? 'Fuente pendiente de integración' : 'Datos de demostración disponibles' }}</small></span>
          </label>
          <small v-if="errors.sections" class="reports-error">{{ errors.sections }}</small>
        </fieldset>
        <Button label="Actualizar vista previa" icon="pi pi-eye" class="reports-primary" @click="refreshPreview" />
      </section>

      <section class="reports-card reports-preview" aria-labelledby="report-preview-title">
        <div class="reports-section-title"><div><span>PASO 2 DE 2</span><h2 id="report-preview-title"><i class="pi pi-file" aria-hidden="true"></i> Vista previa</h2></div><span class="reports-preview-tag">BORRADOR</span></div>
        <template v-if="preview && !preview.errors">
          <div class="reports-preview-header"><strong>{{ preview.project.name }}</strong><span>{{ dateLabel(preview.period.from) }} – {{ dateLabel(preview.period.to) }}</span></div>
          <div class="reports-metrics">
            <div><span>LECTURAS</span><strong>{{ preview.sections.includes('indicators') ? preview.readingCount : '—' }}</strong><small>en el periodo</small></div>
            <div><span>INDICADORES</span><strong>{{ preview.sections.includes('indicators') ? preview.indicators.length : '—' }}</strong><small>parámetros registrados</small></div>
            <div><span>ALERTAS</span><strong>{{ preview.sections.includes('alerts') ? preview.alertCount : '—' }}</strong><small>{{ preview.criticalAlertCount }} crítica{{ preview.criticalAlertCount === 1 ? '' : 's' }} detectada{{ preview.criticalAlertCount === 1 ? '' : 's' }}</small></div>
          </div>
          <div v-if="preview.sections.includes('indicators')" class="reports-result"><h3>Resumen de indicadores</h3>
            <table v-if="preview.indicators.length"><thead><tr><th>Indicador</th><th>Lecturas</th><th>Mínimo</th><th>Máximo</th></tr></thead><tbody><tr v-for="item in preview.indicators" :key="item.parameterId"><td>{{ indicatorNames[item.parameterId] || item.parameterId }}</td><td>{{ item.count }}</td><td>{{ item.minimum }} {{ indicatorUnits[item.parameterId] || '' }}</td><td>{{ item.maximum }} {{ indicatorUnits[item.parameterId] || '' }}</td></tr></tbody></table>
            <p v-else class="reports-empty">No hay lecturas para este proyecto y periodo.</p>
          </div>
          <div v-if="preview.sections.includes('alerts')" class="reports-result"><h3>Alertas registradas</h3><p>{{ preview.alertCount }} alerta{{ preview.alertCount === 1 ? '' : 's' }} en el periodo, {{ preview.criticalAlertCount }} crítica{{ preview.criticalAlertCount === 1 ? '' : 's' }}.</p></div>
          <p class="reports-preview-footnote">Las fuentes de incidentes y evidencias estarán disponibles al integrar sus contextos. Esta vista no incluye firma, hash ni exportación PDF.</p>
        </template>
      </section>
    </div>
  </MonitoringShell>
</template>
