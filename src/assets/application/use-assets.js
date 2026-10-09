import { computed, ref } from 'vue'
import { canReport, summarizeAssets } from '../domain/monitoring-asset.js'
import { createAssetApiRepository } from '../infrastructure/asset-api-repository.js'
import { getDemoCompanyId } from '../../projects/infrastructure/demo-company.js'

export function createAssetStore(api) {
  const projects = ref([])
  const points = ref([])
  const sensors = ref([])
  const loading = ref(false)
  const error = ref('')
  const fieldErrors = ref({})
  const summary = computed(() => summarizeAssets(sensors.value))

  async function run(action) {
    loading.value = true
    error.value = ''
    fieldErrors.value = {}
    try { return await action() } catch (cause) {
      error.value = cause instanceof TypeError ? 'No se pudo conectar con la fake API. Inicia npm run dev.' : cause.message || 'No se pudo completar la operación.'
      fieldErrors.value = cause.errors || {}
      return null
    } finally { loading.value = false }
  }

  async function loadAll() {
    const result = await run(() => Promise.all([api.listProjects(), api.listPoints(), api.listSensors()]))
    if (!result) return false
    ;[projects.value, points.value, sensors.value] = result
    return true
  }

  async function savePoint(input, id = null) {
    const point = await run(() => id ? api.updatePoint(id, input) : api.createPoint(input))
    if (!point) return null
    points.value = id ? points.value.map((item) => item.id === id ? point : item) : [...points.value, point]
    return point
  }

  async function deletePoint(id) {
    const result = await run(() => api.deletePoint(id))
    if (!result) return false
    points.value = points.value.filter((item) => item.id !== id)
    return true
  }

  async function registerSensor(input) {
    const sensor = await run(() => api.registerSensor(input))
    if (sensor) sensors.value = [...sensors.value, sensor]
    return sensor
  }

  async function changeSensor(id, operation, value) {
    const commands = {
      assign: () => api.assignSensor(id, value),
      calibrate: () => api.calibrateSensor(id, value),
      activate: () => api.activateSensor(id),
      deactivate: () => api.deactivateSensor(id),
      release: () => api.releaseSensor(id),
    }
    const command = commands[operation]
    if (!command) throw new Error(`Unknown sensor operation: ${operation}`)
    const sensor = await run(command)
    if (sensor) sensors.value = sensors.value.map((item) => item.id === id ? sensor : item)
    return sensor
  }

  return { projects, points, sensors, loading, error, fieldErrors, summary, canReport, loadAll, savePoint, deletePoint, registerSensor, changeSensor }
}

const defaultStore = typeof window === 'undefined' ? null : createAssetStore(createAssetApiRepository({
  baseUrl: import.meta.env?.VITE_ASSET_API_URL || new URL('/api/', window.location.origin).href,
  getCompanyId: getDemoCompanyId,
}))
export function useAssets() { return defaultStore }
