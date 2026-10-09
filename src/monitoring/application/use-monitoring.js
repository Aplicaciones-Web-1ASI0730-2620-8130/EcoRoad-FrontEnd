import { DEMO_READINGS, DEMO_THRESHOLD_PROFILES, MONITORING_PROJECTS } from '../infrastructure/monitoring-fixtures.js'
import { summarizeMonitoring } from '../domain/environmental-reading.js'

export function useMonitoring() {
  return {
    projects: MONITORING_PROJECTS,
    getDashboard(projectId) {
      const project = MONITORING_PROJECTS.find((item) => item.id === projectId)
      if (!project) return null
      const readings = DEMO_READINGS.filter((reading) => reading.projectId === projectId)
      return { project, ...summarizeMonitoring(project, readings, DEMO_THRESHOLD_PROFILES) }
    },
  }
}
