import { computed, ref } from 'vue'
import { matchesProjectFilters, validateRoadProject } from '../domain/road-project.js'
import { hasRoadSectionErrors, validateRoadSections } from '../domain/road-section.js'
import { createProjectApiRepository } from '../infrastructure/project-api-repository.js'
import { getDemoCompanyId } from '../infrastructure/demo-company.js'

export function createProjectsStore(api, getCompanyId = getDemoCompanyId) {
  const projects = ref([])
  const loading = ref(false)
  const error = ref('')
  let loadedCompanyId = null

  function syncCompany() {
    const companyId = getCompanyId()
    if (loadedCompanyId !== companyId) {
      projects.value = []
      loadedCompanyId = companyId
    }
  }

  async function run(action) {
    syncCompany()
    error.value = ''
    loading.value = true
    try {
      return await action()
    } catch (cause) {
      error.value = cause instanceof TypeError
        ? 'No se pudo conectar con la fake API. Inicia npm run api:fake.'
        : cause.message || 'Ocurrió un error al consultar proyectos.'
      return null
    } finally {
      loading.value = false
    }
  }

  const counts = computed(() => ({
    total: projects.value.length,
    optimal: projects.value.filter((project) => project.environmentalStatus === 'optimal').length,
    observation: projects.value.filter((project) => project.environmentalStatus === 'observation').length,
    critical: projects.value.filter((project) => project.environmentalStatus === 'critical').length,
  }))

  return {
    projects,
    counts,
    loading,
    error,
    findProject: (id) => projects.value.find((project) => project.id === id) || null,
    filterProjects: (filters) => projects.value.filter((project) => matchesProjectFilters(project, filters)),
    async loadProjects() {
      return !!(await run(async () => {
        projects.value = await api.listProjects()
        return true
      }))
    },
    async loadProject(id) {
      return !!(await run(async () => {
        const project = await api.getProject(id)
        const index = projects.value.findIndex((item) => item.id === id)
        if (index < 0) projects.value.push(project)
        else projects.value.splice(index, 1, project)
        return true
      }))
    },
    async registerProject(input) {
      const errors = validateRoadProject(input)
      const sectionErrors = validateRoadSections(input.sections)
      if (hasRoadSectionErrors(sectionErrors)) errors.roadSections = sectionErrors
      if (Object.keys(errors).length) return { errors, project: null }
      const project = await run(() => api.registerProject(input))
      if (!project) return { errors: { form: error.value }, project: null }
      projects.value.unshift(project)
      return { errors: {}, project }
    },
    async saveSection(projectId, input) {
      const project = projects.value.find((item) => item.id === projectId)
      if (!project) return { error: 'Proyecto no encontrado.' }
      const otherSections = project.sections.filter((section) => section.id !== input.id)
      const errors = validateRoadSections([...otherSections, input])
      if (hasRoadSectionErrors(errors)) return { errors: errors.items.at(-1) }
      const section = await run(() => input.id
        ? api.updateSection(projectId, input.id, input)
        : api.addSection(projectId, input))
      if (!section) return { error: error.value }
      if (input.id) {
        const index = project.sections.findIndex((item) => item.id === input.id)
        project.sections.splice(index, 1, section)
      } else project.sections.push(section)
      return { section }
    },
    async removeSection(projectId, sectionId) {
      const project = projects.value.find((item) => item.id === projectId)
      if (!project) return false
      const result = await run(() => api.removeSection(projectId, sectionId))
      if (!result) return false
      const index = project.sections.findIndex((section) => section.id === sectionId)
      if (index >= 0) project.sections.splice(index, 1)
      return true
    },
  }
}

const baseUrl = import.meta.env?.VITE_PROJECTS_API_URL ||
  new URL('/api/', globalThis.location?.origin || 'http://127.0.0.1:3001').href
const defaultStore = createProjectsStore(createProjectApiRepository({ baseUrl, getCompanyId: getDemoCompanyId }))
export function useProjects() { return defaultStore }
