import { randomUUID } from 'node:crypto'
import { canAccessOperationalModules } from '../src/commercial/domain/commercial-model.js'
import { validateRoadProject } from '../src/projects/domain/road-project.js'
import { hasRoadSectionErrors, normalizeRoadSection, validateRoadSections } from '../src/projects/domain/road-section.js'
import { PROJECT_FIXTURES } from '../src/projects/infrastructure/project-fixtures.js'
import { readJson, sendJson } from './http-json.mjs'

export function createFakeProjectRoutes({ subscriptions, includeExample = true }) {
  const projects = new Map()
  if (includeExample) {
    projects.set('demo-company', new Map(PROJECT_FIXTURES.map((project) => [project.id, {
      ...project,
      companyId: 'demo-company',
      sections: project.sections.map((section) => ({ ...section })),
    }])))
  }
  let nextCode = PROJECT_FIXTURES.length + 1

  return async (request, response, path) => {
    const companyId = request.headers['x-demo-company-id']
    if (!companyId || Array.isArray(companyId)) {
      return sendJson(response, 400, { code: 'COMPANY_REQUIRED', message: 'Selecciona una empresa.' })
    }
    if (!canAccessOperationalModules(subscriptions.get(companyId))) {
      return sendJson(response, 403, { code: 'SUBSCRIPTION_REQUIRED', message: 'La empresa necesita una suscripción activa para acceder a proyectos.' })
    }

    const companyProjects = projects.get(companyId) || new Map()
    projects.set(companyId, companyProjects)
    if (path === '/api/projects') {
      if (request.method === 'GET') return sendJson(response, 200, [...companyProjects.values()])
      if (request.method === 'POST') {
        const input = await readJson(request)
        const errors = validateRoadProject(input)
        const sectionErrors = validateRoadSections(input.sections)
        if (hasRoadSectionErrors(sectionErrors)) errors.roadSections = sectionErrors
        if (Object.keys(errors).length) return sendJson(response, 422, { code: 'INVALID_PROJECT', message: 'Revisa el proyecto y sus tramos.', errors })
        const project = {
          id: randomUUID(),
          companyId,
          code: `PRJ-DEMO-${String(nextCode++).padStart(3, '0')}`,
          name: input.name.trim(),
          location: input.location.trim(),
          type: input.type,
          concessionaireName: input.concessionaireName.trim(),
          environmentalStatus: 'not_monitored',
          environmentalNote: 'Monitoreo aún no configurado',
          sensorCount: 0,
          alertCount: 0,
          incidentCount: 0,
          sections: input.sections.map((section) => normalizeRoadSection({ ...section, id: undefined })),
        }
        companyProjects.set(project.id, project)
        return sendJson(response, 201, project)
      }
      return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    }

    const match = /^\/api\/projects\/([^/]+)(?:\/sections(?:\/([^/]+))?)?$/.exec(path)
    if (!match) return sendJson(response, 404, { code: 'NOT_FOUND', message: 'Ruta no encontrada.' })
    const projectId = decodeURIComponent(match[1])
    const sectionId = match[2] ? decodeURIComponent(match[2]) : null
    const project = companyProjects.get(projectId)
    if (!project) return sendJson(response, 404, { code: 'PROJECT_NOT_FOUND', message: 'Proyecto no encontrado.' })

    if (!path.includes('/sections') && request.method === 'GET') return sendJson(response, 200, project)
    if (path.endsWith('/sections') && request.method === 'POST') {
      const input = await readJson(request)
      const errors = validateRoadSections([...project.sections, input])
      if (hasRoadSectionErrors(errors)) return sendJson(response, 422, { code: 'INVALID_SECTION', message: 'Revisa el tramo.', errors: errors.items.at(-1) })
      const section = normalizeRoadSection({ ...input, id: undefined })
      project.sections.push(section)
      return sendJson(response, 201, section)
    }
    const sectionIndex = project.sections.findIndex((section) => section.id === sectionId)
    if (sectionId && sectionIndex < 0) return sendJson(response, 404, { code: 'SECTION_NOT_FOUND', message: 'Tramo no encontrado.' })
    if (sectionId && request.method === 'PUT') {
      const input = await readJson(request)
      const otherSections = project.sections.filter((section) => section.id !== sectionId)
      const errors = validateRoadSections([...otherSections, input])
      if (hasRoadSectionErrors(errors)) return sendJson(response, 422, { code: 'INVALID_SECTION', message: 'Revisa el tramo.', errors: errors.items.at(-1) })
      const section = normalizeRoadSection({ ...input, id: sectionId })
      project.sections.splice(sectionIndex, 1, section)
      return sendJson(response, 200, section)
    }
    if (sectionId && request.method === 'DELETE') {
      if (project.sections.length === 1) return sendJson(response, 409, { code: 'LAST_SECTION', message: 'El proyecto debe conservar al menos un tramo.' })
      project.sections.splice(sectionIndex, 1)
      return sendJson(response, 200, { deleted: true })
    }
    return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
  }
}
