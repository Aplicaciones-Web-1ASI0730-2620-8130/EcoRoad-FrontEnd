import { computed, ref } from 'vue'
import { createDemoAlerts } from '../../alerting/infrastructure/alert-fixtures.js'
import { createDemoUsers } from '../../iam/infrastructure/iam-demo-data.js'
import { assignResponsible, closeIncident, filterIncidents, openIncident, recordCorrectiveAction, recordFieldEvidence, resolveIncident } from '../domain/incident.js'
import { createDemoIncidents } from '../infrastructure/incident-fixtures.js'

// First delivery: local read model. The next delivery replaces it with the incident fake API.
export function createIncidentDemoStore(companyId = 'demo-company', actor) {
  const incidents = ref(companyId === 'demo-company' ? createDemoIncidents() : [])
  const collaborators = ref(companyId === 'demo-company' ? createDemoUsers() : actor ? [actor] : [])
  const alerts = ref(companyId === 'demo-company' ? (() => {
    const examples = createDemoAlerts()
    return [...examples, { ...examples[0], id: 'ALR-025', readingId: '025', indicator: 'PM10 en frente de obra', detectedAt: new Date().toISOString() }]
  })() : [])
  const filters = ref({ status: 'all', projectId: 'all', search: '' })
  const selectedId = ref(incidents.value[0]?.id || null)
  const selected = computed(() => incidents.value.find((item) => item.id === selectedId.value) || null)
  const visible = computed(() => filterIncidents(incidents.value, filters.value))
  const error = ref('')

  function apply(id, command) {
    error.value = ''
    try {
      const current = incidents.value.find((item) => item.id === id)
      if (!current) return false
      const next = command(current)
      incidents.value = incidents.value.map((item) => item.id === id ? next : item)
      return true
    } catch (cause) { error.value = cause.message; return false }
  }

  function create(alertId, description) {
    error.value = ''
    try {
      const alert = alerts.value.find((item) => item.id === alertId)
      if (incidents.value.some((item) => item.alertId === alertId)) throw new Error('Esta alerta ya tiene un incidente vinculado.')
      const incident = openIncident({ alert, companyId, description }, actor)
      incidents.value = [incident, ...incidents.value]
      selectedId.value = incident.id
      return incident
    } catch (cause) { error.value = cause.message; return null }
  }

  return {
    incidents, collaborators, alerts, filters, selectedId, selected, visible, error, create,
    assign: (id, userId) => apply(id, (item) => assignResponsible(item, collaborators.value.find((user) => user.id === userId), actor)),
    addAction: (id, description) => apply(id, (item) => recordCorrectiveAction(item, description, actor)),
    addEvidence: (id, note) => apply(id, (item) => recordFieldEvidence(item, note, actor)),
    resolve: (id) => apply(id, (item) => resolveIncident(item, actor)),
    close: (id) => apply(id, (item) => closeIncident(item, actor)),
  }
}
