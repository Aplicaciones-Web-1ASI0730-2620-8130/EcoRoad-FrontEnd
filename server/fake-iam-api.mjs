import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { sendJson as send, readJson } from './http-json.mjs'
import { assignRole, canSignIn, grantUserAccess, inviteUser, revokeUserAccess, setUserPermissions, AccessPolicyError, ROLES } from '../src/iam/domain/user-access.js'
import { createDemoUsers } from '../src/iam/infrastructure/iam-demo-data.js'

// Local demo only. Real credentials and session storage belong in a production identity service.
export const DEMO_PASSWORD = 'EcoRoadDemo123!'
const passwordHash = scryptSync(DEMO_PASSWORD, 'ecoroad-local-demo', 64)
const portableSessionSecret = process.env.DEMO_SESSION_SECRET || passwordHash
const portableSessionLifetime = 12 * 60 * 60 * 1000

function createPortableSession(user) {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, companyId: user.companyId, expiresAt: Date.now() + portableSessionLifetime })).toString('base64url')
  const signature = createHmac('sha256', portableSessionSecret).update(payload).digest('base64url')
  return `demo.${payload}.${signature}`
}

function readPortableSession(token) {
  const match = /^demo\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token || '')
  if (!match) return null
  const expected = createHmac('sha256', portableSessionSecret).update(match[1]).digest()
  const supplied = Buffer.from(match[2], 'base64url')
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
  try {
    const session = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
    return session.companyId === 'demo-company' && session.expiresAt > Date.now() ? session : null
  } catch { return null }
}

export function createFakeIamRoutes({ includeExample = true, portableDemoSessions = false } = {}) {
  const users = new Map((includeExample ? createDemoUsers() : []).map((user) => [user.id, user]))
  const sessions = new Map()

  function authenticate(request) {
    const token = /^Bearer (.+)$/i.exec(request.headers.authorization || '')?.[1]
    const session = sessions.get(token) || (portableDemoSessions ? readPortableSession(token) : null)
    const user = session && users.get(session.userId)
    return user && canSignIn(user, session.companyId) ? { token, user } : null
  }

  function provisionAdmin(company) {
    const user = {
      id: randomUUID(), companyId: company.id, name: company.adminName, email: company.adminEmail,
      roleId: 'company_admin', permissions: [...ROLES.company_admin.permissions],
      invitation: { status: 'accepted', invitedAt: company.registeredAt },
      access: { status: 'active', grantedAt: company.registeredAt },
    }
    users.set(user.id, user)
    return user
  }

  async function handle(request, response, path) {
    if (path === '/api/iam/sessions' && request.method === 'POST') {
      const { companyId, email, password } = await readJson(request)
      const user = [...users.values()].find((item) => item.companyId === companyId && item.email === String(email || '').trim().toLowerCase())
      const candidate = scryptSync(String(password || '').slice(0, 256), 'ecoroad-local-demo', 64)
      if (!user || !timingSafeEqual(candidate, passwordHash)) return send(response, 401, { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' })
      if (!canSignIn(user, companyId)) return send(response, 403, { code: 'ACCESS_NOT_GRANTED', message: 'Tu acceso aún no está concedido o fue revocado.' })
      const token = portableDemoSessions && companyId === 'demo-company' ? createPortableSession(user) : randomUUID()
      if (!token.startsWith('demo.')) sessions.set(token, { userId: user.id, companyId })
      return send(response, 201, { token, user })
    }

    const auth = authenticate(request)
    if (!auth) return send(response, 401, { code: 'SESSION_REQUIRED', message: 'Inicia sesión para continuar.' })
    if (path === '/api/iam/sessions/current') {
      if (request.method === 'GET') return send(response, 200, { user: auth.user })
      if (request.method === 'DELETE') { sessions.delete(auth.token); return send(response, 200, { signedOut: true }) }
    }

    if (!auth.user.permissions.includes('manage_users')) return send(response, 403, { code: 'ADMIN_REQUIRED', message: 'No tienes permiso para administrar colaboradores.' })
    if (path === '/api/iam/users' && request.method === 'GET') return send(response, 200, [...users.values()].filter((user) => user.companyId === auth.user.companyId))
    if (path === '/api/iam/invitations' && request.method === 'POST') {
      const input = await readJson(request)
      try {
        const user = inviteUser({ ...input, companyId: auth.user.companyId }, [...users.values()], auth.user)
        users.set(user.id, user)
        return send(response, 201, user)
      } catch (error) { return policyError(response, error) }
    }

    const match = path.match(/^\/api\/iam\/users\/([^/]+)\/(grant|revoke|role|permissions)$/)
    if (!match) return send(response, 404, { code: 'NOT_FOUND', message: 'Ruta IAM no encontrada.' })
    const user = users.get(decodeURIComponent(match[1]))
    if (!user || user.companyId !== auth.user.companyId) return send(response, 404, { code: 'USER_NOT_FOUND', message: 'Colaborador no encontrado.' })
    if ((match[2] === 'grant' || match[2] === 'revoke') && request.method !== 'POST') return send(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    if ((match[2] === 'role' || match[2] === 'permissions') && request.method !== 'PUT') return send(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    try {
      const input = ['role', 'permissions'].includes(match[2]) ? await readJson(request) : {}
      const changed = match[2] === 'grant' ? grantUserAccess(user, auth.user)
        : match[2] === 'revoke' ? revokeUserAccess(user, auth.user)
          : match[2] === 'role' ? assignRole(user, input.roleId, auth.user)
            : setUserPermissions(user, input.permissions, auth.user)
      users.set(user.id, changed)
      return send(response, 200, changed)
    } catch (error) { return policyError(response, error) }
  }

  return { handle, provisionAdmin, authenticate, listUsers: (companyId) => [...users.values()].filter((user) => user.companyId === companyId) }
}

function policyError(response, error) {
  if (!(error instanceof AccessPolicyError)) throw error
  return send(response, error.code === 'INVALID_INVITATION' || error.code === 'INVALID_ROLE' || error.code === 'INVALID_PERMISSIONS' ? 422 : 409, { code: error.code, message: error.message })
}
