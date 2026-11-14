import { ENVIRONMENTAL_PARAMETERS } from '../domain/environmental-reading.js'
import { createProjectBackendRepository } from '../../projects/infrastructure/project-backend-repository.js'

const types = { pm10: 'AirQuality', noise: 'NoiseLevel', ph: 'WaterQuality', vibration: 'Vibration' }
const ids = Object.fromEntries(Object.entries(types).map(([id, type]) => [type.toLowerCase(), id]))
const status = (value) => value?.toLowerCase() || null
const reading = (item) => ({ id: item.id || item.measurementId, sectionId: item.sectionId, value: item.value, recordedAt: item.recordedAt, source: item.source?.toLowerCase(), status: status(item.status) })

export function createMonitoringBackendRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projects = createProjectBackendRepository({ baseUrl, fetchImpl, getCompanyId })
  let loaded = []
  async function request(path) {
    const response = await fetchImpl(new URL(path, root), { headers: { Accept: 'application/json' } })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La consulta de monitoreo falló (HTTP ${response.status}).`)
    return payload
  }
  async function findProject(id) {
    return loaded.find((project) => project.id === id) || projects.getProject(id)
  }
  return {
    async listProjects() {
      loaded = (await projects.listProjects()).map((project) => ({ ...project, corridor: project.code }))
      return loaded
    },
    async getDashboard(projectId) {
      const [project, data] = await Promise.all([findProject(projectId), request(`monitoring/projects/${encodeURIComponent(projectId)}/dashboard`)])
      const bySection = new Map(data.sections.map((section) => [section.sectionId, section]))
      return {
        project, status: status(data.status), latestAt: data.latestAt,
        parameters: data.parameters.map((item) => {
          const id = ids[item.parameterType.toLowerCase()]
          return { id, ...ENVIRONMENTAL_PARAMETERS[id], metric: item.metric, unit: item.unit, reading: item.worstReading ? reading(item.worstReading) : null }
        }),
        sections: project.sections.map((section) => {
          const indicator = bySection.get(section.id)
          return { ...section, pk: section.startPk, status: status(indicator?.status), readings: (indicator?.readings || []).map(reading) }
        }),
      }
    },
    async getHistory({ projectId, sectionId, parameterId, from, to }) {
      await findProject(projectId)
      const query = new URLSearchParams({ parameterType: types[parameterId] })
      if (sectionId && sectionId !== 'all') query.set('sectionId', sectionId)
      if (from) query.set('from', from)
      if (to) query.set('to', to)
      const data = await request(`monitoring/projects/${encodeURIComponent(projectId)}/history?${query}`)
      return { readings: data.map(reading).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)) }
    },
  }
}
