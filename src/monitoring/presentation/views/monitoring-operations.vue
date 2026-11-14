<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import MonitoringShell from '../components/monitoring-shell.vue'
import { ENVIRONMENTAL_PARAMETERS, MONITORING_STATUSES } from '../../domain/environmental-reading.js'
import { PARAMETER_TYPES, createMonitoringOperationsBackendRepository } from '../../infrastructure/monitoring-operations-backend-repository.js'
import { getDemoCompanyId } from '../../../projects/infrastructure/demo-company.js'
import { currentUser } from '../../../iam/application/iam-session.js'
import { useFakeApi } from '../../../shared/infrastructure/api-mode.js'
import './monitoring-operations.css'

const route = useRoute()
const api = createMonitoringOperationsBackendRepository({
  baseUrl: import.meta.env.VITE_MONITORING_API_URL || new URL('/api/', window.location.origin).href,
  getCompanyId: getDemoCompanyId,
})
const projects = ref([])
const profiles = ref([])
const sensors = ref([])
const projectId = ref(typeof route.query.projectId === 'string' ? route.query.projectId : '')
const sectionId = ref('')
const parameterId = ref('pm10')
const value = ref('')
const notes = ref('')
const sensorId = ref('')
const sensorValue = ref('')
const profileName = ref('')
const kind = ref('Maximum')
const limits = reactive({ warningThreshold: '', criticalThreshold: '', minimum: '', optimalMinimum: '', optimalMaximum: '', maximum: '' })
const alertParameter = ref('PM10')
const alertUnit = ref('µg/m³')
const timeBand = ref('Daytime')
const alertLimit = ref('')
const criticalExcess = ref('')
const workFrontId = ref('')
const alertValue = ref('')
const lastMeasurement = ref(null)
const lastEvaluation = ref(null)
const loading = ref(false)
const error = ref('')
const feedback = ref('')

const project = computed(() => projects.value.find((item) => item.id === projectId.value))
const profile = computed(() => profiles.value.find((item) => item.parameterType === PARAMETER_TYPES[parameterId.value]))
const activeSensors = computed(() => sensors.value.filter((sensor) => sensor.status === 'Active' && sensor.canReport && sensor.monitoringPointId && sensor.parameterId))
const selectedSensor = computed(() => activeSensors.value.find((sensor) => sensor.id === sensorId.value))
const workFronts = computed(() => project.value?.sections.flatMap((section) => (section.workFronts || []).map((front) => ({ ...front, sectionName: section.name }))) || [])
const parameterChoices = Object.entries(ENVIRONMENTAL_PARAMETERS)
const finite = (input) => input !== '' && Number.isFinite(Number(input))

