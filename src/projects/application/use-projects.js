import { computed, ref } from 'vue'
import { PROJECT_FIXTURES } from '../infrastructure/project-fixtures.js'
import { matchesProjectFilters, validateRoadProject } from '../domain/road-project.js'

const projects = ref(PROJECT_FIXTURES.map((project) => ({ ...project })))

export function useProjects() {
  const counts = computed(() => ({
    total: projects.value.length,
    optimal: projects.value.filter((project) => project.environmentalStatus === 'optimal').length,
    observation: projects.value.filter((project) => project.environmentalStatus === 'observation').length,
    critical: projects.value.filter((project) => project.environmentalStatus === 'critical').length,
  }))

  return {
    projects,
    counts,
    findProject: (id) => projects.value.find((project) => project.id === id) || null,
    filterProjects: (filters) => projects.value.filter((project) => matchesProjectFilters(project, filters)),
    registerProject(input) {
      const errors = validateRoadProject(input)
      if (Object.keys(errors).length) return { errors, project: null }
      const project = {
        id: crypto.randomUUID(),
        code: `PRJ-DEMO-${String(projects.value.length + 1).padStart(3, '0')}`,
        name: input.name.trim(),
        location: input.location.trim(),
        type: input.type,
        concessionaireName: input.concessionaireName.trim(),
        environmentalStatus: 'not_monitored',
        environmentalNote: 'Monitoreo aún no configurado',
        sensorCount: 0,
        alertCount: 0,
        incidentCount: 0,
      }
      projects.value.unshift(project)
      return { errors: {}, project }
    },
  }
}

