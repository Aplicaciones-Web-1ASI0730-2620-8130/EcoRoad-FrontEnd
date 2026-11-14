import { parseKilometerPost } from '../domain/road-section.js'

const projectPath = (id) => `projects/${encodeURIComponent(id)}`
const sectionPath = (projectId, sectionId) => `${projectPath(projectId)}/sections/${encodeURIComponent(sectionId)}`
const fromPk = (pk) => parseKilometerPost(pk) / 1000
const toPk = (km) => {
  const meters = Math.round(km * 1000)
  return `${String(Math.floor(meters / 1000)).padStart(2, '0')}+${String(meters % 1000).padStart(3, '0')}`
}

function sectionFromBackend(section) {
  return {
    ...section,
    startPk: toPk(section.startKilometer),
    endPk: toPk(section.endKilometer),
    workFront: section.workFronts?.map((front) => front.name).join(', ') || '',
  }
}

function projectFromBackend(project) {
  return {
    ...project,
    sections: (project.sections || []).map(sectionFromBackend),
    environmentalStatus: 'not_monitored',
  }
}

export function createProjectBackendRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La operación de proyectos falló (HTTP ${response.status}).`)
    return payload
  }
  const sectionBody = (input) => ({
    name: input.name.trim(), startKilometer: fromPk(input.startPk), endKilometer: fromPk(input.endPk),
  })
  return {
    listProjects: async () => (await request('projects'))
      .filter((project) => project.companyId === getCompanyId()).map(projectFromBackend),
    getProject: async (id) => {
      const project = await request(projectPath(id))
      if (project.companyId !== getCompanyId()) throw new Error('Proyecto no disponible para esta empresa.')
      return projectFromBackend(project)
    },
    registerProject: async (input) => projectFromBackend(await request('projects', {
      method: 'POST',
      body: {
        companyId: getCompanyId(), name: input.name.trim(), code: input.code.trim(),
        status: 'registered',
        sections: input.sections.map((section) => ({ ...sectionBody(section),
          workFronts: section.workFront?.trim() ? [{ name: section.workFront.trim(), status: 'registered' }] : [],
        })),
      },
    })),
    addSection: async (projectId, input) => sectionFromBackend(await request(`${projectPath(projectId)}/sections`, {
      method: 'POST', body: sectionBody(input),
    })),
    updateSection: async (projectId, sectionId, input) => sectionFromBackend(await request(sectionPath(projectId, sectionId), {
      method: 'PUT', body: sectionBody(input),
    })),
    removeSection: async (projectId, sectionId) => {
      await request(sectionPath(projectId, sectionId), { method: 'DELETE' })
      return true
    },
  }
}
