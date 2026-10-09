<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import MonitoringShell from '../../../monitoring/presentation/components/monitoring-shell.vue'
import { currentUser } from '../../../iam/application/iam-session.js'
import { INCIDENT_STATUSES } from '../../domain/incident.js'
import { useIncidents } from '../../application/use-incidents.js'
import '../incidents.css'

const store = useIncidents()
const route = useRoute()
onMounted(async () => {
  await store.load()
  const alertId = route.query.alert
  if (typeof alertId === 'string' && store.alerts.value.some((alert) => alert.id === alertId)) {
    const existing = store.incidents.value.find((incident) => incident.alertId === alertId)
    if (existing) store.selectedId.value = existing.id
    else if (can('manage_incidents')) { createDraft.alertId = alertId; createOpen.value = true }
  }
})
const statuses = Object.entries(INCIDENT_STATUSES)
const counts = computed(() => Object.fromEntries(statuses.map(([status]) => [status, store.incidents.value.filter((item) => item.status === status).length])))
const projects = computed(() => [...new Map(store.incidents.value.map((item) => [item.projectId, item.projectName])).entries()])
const selected = store.selected
const createOpen = ref(false)
const createDraft = reactive({ alertId: '', description: '' })
const assigneeId = ref('')
const actionNote = ref('')
const evidenceNote = ref('')
const evidenceFile = ref(null)
const fileInputKey = ref(0)
const feedback = ref('')
const availableAlerts = computed(() => store.alerts.value.filter((alert) => !store.incidents.value.some((item) => item.alertId === alert.id)))
const can = (permission) => currentUser.value?.permissions?.includes(permission)
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'

