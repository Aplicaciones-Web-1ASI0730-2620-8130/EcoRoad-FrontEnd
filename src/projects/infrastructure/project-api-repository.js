export class ProjectApiError extends Error {
  constructor(message, status, code = null, errors = null) {
    super(message)
    this.name = 'ProjectApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export function createProjectApiRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  if (!baseUrl) throw new Error('Project API baseUrl is required.')
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.')
  if (typeof getCompanyId !== 'function') throw new Error('A company ID provider is required.')
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projectPath = (id) => `projects/${encodeURIComponent(id)}`
  const sectionPath = (projectId, sectionId) => `${projectPath(projectId)}/sections/${encodeURIComponent(sectionId)}`

  async function request(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json', 'X-Demo-Company-Id': getCompanyId() }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = response.status === 204 ? null : await response.json()
    if (!response.ok) {
      throw new ProjectApiError(
        payload?.message || `La operación de proyectos falló (HTTP ${response.status}).`,
        response.status,
        payload?.code,
        payload?.errors,
      )
    }
    return payload
  }

  return {
    listProjects: () => request('projects'),
    getProject: (id) => request(projectPath(id)),
    registerProject: (input) => request('projects', { method: 'POST', body: input }),
    addSection: (projectId, input) => request(`${projectPath(projectId)}/sections`, { method: 'POST', body: input }),
    updateSection: (projectId, sectionId, input) => request(sectionPath(projectId, sectionId), { method: 'PUT', body: input }),
    removeSection: (projectId, sectionId) => request(sectionPath(projectId, sectionId), { method: 'DELETE' }),
  }
}
