<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import MonitoringShell from '../../../monitoring/presentation/components/monitoring-shell.vue'
import { ASSET_STATUSES, SENSOR_TYPES, canReport, isCalibrationValid, validateMonitoringPoint, validateSensorAsset } from '../../domain/monitoring-asset.js'
import { parseKilometerPost } from '../../../projects/domain/road-section.js'
import { useAssets } from '../../application/use-assets.js'
import '../assets.css'

const store = useAssets()
const selectedId = ref(null)
const selected = computed(() => store.sensors.value.find((sensor) => sensor.id === selectedId.value) || null)
const selectedPoint = computed(() => store.points.value.find((point) => point.id === selected.value?.pointId) || null)
const filters = reactive({ projectId: 'all', status: 'all', search: '' })
const visibleSensors = computed(() => store.sensors.value.filter((sensor) =>
  (filters.projectId === 'all' || sensor.projectId === filters.projectId) &&
  (filters.status === 'all' || sensor.status === filters.status) &&
  (!filters.search.trim() || `${sensor.code} ${sensor.name} ${sensor.serialNumber}`.toLocaleLowerCase('es').includes(filters.search.trim().toLocaleLowerCase('es'))),
))
const mapProjectId = ref('')
const mapProject = computed(() => store.projects.value.find((project) => project.id === mapProjectId.value))
const mapPoints = computed(() => store.points.value.filter((point) => point.projectId === mapProjectId.value))
const mapStart = computed(() => Math.min(...(mapProject.value?.sections || []).map((section) => parseKilometerPost(section.startPk))))
const mapEnd = computed(() => Math.max(...(mapProject.value?.sections || []).map((section) => parseKilometerPost(section.endPk))))
const markerX = (point) => 42 + 510 * (parseKilometerPost(point.pk) - mapStart.value) / Math.max(1, mapEnd.value - mapStart.value)
const markerY = (point) => 138 - 70 * (parseKilometerPost(point.pk) - mapStart.value) / Math.max(1, mapEnd.value - mapStart.value)
const projectName = (id) => store.projects.value.find((project) => project.id === id)?.name || 'Sin proyecto'
const pointName = (id) => store.points.value.find((point) => point.id === id)?.name || 'Sin asignar'
const assignedCount = (id) => store.sensors.value.filter((sensor) => sensor.pointId === id).length
const formatDate = (value) => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin registro'

const pointFormOpen = ref(false)
const editingPointId = ref(null)
const pointDraft = reactive({ projectId: '', sectionId: '', name: '', pk: '', latitude: '', longitude: '' })
const pointProject = computed(() => store.projects.value.find((project) => project.id === pointDraft.projectId))
const pointErrors = ref({})
const sensorFormOpen = ref(false)
const sensorDraft = reactive({ name: '', serialNumber: '', type: 'pm10' })
const sensorErrors = ref({})
const assignmentPointId = ref('')
const calibrationUntil = ref('')
const feedback = ref('')

watch(visibleSensors, (items) => {
  if (!items.some((item) => item.id === selectedId.value)) selectedId.value = items[0]?.id || null
})
watch(selectedId, () => {
  assignmentPointId.value = selected.value?.pointId || ''
  calibrationUntil.value = ''
  feedback.value = ''
})

onMounted(async () => {
  if (!await store.loadAll()) return
  mapProjectId.value = store.projects.value[0]?.id || ''
  selectedId.value = store.sensors.value[0]?.id || null
})

function openPoint(point = null) {
  editingPointId.value = point?.id || null
  Object.assign(pointDraft, point || { projectId: store.projects.value[0]?.id || '', sectionId: '', name: '', pk: '', latitude: '', longitude: '' })
  pointErrors.value = {}
  pointFormOpen.value = true
}

function onPointProjectChange() { pointDraft.sectionId = '' }

async function savePoint() {
  pointErrors.value = validateMonitoringPoint(pointDraft, pointProject.value)
  if (Object.keys(pointErrors.value).length) return
  const saved = await store.savePoint({ ...pointDraft }, editingPointId.value)
  if (!saved) { pointErrors.value = store.fieldErrors.value; return }
  pointFormOpen.value = false
  mapProjectId.value = saved.projectId
  feedback.value = `Punto ${editingPointId.value ? 'actualizado' : 'registrado'} correctamente.`
}

