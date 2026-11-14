const roleNames = {
  CompanyAdmin: 'company_admin', SiteDirector: 'site_director',
  EnvironmentalEngineer: 'environmental_engineer', Inspector: 'inspector',
  FieldCollaborator: 'field_collaborator',
}
const permissionNames = {
  ViewProjects: 'view_projects', ConsultSensors: 'consult_sensors',
  ConsultIndicators: 'consult_indicators', ConsultAlerts: 'consult_alerts',
  ManageIncidents: 'manage_incidents', RegisterCorrectiveActions: 'corrective_actions',
  RegisterFieldEvidence: 'field_evidence', GenerateReports: 'generate_reports',
  ManageUsers: 'manage_users',
}
const backendRole = Object.fromEntries(Object.entries(roleNames).map(([key, value]) => [value, key]))
const backendPermission = Object.fromEntries(Object.entries(permissionNames).map(([key, value]) => [value, key]))

export function userFromBackend(user) {
  return {
    ...user,
    roleId: roleNames[user.role] || user.role,
    permissions: (user.permissions || []).map((permission) => permissionNames[permission] || permission),
    access: { status: user.accessStatus?.toLowerCase() || 'pending' },
    invitation: { status: 'accepted' },
  }
}

export function createIamBackendRepository({ baseUrl, fetchImpl = globalThis.fetch, getToken = () => null }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path, { method = 'GET', body } = {}) {
    const token = getToken()
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La operación de acceso falló (HTTP ${response.status}).`)
    return payload
  }
  const userPath = (id, suffix) => `iam/users/${encodeURIComponent(id)}/${suffix}`
  return {
    signUp: async (companyId, name, email, password) => userFromBackend(await request('iam/sign-up', {
      method: 'POST', body: { companyId, name, email, password },
    })),
    signIn: async (companyId, email, password) => {
      const result = await request('iam/sessions', { method: 'POST', body: { companyId: companyId || null, email, password } })
      return { token: result.token, user: userFromBackend(result.user) }
    },
    currentSession: async () => ({ user: userFromBackend(await request('iam/sessions/current')) }),
    signOut: () => request('iam/sessions/current', { method: 'DELETE' }),
    listUsers: async () => (await request('iam/users')).map(userFromBackend),
    listInvitations: () => request('iam/invitations'),
    getInvitation: (id) => request(`iam/invitations/${encodeURIComponent(id)}`),
    invite: (input) => request('iam/invitations', { method: 'POST', body: {
      name: input.name, email: input.email, role: backendRole[input.roleId],
    } }),
    acceptInvitation: async (id, password) => userFromBackend(await request(`iam/invitations/${encodeURIComponent(id)}/acceptance`, {
      method: 'POST', body: { password },
    })),
    grant: async (id) => userFromBackend(await request(userPath(id, 'grant'), { method: 'POST' })),
    revoke: async (id) => userFromBackend(await request(userPath(id, 'revoke'), { method: 'POST' })),
    changeRole: async (id, roleId) => userFromBackend(await request(userPath(id, 'role'), {
      method: 'PUT', body: { role: backendRole[roleId] },
    })),
    changePermissions: async (id, permissions) => userFromBackend(await request(userPath(id, 'permissions'), {
      method: 'PUT', body: { permissions: permissions.map((permission) => backendPermission[permission]) },
    })),
  }
}
