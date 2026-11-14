<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import MonitoringShell from '../../../monitoring/presentation/components/monitoring-shell.vue'
import { createComplianceBackendRepository } from '../../infrastructure/compliance-backend-repository.js'
import { getDemoCompanyId } from '../../../projects/infrastructure/demo-company.js'
import { currentUser } from '../../../iam/application/iam-session.js'
import '../reports.css'

const api = createComplianceBackendRepository({
  baseUrl: import.meta.env.VITE_COMPLIANCE_API_URL || new URL('/api/', window.location.origin).href,
  getCompanyId: getDemoCompanyId, getCurrentUser: () => currentUser.value,
})
const projects = ref([])
const projectId = ref('')
const today = new Date().toISOString().slice(0, 10)
const from = ref(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
const to = ref(today)
const evidence = ref(null)
const report = ref(null)
const signature = ref('')
const loading = ref(false)
const error = ref('')
const storageKey = `ecoroad.compliance.report-ids.${getDemoCompanyId()}`
const savedIds = ref(JSON.parse(localStorage.getItem(storageKey) || '[]'))
const hasEvidence = computed(() => evidence.value && ['monitoringRecordIds', 'alertIds', 'incidentIds', 'fieldEvidenceIds'].some((key) => evidence.value[key].length))
const counts = [ ['monitoringRecordIds', 'Mediciones'], ['alertIds', 'Alertas activas'], ['incidentIds', 'Incidentes'], ['fieldEvidenceIds', 'Evidencias de campo'] ]

async function run(action) {
  loading.value = true
  error.value = ''
  try { return await action() } catch (cause) { error.value = cause.message || 'No se pudo completar la operación.'; return null }
  finally { loading.value = false }
}
watch([projectId, from, to], () => { evidence.value = null; report.value = null })
async function preview() {
  if (!projectId.value || !from.value || !to.value || from.value > to.value || to.value > today) {
    error.value = 'Selecciona un proyecto y un rango de fechas válido.'
    return
  }
  evidence.value = await run(() => api.collectEvidence({ projectId: projectId.value, from: from.value, to: to.value }))
}
async function requestReport() {
  if (!evidence.value) return
  report.value = await run(() => api.requestReport(projectId.value))
  if (report.value) {
    savedIds.value = [report.value.id, ...savedIds.value.filter((id) => id !== report.value.id)]
    localStorage.setItem(storageKey, JSON.stringify(savedIds.value))
  }
}
async function generate() {
  if (!report.value || !evidence.value || !signature.value.trim()) return
  report.value = await run(() => api.generateReport(report.value.id, evidence.value, signature.value.trim())) || report.value
}
async function openReport(id) { evidence.value = null; report.value = await run(() => api.getReport(id)) }
async function download() {
  const blob = await run(() => api.downloadDocument(report.value.id))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `ecoroad-report-${report.value.id}.pdf`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
onMounted(async () => {
  const result = await run(() => api.listProjects())
  projects.value = result || []
  projectId.value = projects.value[0]?.id || ''
})
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading reports-heading"><div><span class="monitoring-eyebrow">AUDITORÍA Y CUMPLIMIENTO</span><h1>Reportes ambientales</h1><p>Consulta las fuentes disponibles, solicita el reporte y descarga el PDF generado por el backend.</p></div></div>
    <div class="reports-notice" role="note"><i class="pi pi-info-circle" aria-hidden="true"></i> El PDF del backend resume identificadores y cantidades. La firma se almacena como texto y no tiene verificación criptográfica; este documento no certifica cumplimiento normativo.</div>
    <div v-if="error" class="reports-api-error" role="alert">{{ error }}</div>
    <div class="reports-layout">
      <section class="reports-card reports-configuration"><div class="reports-section-title"><div><span>PASO 1</span><h2>Fuentes del proyecto</h2></div></div>
        <div class="reports-fields"><label>Proyecto vial<select v-model="projectId"><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option></select></label>
          <div class="reports-dates"><label>Desde<input v-model="from" type="date" :max="today" /></label><label>Hasta<input v-model="to" type="date" :max="today" /></label></div></div>
        <Button label="Consultar fuentes" icon="pi pi-search" :loading="loading" :disabled="!projectId" @click="preview" />
        <p class="reports-preview-footnote">La API de alertas devuelve solo alertas activas. El backend no ofrece un listado histórico de reportes.</p>
      </section>
      <section class="reports-card reports-preview"><div class="reports-section-title"><div><span>PASO 2</span><h2>Solicitud y generación</h2></div></div>
        <template v-if="evidence"><div class="reports-preview-header"><strong>{{ evidence.project.name }}</strong><span>{{ evidence.period.from }} – {{ evidence.period.to }}</span></div>
          <div class="reports-metrics"><div v-for="[key, label] in counts" :key="key"><span>{{ label }}</span><strong>{{ evidence[key].length }}</strong></div></div>
          <Button v-if="!report" label="Solicitar reporte" icon="pi pi-file-plus" :loading="loading" :disabled="!hasEvidence" @click="requestReport" /><p v-if="!hasEvidence" class="reports-empty">No hay fuentes para generar un reporte en este periodo.</p>
        </template><p v-else class="reports-empty">Consulta las fuentes para comenzar.</p>
        <div v-if="report" class="reports-generated"><strong>Reporte {{ report.status === 'Generated' ? 'generado' : 'solicitado' }}</strong><span>ID: {{ report.id }}</span><span v-if="report.contentHash">SHA-256 de referencias: {{ report.contentHash }}</span>
          <template v-if="!report.isSealed && evidence"><label>Texto de firma o referencia interna<input v-model="signature" type="text" maxlength="2000" /></label><Button label="Generar PDF" :disabled="!signature.trim()" :loading="loading" @click="generate" /></template>
          <Button v-if="report.isSealed" label="Descargar PDF" icon="pi pi-download" :loading="loading" @click="download" />
        </div>
      </section>
    </div>
    <section class="reports-card reports-saved"><div class="reports-section-title"><div><span>EN ESTE NAVEGADOR</span><h2>Reportes conocidos</h2></div><strong>{{ savedIds.length }}</strong></div><p v-if="!savedIds.length" class="reports-empty">Aún no hay reportes guardados en este navegador.</p><div v-else class="reports-saved-list"><button v-for="id in savedIds" :key="id" type="button" @click="openReport(id)"><span><strong>{{ id }}</strong></span><span>Consultar <i class="pi pi-arrow-right" aria-hidden="true"></i></span></button></div></section>
  </MonitoringShell>
</template>
