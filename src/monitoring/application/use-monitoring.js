import { ref } from 'vue'
import { createMonitoringApiRepository } from '../infrastructure/monitoring-api-repository.js'
import { getDemoCompanyId } from '../../projects/infrastructure/demo-company.js'
import { createMonitoringBackendRepository } from '../infrastructure/monitoring-backend-repository.js'
import { useFakeApi } from '../../shared/infrastructure/api-mode.js'

export function createMonitoringStore(api) {
  const projects = ref([])
  const dashboards = ref(new Map())
  const histories = ref(new Map())
  const loading = ref(false)
  const error = ref('')

  async function run(action) {
    loading.value = true
    error.value = ''
    try { return await action() } catch (cause) {
      error.value = cause instanceof TypeError ? 'No se pudo conectar con la API. Comprueba que el servidor esté iniciado.' : cause.message || 'Ocurrió un error al consultar monitoreo.'
      return null
    } finally { loading.value = false }
  }

  return {
    projects,
    loading,
    error,
    dashboard: (projectId) => dashboards.value.get(projectId) || null,
    history: (key) => histories.value.get(key) || null,
    async loadProjects() {
      const result = await run(() => api.listProjects())
      if (result) projects.value = result
      return !!result
    },
    async loadDashboard(projectId) {
      const result = await run(() => api.getDashboard(projectId))
      if (result) dashboards.value.set(projectId, result)
      return result
    },
    async loadHistory(filters) {
      const key = JSON.stringify(filters)
      const result = await run(() => api.getHistory(filters))
      if (result) histories.value.set(key, result)
      return result
    },
  }
}

const baseUrl = import.meta.env.VITE_MONITORING_API_URL || new URL('/api/', window.location.origin).href
const defaultStore = createMonitoringStore(useFakeApi ? createMonitoringApiRepository({ baseUrl, getCompanyId: getDemoCompanyId }) : createMonitoringBackendRepository({ baseUrl, getCompanyId: getDemoCompanyId }))
export function useMonitoring() { return defaultStore }
