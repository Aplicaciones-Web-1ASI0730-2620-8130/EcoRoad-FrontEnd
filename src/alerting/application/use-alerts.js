import { computed, ref } from 'vue'
import { filterAlerts, summarizeAlerts } from '../domain/alert.js'
import { createAlertingApiRepository } from '../infrastructure/alerting-api-repository.js'
import { getDemoCompanyId } from '../../projects/infrastructure/demo-company.js'
import { createAlertingBackendRepository } from '../infrastructure/alerting-backend-repository.js'
import { useFakeApi } from '../../shared/infrastructure/api-mode.js'

export function createAlertStore(api) {
  const alerts = ref([])
  const filters = ref({ projectId: 'all', risk: 'all', status: 'all', search: '' })
  const loading = ref(false)
  const error = ref('')
  const visibleAlerts = computed(() => filterAlerts(alerts.value, filters.value))
  const summary = computed(() => summarizeAlerts(alerts.value))
  const projects = computed(() => [...new Map(alerts.value.map((alert) => [alert.projectId, { id: alert.projectId, name: alert.projectName }])).values()])

  async function run(action) {
    loading.value = true
    error.value = ''
    try { return await action() } catch (cause) {
      error.value = cause instanceof TypeError
        ? 'No se pudo conectar con la API. Comprueba que el backend esté en ejecución.'
        : cause.message || 'Ocurrió un error al consultar alertas.'
      return null
    } finally { loading.value = false }
  }

  async function loadAlerts() {
    const result = await run(() => api.listAlerts())
    if (result) alerts.value = result
    return result !== null
  }

  async function acknowledge(id, person) {
    const updated = await run(() => api.acknowledgeAlert(id, person))
    if (!updated) return false
    alerts.value = api.activeOnly ? alerts.value.filter((alert) => alert.id !== id) : alerts.value.map((alert) => alert.id === id ? updated : alert)
    return true
  }

  return { alerts, filters, loading, error, visibleAlerts, summary, projects, loadAlerts, acknowledge }
}

const defaultStore = typeof window === 'undefined' ? null : createAlertStore((useFakeApi ? createAlertingApiRepository : createAlertingBackendRepository)({
  baseUrl: import.meta.env?.VITE_ALERTING_API_URL || new URL('/api/', window.location.origin).href,
  getCompanyId: getDemoCompanyId,
}))
export function useAlerts() { return defaultStore }
