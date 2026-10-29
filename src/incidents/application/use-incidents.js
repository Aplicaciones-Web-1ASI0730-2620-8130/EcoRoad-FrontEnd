import { computed, ref } from 'vue'
import { filterIncidents } from '../domain/incident.js'
import { createIncidentApiRepository } from '../infrastructure/incident-api-repository.js'
import { getDemoCompanyId } from '../../projects/infrastructure/demo-company.js'
import { getSessionToken } from '../../iam/application/iam-session.js'

export function createIncidentStore(api) {
  const incidents = ref([])
  const collaborators = ref([])
  const alerts = ref([])
  const filters = ref({ status: 'all', projectId: 'all', search: '' })
  const selectedId = ref(null)
  const selected = computed(() => incidents.value.find((item) => item.id === selectedId.value) || null)
  const visible = computed(() => filterIncidents(incidents.value, filters.value))
  const loading = ref(false)
  const error = ref('')

  async function run(action) {
    loading.value = true
    error.value = ''
    try { return await action() } catch (cause) {
      error.value = cause instanceof TypeError ? 'No se pudo conectar con la fake API. Inicia npm run dev.' : cause.message || 'No se pudo completar la operación.'
      return null
    } finally { loading.value = false }
  }

  async function load() {
    const result = await run(async () => {
      const [cases, reference] = await Promise.all([api.list(), api.referenceData()])
      return { cases, reference }
    })
    if (!result) return false
    incidents.value = result.cases
    collaborators.value = result.reference.collaborators
    alerts.value = result.reference.alerts
    if (!incidents.value.some((item) => item.id === selectedId.value)) selectedId.value = incidents.value[0]?.id || null
    return true
  }

  async function create(alertId, description) {
    const created = await run(() => api.create(alertId, description))
    if (!created) return null
    incidents.value = [created, ...incidents.value]
    selectedId.value = created.id
    return created
  }

  async function update(id, action) {
    const changed = await run(() => action(id))
    if (!changed) return false
    incidents.value = incidents.value.map((item) => item.id === id ? changed : item)
    return true
  }

  return {
    incidents, collaborators, alerts, filters, selectedId, selected, visible, loading, error, load, create,
    assign: (id, userId) => update(id, (target) => api.assign(target, userId)),
    addAction: (id, description) => update(id, (target) => api.addAction(target, description)),
    addEvidence: (id, note, attachment) => update(id, (target) => api.addEvidence(target, note, attachment)),
    downloadEvidence: (id, evidenceId) => run(() => api.downloadEvidence(id, evidenceId)),
    resolve: (id) => update(id, api.resolve),
    close: (id) => update(id, api.close),
  }
}

const defaultStore = typeof window === 'undefined' ? null : createIncidentStore(createIncidentApiRepository({
  baseUrl: import.meta.env?.VITE_INCIDENT_API_URL || new URL('/api/', window.location.origin).href,
  getCompanyId: getDemoCompanyId,
  getToken: getSessionToken,
}))
export function useIncidents() { return defaultStore }