async function run(operation, success) {
  loading.value = true
  error.value = ''
  feedback.value = ''
  try {
    const result = await operation()
    feedback.value = success
    return result
  } catch (cause) {
    error.value = cause.message || 'No se pudo completar la operación.'
    return null
  } finally { loading.value = false }
}
function profileLimits() {
  if (kind.value === 'Maximum') {
    if (!finite(limits.warningThreshold) || !finite(limits.criticalThreshold) || Number(limits.warningThreshold) >= Number(limits.criticalThreshold)) throw new Error('El umbral de observación debe ser menor que el crítico.')
    return { kind: 'Maximum', warningThreshold: Number(limits.warningThreshold), criticalThreshold: Number(limits.criticalThreshold), minimum: null, optimalMinimum: null, optimalMaximum: null, maximum: null }
  }
  const values = [limits.minimum, limits.optimalMinimum, limits.optimalMaximum, limits.maximum]
  if (values.some((item) => !finite(item)) || !(Number(values[0]) < Number(values[1]) && Number(values[1]) < Number(values[2]) && Number(values[2]) < Number(values[3]))) throw new Error('Los límites del rango deben ir en orden ascendente: mínimo, óptimo mínimo, óptimo máximo y máximo.')
  return { kind: 'Range', warningThreshold: null, criticalThreshold: null, minimum: Number(values[0]), optimalMinimum: Number(values[1]), optimalMaximum: Number(values[2]), maximum: Number(values[3]) }
}
watch(profile, (current) => {
  profileName.value = current?.name || ''
  kind.value = current?.limits.kind || (parameterId.value === 'ph' ? 'Range' : 'Maximum')
  for (const key of Object.keys(limits)) limits[key] = current?.limits[key] ?? ''
}, { immediate: true })
watch(parameterId, (id) => {
  alertParameter.value = ENVIRONMENTAL_PARAMETERS[id].metric
  alertUnit.value = ENVIRONMENTAL_PARAMETERS[id].unit
})
watch(projectId, async (id) => {
  sectionId.value = project.value?.sections[0]?.id || ''
  workFrontId.value = workFronts.value[0]?.id || ''
  sensorId.value = ''
  sensors.value = []
  if (id && !useFakeApi) {
    const result = await run(() => api.listSensors(id), '')
    sensors.value = result || []
  }
})
async function saveProfile() {
  const body = await run(async () => {
    const candidate = profileLimits()
    if (!profile.value && !profileName.value.trim()) throw new Error('Indica el nombre o la norma del perfil.')
    return profile.value ? api.updateProfile(profile.value.id, candidate) : api.configureProfile(profileName.value, parameterId.value, candidate)
  }, 'Perfil de umbral guardado. Las mediciones anteriores conservan su clasificación.')
  if (body) profiles.value = [...profiles.value.filter((item) => item.id !== body.id), body]
}
async function recordManual() {
  if (!project.value?.sections.some((section) => section.id === sectionId.value) || !profile.value || !finite(value.value)) { error.value = 'Selecciona un tramo, un perfil configurado y un valor numérico.'; return }
  const result = await run(() => api.recordManual({ projectId: projectId.value, sectionId: sectionId.value, operatorId: currentUser.value?.id, parameterId: parameterId.value, value: value.value, notes: notes.value }), 'Medición manual registrada y clasificada.')
  if (result) { lastMeasurement.value = result; value.value = ''; notes.value = '' }
}
async function recordTelemetry() {
  if (!selectedSensor.value || !profiles.value.some((item) => item.parameterType === PARAMETER_TYPES[selectedSensor.value.parameterId]) || !finite(sensorValue.value)) { error.value = 'Selecciona un sensor habilitado, un perfil configurado y un valor numérico.'; return }
  const result = await run(() => api.recordTelemetry({ sensor: selectedSensor.value, value: sensorValue.value }), 'Lectura del sensor registrada y clasificada.')
  if (result) { lastMeasurement.value = result; sensorValue.value = '' }
}
async function registerRule() {
  if (!alertParameter.value.trim() || !alertUnit.value.trim() || !finite(alertLimit.value) || !finite(criticalExcess.value) || Number(criticalExcess.value) < 0) { error.value = 'Completa el parámetro, la unidad y los límites de la regla.'; return }
  await run(() => api.registerAlertRule({ parameter: alertParameter.value, unit: alertUnit.value, timeBand: timeBand.value, limit: alertLimit.value, criticalExcess: criticalExcess.value }), 'Regla de alerta registrada para esta franja horaria.')
}
async function evaluate() {
  if (!workFronts.value.some((front) => front.id === workFrontId.value) || !alertParameter.value.trim() || !finite(alertValue.value)) { error.value = 'Selecciona un frente, un parámetro y un valor numérico.'; return }
  lastEvaluation.value = await run(() => api.evaluateAlert({ workFrontId: workFrontId.value, parameter: alertParameter.value, timeBand: timeBand.value, measuredValue: alertValue.value }), 'Evaluación de alerta completada.')
}
onMounted(async () => {
  if (useFakeApi) return
  const result = await run(() => Promise.all([api.listProjects(), api.listProfiles()]), '')
  if (!result) return
  ;[projects.value, profiles.value] = result
  if (!projects.value.some((item) => item.id === projectId.value)) projectId.value = projects.value[0]?.id || ''
  else {
    sectionId.value = project.value?.sections[0]?.id || ''
    workFrontId.value = workFronts.value[0]?.id || ''
    const devices = await run(() => api.listSensors(projectId.value), '')
    sensors.value = devices || []
  }
})
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading"><div><span class="monitoring-eyebrow">CAPTURA Y EVALUACIÓN</span><h1>Registrar monitoreo</h1><p>Configura umbrales, registra lecturas y evalúa reglas de alerta con el backend.</p></div><RouterLink class="monitoring-history-link" :to="{ name: 'monitoring-dashboard', query: { projectId } }">Ver dashboard <i class="pi pi-arrow-right"></i></RouterLink></div>
    <Message v-if="useFakeApi" severity="info" :closable="false">Esta pantalla está disponible con la API real.</Message>
    <template v-else>
      <Message severity="info" :closable="false">Los perfiles de umbral y las reglas de alerta son globales en el backend. Configúralos según el criterio ambiental aprobado para tu proyecto. Registrar una medición no crea automáticamente una alerta.</Message>
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
      <Message v-if="feedback" severity="success" :closable="false">{{ feedback }}</Message>
      <div class="operations-grid">
        <section class="operations-panel"><h2>1. Perfil de umbral</h2><p>El backend lo usa para clasificar cada medición. Solo existe un perfil por parámetro.</p>
          <label>Indicador<select v-model="parameterId"><option v-for="[id, item] in parameterChoices" :key="id" :value="id">{{ item.metric }} · {{ item.label }}</option></select></label>
          <p v-if="profile" class="operations-note">Perfil actual: <strong>{{ profile.name }}</strong> · {{ profile.id }}</p>
          <label v-else>Nombre o norma de referencia<input v-model="profileName" maxlength="100" placeholder="Norma o criterio aprobado" /></label>
          <label>Tipo de límite<select v-model="kind"><option value="Maximum">Máximo</option><option value="Range">Rango</option></select></label>
          <div v-if="kind === 'Maximum'" class="operations-two"><label>Observación<input v-model="limits.warningThreshold" type="number" step="any" /></label><label>Crítico<input v-model="limits.criticalThreshold" type="number" step="any" /></label></div>
          <div v-else class="operations-two"><label>Mínimo<input v-model="limits.minimum" type="number" step="any" /></label><label>Óptimo mínimo<input v-model="limits.optimalMinimum" type="number" step="any" /></label><label>Óptimo máximo<input v-model="limits.optimalMaximum" type="number" step="any" /></label><label>Máximo<input v-model="limits.maximum" type="number" step="any" /></label></div>
          <Button :label="profile ? 'Actualizar límites' : 'Crear perfil'" :loading="loading" @click="saveProfile" />
        </section>
        <section class="operations-panel"><h2>2. Mediciones</h2><p>Se registran con la hora de recepción del servidor y el perfil configurado.</p>
          <label>Proyecto<select v-model="projectId"><option v-for="item in projects" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
          <h3>Registro manual</h3><label>Tramo<select v-model="sectionId"><option v-for="section in project?.sections || []" :key="section.id" :value="section.id">{{ section.name }}</option></select></label>
          <label>Valor {{ ENVIRONMENTAL_PARAMETERS[parameterId].unit }}<input v-model="value" type="number" step="any" /></label><label>Notas<input v-model="notes" maxlength="500" /></label>
          <Button label="Registrar medición manual" :disabled="!profile || !sectionId || !finite(value)" :loading="loading" @click="recordManual" />
          <h3>Lectura de sensor habilitado</h3><label>Sensor<select v-model="sensorId"><option value="">Selecciona un sensor activo y calibrado</option><option v-for="sensor in activeSensors" :key="sensor.id" :value="sensor.id">{{ sensor.code }} · {{ sensor.name }} · {{ ENVIRONMENTAL_PARAMETERS[sensor.parameterId].metric }}</option></select></label>
          <label>Valor {{ selectedSensor ? ENVIRONMENTAL_PARAMETERS[selectedSensor.parameterId].unit : '' }}<input v-model="sensorValue" type="number" step="any" /></label>
          <Button label="Registrar lectura de sensor" :disabled="!selectedSensor || !finite(sensorValue)" :loading="loading" @click="recordTelemetry" />
          <p v-if="lastMeasurement" class="operations-result">Última medición: {{ lastMeasurement.id }} · <Tag :severity="MONITORING_STATUSES[lastMeasurement.status?.toLowerCase()]?.severity || 'secondary'" :value="MONITORING_STATUSES[lastMeasurement.status?.toLowerCase()]?.label || lastMeasurement.status" /></p>
        </section>
        <section class="operations-panel"><h2>3. Regla y evaluación de alerta</h2><p>Las reglas se aplican por parámetro, franja horaria y frente de trabajo. Son independientes del perfil de medición.</p>
          <label>Parámetro de la regla<input v-model="alertParameter" maxlength="30" /></label><label>Unidad<input v-model="alertUnit" maxlength="20" /></label>
          <label>Franja horaria<select v-model="timeBand"><option value="Daytime">Diurna</option><option value="Nighttime">Nocturna</option></select></label>
          <div class="operations-two"><label>Límite<input v-model="alertLimit" type="number" step="any" /></label><label>Exceso crítico<input v-model="criticalExcess" type="number" step="any" min="0" /></label></div>
          <Button label="Registrar regla" :loading="loading" @click="registerRule" /><p class="operations-note">Si ya existe una regla para el parámetro y franja, el backend rechazará un duplicado. No hay endpoint para listar reglas.</p>
          <h3>Evaluar un frente</h3><label>Frente de trabajo<select v-model="workFrontId"><option v-for="front in workFronts" :key="front.id" :value="front.id">{{ front.sectionName }} · {{ front.name }}</option></select></label>
          <label>Valor observado<input v-model="alertValue" type="number" step="any" /></label>
          <Button label="Evaluar alerta" :disabled="!workFrontId || !finite(alertValue)" :loading="loading" @click="evaluate" />
          <p v-if="lastEvaluation" class="operations-result">{{ lastEvaluation.deviationDetected ? `Desviación detectada · ${lastEvaluation.isCritical ? 'Crítica' : 'Observación'} · Alerta ${lastEvaluation.alert?.id}` : 'Dentro del límite: no se creó una alerta.' }}</p>
        </section>
      </div>
    </template>
  </MonitoringShell>
</template>
