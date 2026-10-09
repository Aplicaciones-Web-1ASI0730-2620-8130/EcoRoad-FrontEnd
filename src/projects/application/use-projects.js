import { computed, ref } from 'vue'
import { PROJECT_FIXTURES } from '../infrastructure/project-fixtures.js'
import { matchesProjectFilters, validateRoadProject } from '../domain/road-project.js'
import { hasRoadSectionErrors, normalizeRoadSection, validateRoadSections } from '../domain/road-section.js'

const projects = ref(PROJECT_FIXTURES.map((project) => ({
  ...project,
  sections: (project.sections || []).map((section) => ({ ...section })),
})))

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
      const sectionErrors = validateRoadSections(input.sections)
      if (hasRoadSectionErrors(sectionErrors)) errors.roadSections = sectionErrors
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
        sections: input.sections.map(normalizeRoadSection),
      }
      projects.value.unshift(project)
      return { errors: {}, project }
    },
    saveSection(projectId, input) {
      const project = projects.value.find((item) => item.id === projectId)
      if (!project) return { error: 'Proyecto no encontrado.' }
      const otherSections = project.sections.filter((section) => section.id !== input.id)
      const errors = validateRoadSections([...otherSections, input])
      if (hasRoadSectionErrors(errors)) return { errors: errors.items.at(-1) }
      const section = normalizeRoadSection(input)
      if (input.id) {
        const index = project.sections.findIndex((item) => item.id === input.id)
        if (index < 0) return { error: 'Tramo no encontrado.' }
        project.sections.splice(index, 1, section)
      } else {
        project.sections.push(section)
      }
      return { section }
    },
    removeSection(projectId, sectionId) {
      const project = projects.value.find((item) => item.id === projectId)
      if (!project) return false
      const index = project.sections.findIndex((section) => section.id === sectionId)
      if (index < 0) return false
      project.sections.splice(index, 1)
      return true
    },
  }
}