async function submitCreate() {
  if (await store.create(createDraft.alertId, createDraft.description)) {
    createOpen.value = false
    Object.assign(createDraft, { alertId: '', description: '' })
    feedback.value = 'Incidente registrado en la fake API.'
  }
}
async function assign() {
  if (await store.assign(selected.value.id, assigneeId.value)) feedback.value = 'Responsable asignado.'
}
async function addAction() {
  if (await store.addAction(selected.value.id, actionNote.value)) { actionNote.value = ''; feedback.value = 'Acción correctiva registrada.' }
}
async function addEvidence() {
  let attachment = null
  if (evidenceFile.value) {
    const file = evidenceFile.value
    if (file.size > 2_000_000 || !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
      store.error.value = 'Adjunta un PNG, JPG o PDF de hasta 2 MB.'
      return
    }
    const dataBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    attachment = { name: file.name, mimeType: file.type, dataBase64 }
  }
  if (await store.addEvidence(selected.value.id, evidenceNote.value, attachment)) {
    evidenceNote.value = ''
    evidenceFile.value = null
    fileInputKey.value += 1
    feedback.value = 'Evidencia de campo registrada.'
  }
}
async function downloadEvidence(evidence) {
  const blob = await store.downloadEvidence(selected.value.id, evidence.id)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = evidence.attachment.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function move(next) {
  const success = next === 'resolved' ? await store.resolve(selected.value.id) : await store.close(selected.value.id)
  if (success) feedback.value = next === 'resolved' ? 'Incidente resuelto.' : 'Cierre formal registrado.'
}
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading incident-heading"><div><span class="monitoring-eyebrow">RESPUESTA OPERATIVA</span><h1>Incidentes y remediación</h1><p>Asigna responsables, registra medidas correctivas y documenta la resolución ambiental.</p></div><Button v-if="can('manage_incidents')" label="Registrar incidente" icon="pi pi-plus" @click="createOpen = !createOpen" /></div>
    <div class="incident-note" role="note"><i class="pi pi-info-circle" aria-hidden="true"></i> Fake API local: los cambios se conservan al recargar y se reinician al reiniciar el servidor.</div>
    <div v-if="store.error.value" class="incident-error" role="alert">{{ store.error.value }}</div>
    <div v-if="feedback" class="incident-feedback" role="status">{{ feedback }}</div>

    <form v-if="createOpen" class="incident-panel incident-create" @submit.prevent="submitCreate"><div class="incident-panel-header"><h2>Nuevo incidente vinculado a una alerta</h2><button type="button" class="incident-text-button" @click="createOpen = false">Cancelar</button></div><div class="incident-create-grid"><label>Alerta ambiental<select v-model="createDraft.alertId" required><option value="" disabled>Selecciona una alerta sin incidente</option><option v-for="alert in availableAlerts" :key="alert.id" :value="alert.id">{{ alert.id }} · {{ alert.indicator }} · {{ alert.projectName }}</option></select></label><label>Descripción del impacto<textarea v-model="createDraft.description" required rows="2" placeholder="Describe lo detectado en el frente de trabajo"></textarea></label></div><Button label="Abrir incidente" type="submit" :disabled="!availableAlerts.length" /></form>

    <div class="incident-summary"><button v-for="[status, detail] in statuses" :key="status" type="button" :class="['incident-summary-card', status, { active: store.filters.value.status === status }]" @click="store.filters.value.status = store.filters.value.status === status ? 'all' : status"><span>{{ detail.label.toUpperCase() }}</span><strong>{{ counts[status] }}</strong><small>{{ status === 'pending' ? 'Por asignar' : status === 'in_progress' ? 'Medidas en curso' : status === 'resolved' ? 'Listos para cierre' : 'Expedientes cerrados' }}</small></button></div>

    <section class="incident-filters" aria-label="Filtros de incidentes"><label>Proyecto<select v-model="store.filters.value.projectId"><option value="all">Todos los proyectos</option><option v-for="[id, name] in projects" :key="id" :value="id">{{ name }}</option></select></label><label>Estado<select v-model="store.filters.value.status"><option value="all">Todos los estados</option><option v-for="[status, detail] in statuses" :key="status" :value="status">{{ detail.label }}</option></select></label><label>Buscar<input v-model="store.filters.value.search" type="search" placeholder="Código, proyecto o indicador" /></label><button type="button" class="incident-text-button" @click="store.filters.value = { status: 'all', projectId: 'all', search: '' }">Limpiar filtros</button></section>

    <div class="incident-layout"><section class="incident-board" aria-label="Tablero de incidentes"><div v-for="[status, detail] in statuses" :key="status" class="incident-column"><div class="incident-column-title"><h2>{{ detail.label }}</h2><span>{{ store.visible.value.filter(item => item.status === status).length }}</span></div><button v-for="incident in store.visible.value.filter(item => item.status === status)" :key="incident.id" type="button" :class="['incident-card', { selected: selected?.id === incident.id }]" :aria-pressed="selected?.id === incident.id" @click="store.selectedId.value = incident.id; assigneeId = incident.assignee?.id || ''; feedback = ''"><span class="incident-card-top"><strong>{{ incident.id }}</strong><span :class="['incident-risk', incident.risk]">{{ incident.risk === 'critical' ? 'Crítico' : 'En observación' }}</span></span><strong>{{ incident.title }}</strong><small>{{ incident.projectName }}</small><small>{{ incident.sectionName }}</small><span class="incident-card-bottom">{{ incident.assignee?.name || 'Sin responsable' }} <time :datetime="incident.openedAt">{{ formatDate(incident.openedAt) }}</time></span></button><div v-if="!store.visible.value.some(item => item.status === status)" class="incident-column-empty">Sin incidentes</div></div></section>

    <aside class="incident-panel incident-detail" aria-label="Detalle del incidente"><template v-if="selected"><div class="incident-panel-header"><div><span class="monitoring-eyebrow">EXPEDIENTE · {{ selected.id }}</span><h2>{{ selected.title }}</h2><p>{{ selected.projectName }} · {{ selected.sectionName }}</p></div><span :class="['incident-status', selected.status]">{{ INCIDENT_STATUSES[selected.status].label }}</span></div><p class="incident-description">{{ selected.description }}</p><dl class="incident-facts"><div><dt>Alerta vinculada</dt><dd>{{ selected.alertId }}</dd></div><div><dt>Riesgo</dt><dd>{{ selected.risk === 'critical' ? 'Crítico' : 'En observación' }}</dd></div><div><dt>Detectado</dt><dd>{{ formatDate(selected.openedAt) }}</dd></div><div><dt>Responsable</dt><dd>{{ selected.assignee?.name || 'Pendiente' }}</dd></div></dl>
      <section v-if="can('manage_incidents') && ['pending', 'in_progress'].includes(selected.status)" class="incident-step"><h3>Asignar responsable</h3><select v-model="assigneeId" aria-label="Colaborador responsable"><option value="">Selecciona un colaborador</option><option v-for="user in store.collaborators.value.filter(item => item.access.status === 'active')" :key="user.id" :value="user.id">{{ user.name }}</option></select><Button label="Asignar y continuar" size="small" :disabled="!assigneeId" @click="assign" /></section>
      <section class="incident-step"><h3>Acciones correctivas <span>{{ selected.actions.length }}</span></h3><ul v-if="selected.actions.length"><li v-for="action in selected.actions" :key="action.id">{{ action.description }}<small>{{ formatDate(action.recordedAt) }}</small></li></ul><p v-else>Aún no hay medidas registradas.</p><template v-if="can('corrective_actions') && selected.status === 'in_progress'"><textarea v-model="actionNote" rows="2" aria-label="Nueva acción correctiva" placeholder="Ej. Riego de vías o instalación de barreras acústicas"></textarea><Button label="Registrar acción" size="small" outlined :disabled="!actionNote.trim()" @click="addAction" /></template></section>
      <section class="incident-step"><h3>Evidencias de campo <span>{{ selected.evidence.length }}</span></h3><ul v-if="selected.evidence.length"><li v-for="evidence in selected.evidence" :key="evidence.id">{{ evidence.note }}<small>{{ formatDate(evidence.recordedAt) }}</small><button v-if="evidence.attachment" type="button" class="incident-text-button" :title="`SHA-256: ${evidence.attachment.sha256}`" @click="downloadEvidence(evidence)"><i class="pi pi-download" aria-hidden="true"></i> {{ evidence.attachment.name }}</button></li></ul><p v-else>No hay evidencia documentada.</p><template v-if="can('field_evidence') && selected.status === 'in_progress'"><textarea v-model="evidenceNote" rows="2" aria-label="Nueva evidencia de campo" placeholder="Describe la foto, medición o verificación de campo"></textarea><input :key="fileInputKey" type="file" accept="image/png,image/jpeg,application/pdf" aria-label="Adjuntar evidencia (opcional)" @change="evidenceFile = $event.target.files?.[0] || null" /><small>PNG, JPG o PDF, hasta 2 MB. Se calcula SHA-256 en la fake API.</small><Button label="Registrar evidencia" size="small" outlined :disabled="!evidenceNote.trim() || store.loading.value" @click="addEvidence" /></template></section>
      <div v-if="can('manage_incidents')" class="incident-close"><Button v-if="selected.status === 'in_progress'" label="Marcar resuelto" :disabled="!selected.actions.length || !selected.evidence.length" @click="move('resolved')" /><Button v-else-if="selected.status === 'resolved'" label="Cerrar incidente" @click="move('closed')" /></div>
    </template><div v-else class="incident-empty">Selecciona un incidente para consultar su expediente.</div></aside></div>
  </MonitoringShell>
</template>
