import { computed, ref } from 'vue'
import { acknowledgeAlert, filterAlerts, summarizeAlerts } from '../domain/alert.js'
import { createDemoAlerts } from '../infrastructure/alert-fixtures.js'

export function createAlertStore(initialAlerts = createDemoAlerts()) {
  const alerts = ref(initialAlerts)
  const filters = ref({ projectId: 'all', risk: 'all', status: 'all', search: '' })
  const visibleAlerts = computed(() => filterAlerts(alerts.value, filters.value))
  const summary = computed(() => summarizeAlerts(alerts.value))

  function acknowledge(id, person) {
    const index = alerts.value.findIndex((alert) => alert.id === id)
    if (index < 0) return false
    const updated = acknowledgeAlert(alerts.value[index], person)
    if (!updated) return false
    alerts.value = alerts.value.map((alert) => alert.id === id ? updated : alert)
    return true
  }

  return { alerts, filters, visibleAlerts, summary, acknowledge }
}

const defaultStore = createAlertStore()
export function useAlerts() { return defaultStore }
