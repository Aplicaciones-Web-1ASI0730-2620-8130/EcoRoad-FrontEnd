import { ref } from 'vue'
import { createComplianceApiRepository } from '../infrastructure/compliance-api-repository.js'
import { getDemoCompanyId } from '../../projects/infrastructure/demo-company.js'

export function createComplianceStore(api) {
  const projects = ref([])
  const reports = ref([])
  const preview = ref(null)
  const selectedReport = ref(null)
  const loading = ref(false)
  const error = ref('')
  const fieldErrors = ref({})

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

  async function load() {
    const result = await run(() => Promise.all([api.listProjects(), api.listReports()]))
    if (!result) return false
    ;[projects.value, reports.value] = result
    return true
  }

  async function requestPreview(criteria) {
    const result = await run(() => api.previewReport(criteria))
    if (result) { preview.value = result; selectedReport.value = null }
    return result
  }

  async function generate(criteria) {
    const report = await run(() => api.generateReport(criteria))
    if (report) {
      selectedReport.value = report
      preview.value = report.preview
      reports.value = [{ id: report.id, createdAt: report.createdAt, simulation: report.simulation, project: report.preview.project, period: report.preview.period }, ...reports.value]
    }
    return report
  }

  async function openReport(id) {
    const report = await run(() => api.getReport(id))
    if (report) { selectedReport.value = report; preview.value = report.preview }
    return report
  }

  return { projects, reports, preview, selectedReport, loading, error, fieldErrors, load, requestPreview, generate, openReport }
}

const defaultStore = typeof window === 'undefined' ? null : createComplianceStore(createComplianceApiRepository({
  baseUrl: import.meta.env?.VITE_COMPLIANCE_API_URL || new URL('/api/', window.location.origin).href,
  getCompanyId: getDemoCompanyId,
}))
export function useCompliance() { return defaultStore }
