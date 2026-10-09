export class IamApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.name = 'IamApiError'
    this.status = status
    this.code = code
  }
}

export function createIamApiRepository({ baseUrl, fetchImpl = globalThis.fetch, getToken = () => null }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path, { method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetchImpl(new URL(path, root), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const payload = await response.json()
    if (!response.ok) throw new IamApiError(payload.message || 'No se pudo completar la operación IAM.', response.status, payload.code)
    return payload
  }
  const userPath = (id, operation) => `iam/users/${encodeURIComponent(id)}/${operation}`
  return {
    signIn: (companyId, email, password) => request('iam/sessions', { method: 'POST', body: { companyId, email, password } }),
    currentSession: () => request('iam/sessions/current'),
    signOut: () => request('iam/sessions/current', { method: 'DELETE' }),
    listUsers: () => request('iam/users'),
    invite: (input) => request('iam/invitations', { method: 'POST', body: input }),
    grant: (id) => request(userPath(id, 'grant'), { method: 'POST' }),
    revoke: (id) => request(userPath(id, 'revoke'), { method: 'POST' }),
    changeRole: (id, roleId) => request(userPath(id, 'role'), { method: 'PUT', body: { roleId } }),
    changePermissions: (id, permissions) => request(userPath(id, 'permissions'), { method: 'PUT', body: { permissions } }),
  }
}