async function removePoint(point) {
  if (await store.deletePoint(point.id)) feedback.value = 'Punto eliminado.'
}

async function registerSensor() {
  sensorErrors.value = validateSensorAsset(sensorDraft)
  if (Object.keys(sensorErrors.value).length) return
  const created = await store.registerSensor({ ...sensorDraft })
  if (!created) { sensorErrors.value = store.fieldErrors.value; return }
  sensorFormOpen.value = false
  selectedId.value = created.id
  Object.assign(sensorDraft, { name: '', serialNumber: '', type: 'pm10' })
  feedback.value = 'Sensor registrado. Asígnalo a un punto para continuar.'
}

async function operate(action, value) {
  if (!selected.value) return
  const result = await store.changeSensor(selected.value.id, action, value)
  if (!result) return
  assignmentPointId.value = result.pointId || ''
  feedback.value = {
    assign: 'Sensor asignado. La calibración anterior se invalidó.',
    calibrate: 'Calibración registrada.', activate: 'Sensor activado y habilitado para reportar.',
    deactivate: 'Sensor desactivado.', release: 'Sensor liberado y disponible.',
  }[action]
}
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading assets-heading"><div><span class="monitoring-eyebrow">HARDWARE AS A SERVICE · ECO ROAD</span><h1>Sensores y despliegue</h1><p>Administra puntos geolocalizados, equipos de campo, calibración y activación.</p></div><Button label="Registrar sensor" icon="pi pi-plus" @click="sensorFormOpen = !sensorFormOpen" /></div>
    <Message severity="info" :closable="false" class="monitoring-demo-note">Activos y ubicaciones de demostración. Solo los sensores asignados, calibrados y activos quedan habilitados para reportar.</Message>
    <Message v-if="store.error.value" severity="error" :closable="false" class="assets-feedback">{{ store.error.value }} <button class="assets-inline-button" type="button" @click="store.loadAll()">Reintentar</button></Message>
    <Message v-if="feedback" severity="success" :closable="false" class="assets-feedback">{{ feedback }}</Message>

    <form v-if="sensorFormOpen" class="assets-form" @submit.prevent="registerSensor"><div class="assets-form-heading"><h2>Registrar activo IoT</h2><button type="button" class="assets-plain-button" @click="sensorFormOpen = false">Cancelar</button></div><div class="assets-form-grid"><label>Nombre del equipo<input v-model="sensorDraft.name" placeholder="Ej. Sonómetro de frente" /><small v-if="sensorErrors.name">{{ sensorErrors.name }}</small></label><label>Número de serie<input v-model="sensorDraft.serialNumber" placeholder="ECO-NOISE-006" /><small v-if="sensorErrors.serialNumber">{{ sensorErrors.serialNumber }}</small></label><label>Tipo<select v-model="sensorDraft.type"><option v-for="(type, id) in SENSOR_TYPES" :key="id" :value="id">{{ type.label }}</option></select><small v-if="sensorErrors.type">{{ sensorErrors.type }}</small></label></div><Button type="submit" label="Guardar activo" icon="pi pi-check" :loading="store.loading.value" /></form>

    <section class="assets-stats" aria-label="Resumen de activos"><div><span>ACTIVOS REGISTRADOS</span><strong>{{ store.summary.value.total }}</strong><small>Inventario HaaS</small></div><div><span>HABILITADOS</span><strong class="assets-green">{{ store.summary.value.active }}</strong><small>Calibrados y activos</small></div><div><span>ASIGNADOS</span><strong>{{ store.summary.value.assigned }}</strong><small>Pendientes de activación</small></div><div><span>CALIBRACIÓN PENDIENTE</span><strong class="assets-amber">{{ store.summary.value.calibrationDue }}</strong><small>Requieren revisión</small></div></section>

    <section class="assets-map-panel"><div class="assets-section-heading"><div><h2>Distribución de puntos de monitoreo</h2><p>Referencia esquemática de progresivas y coordenadas del corredor.</p></div><label class="assets-project-select">Proyecto<select v-model="mapProjectId"><option v-for="project in store.projects.value" :key="project.id" :value="project.id">{{ project.name }}</option></select></label></div><div v-if="mapProject && mapPoints.length" class="assets-map"><svg viewBox="0 0 600 180" role="img" :aria-label="`Puntos de monitoreo de ${mapProject.name}`"><path d="M38 140 C175 140 206 121 300 105 S460 57 562 66" fill="none" stroke="#e1ecf2" stroke-width="28" stroke-linecap="round" /><path d="M38 140 C175 140 206 121 300 105 S460 57 562 66" fill="none" stroke="#008b68" stroke-width="4" stroke-linecap="round" /><g v-for="point in mapPoints" :key="point.id" :transform="`translate(${markerX(point)}, ${markerY(point)})`"><circle r="9" fill="#00a878" stroke="white" stroke-width="3" /><text y="-16" text-anchor="middle">{{ point.name }}</text><text y="29" text-anchor="middle">PK {{ point.pk }}</text></g></svg></div><div v-else class="assets-empty">Este proyecto todavía no tiene puntos de monitoreo.</div></section>

    <div class="assets-columns"><section class="assets-panel"><div class="assets-section-heading"><div><h2>Inventario de sensores</h2><p>{{ visibleSensors.length }} equipos para los filtros seleccionados</p></div></div><div class="assets-filters"><input v-model="filters.search" type="search" aria-label="Buscar sensor" placeholder="Buscar código, nombre o serie" /><select v-model="filters.projectId" aria-label="Filtrar por proyecto"><option value="all">Todos los proyectos</option><option v-for="project in store.projects.value" :key="project.id" :value="project.id">{{ project.name }}</option></select><select v-model="filters.status" aria-label="Filtrar por estado"><option value="all">Todos los estados</option><option v-for="(status, id) in ASSET_STATUSES" :key="id" :value="id">{{ status.label }}</option></select></div><div v-if="store.loading.value && !store.sensors.value.length" class="assets-empty">Cargando activos...</div><div v-else-if="!visibleSensors.length" class="assets-empty">No hay sensores para estos filtros.</div><button v-for="sensor in visibleSensors" :key="sensor.id" type="button" class="assets-sensor" :class="{ 'is-selected': sensor.id === selectedId }" :aria-pressed="sensor.id === selectedId" @click="selectedId = sensor.id"><span class="assets-sensor-top"><strong>{{ sensor.code }}</strong><Tag :value="ASSET_STATUSES[sensor.status].label" :severity="ASSET_STATUSES[sensor.status].severity" /></span><strong>{{ sensor.name }}</strong><span>{{ SENSOR_TYPES[sensor.type].label }}</span><small>{{ pointName(sensor.pointId) }} · {{ sensor.serialNumber }}</small></button></section>

      <section class="assets-panel assets-detail"><template v-if="selected"><div class="assets-section-heading"><div><span class="monitoring-eyebrow">FICHA DEL ACTIVO</span><h2>{{ selected.code }}</h2><p>{{ selected.name }}</p></div><Tag :value="ASSET_STATUSES[selected.status].label" :severity="ASSET_STATUSES[selected.status].severity" /></div><div class="assets-eligibility" :class="{ ready: canReport(selected) }"><i :class="canReport(selected) ? 'pi pi-check-circle' : 'pi pi-lock'" aria-hidden="true"></i><div><strong>{{ canReport(selected) ? 'Habilitado para reportar' : 'Reporte bloqueado' }}</strong><span>{{ canReport(selected) ? 'Asignación, calibración y activación vigentes.' : 'Completa los pasos de despliegue.' }}</span></div></div><dl class="assets-facts"><div><dt>Tipo</dt><dd>{{ SENSOR_TYPES[selected.type].label }}</dd></div><div><dt>Serie</dt><dd>{{ selected.serialNumber }}</dd></div><div><dt>Proyecto</dt><dd>{{ projectName(selected.projectId) }}</dd></div><div><dt>Punto</dt><dd>{{ selectedPoint?.name || 'Sin asignar' }}</dd></div><div><dt>PK</dt><dd>{{ selectedPoint?.pk || '—' }}</dd></div><div><dt>Calibración válida hasta</dt><dd>{{ formatDate(selected.calibration?.validUntil) }}</dd></div></dl><div v-if="selected.status !== 'active'" class="assets-operation"><label>1. Asignar a un punto<select v-model="assignmentPointId"><option value="">Selecciona un punto</option><option v-for="point in store.points.value" :key="point.id" :value="point.id">{{ point.name }} · {{ projectName(point.projectId) }}</option></select></label><Button label="Asignar" icon="pi pi-map-marker" outlined :disabled="!assignmentPointId || store.loading.value" @click="operate('assign', assignmentPointId)" /></div><div v-if="selected.status === 'assigned'" class="assets-operation"><label>2. Calibración vigente hasta<input v-model="calibrationUntil" type="date" /></label><Button label="Registrar calibración" icon="pi pi-sliders-h" outlined :disabled="!calibrationUntil || store.loading.value" @click="operate('calibrate', calibrationUntil)" /></div><div class="assets-actions"><Button v-if="selected.status === 'assigned'" label="3. Activar sensor" icon="pi pi-bolt" :disabled="!isCalibrationValid(selected) || store.loading.value" @click="operate('activate')" /><Button v-if="selected.status === 'active'" label="Desactivar" icon="pi pi-pause" severity="warn" outlined :disabled="store.loading.value" @click="operate('deactivate')" /><Button v-if="selected.status === 'assigned'" label="Liberar activo" icon="pi pi-undo" severity="secondary" text :disabled="store.loading.value" @click="operate('release')" /></div></template><div v-else class="assets-empty">Selecciona un sensor para ver su ficha y desplegarlo.</div></section></div>

    <section class="assets-panel assets-points"><div class="assets-section-heading"><div><h2>Puntos de monitoreo</h2><p>Geolocalización y frente de obra de cada estación.</p></div><Button label="Agregar punto" icon="pi pi-plus" outlined @click="openPoint()" /></div><form v-if="pointFormOpen" class="assets-form assets-point-form" @submit.prevent="savePoint"><div class="assets-form-heading"><h3>{{ editingPointId ? 'Editar punto' : 'Nuevo punto' }}</h3><button type="button" class="assets-plain-button" @click="pointFormOpen = false">Cancelar</button></div><div class="assets-form-grid"><label>Proyecto<select v-model="pointDraft.projectId" @change="onPointProjectChange"><option value="">Selecciona un proyecto</option><option v-for="project in store.projects.value" :key="project.id" :value="project.id">{{ project.name }}</option></select><small v-if="pointErrors.projectId">{{ pointErrors.projectId }}</small></label><label>Tramo<select v-model="pointDraft.sectionId"><option value="">Selecciona un tramo</option><option v-for="section in pointProject?.sections || []" :key="section.id" :value="section.id">{{ section.name }}</option></select><small v-if="pointErrors.sectionId">{{ pointErrors.sectionId }}</small></label><label>Nombre<input v-model="pointDraft.name" placeholder="Ej. Frente Yangas" /><small v-if="pointErrors.name">{{ pointErrors.name }}</small></label><label>PK<input v-model="pointDraft.pk" placeholder="45+100" /><small v-if="pointErrors.pk">{{ pointErrors.pk }}</small></label><label>Latitud<input v-model="pointDraft.latitude" type="number" step="any" placeholder="-11.6628" /><small v-if="pointErrors.latitude">{{ pointErrors.latitude }}</small></label><label>Longitud<input v-model="pointDraft.longitude" type="number" step="any" placeholder="-76.6468" /><small v-if="pointErrors.longitude">{{ pointErrors.longitude }}</small></label></div><Button type="submit" :label="editingPointId ? 'Guardar cambios' : 'Crear punto'" icon="pi pi-check" :loading="store.loading.value" /></form><div class="assets-point-grid"><article v-for="point in store.points.value" :key="point.id" class="assets-point-card"><div><strong>{{ point.name }}</strong><small>{{ projectName(point.projectId) }}</small></div><span class="assets-pk">PK {{ point.pk }}</span><p><i class="pi pi-map-marker" aria-hidden="true"></i> {{ point.latitude }}, {{ point.longitude }}</p><p>{{ assignedCount(point.id) }} {{ assignedCount(point.id) === 1 ? 'sensor asignado' : 'sensores asignados' }}</p><div class="assets-point-actions"><button type="button" @click="openPoint(point)">Editar</button><button type="button" :disabled="assignedCount(point.id) > 0" @click="removePoint(point)">Eliminar</button></div></article><div v-if="!store.points.value.length" class="assets-empty">Todavía no hay puntos registrados.</div></div></section>
  </MonitoringShell>
</template>
