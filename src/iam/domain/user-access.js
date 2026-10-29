export const PERMISSIONS = Object.freeze({
  view_projects: { label: 'Ver proyectos', detail: 'Consultar proyectos y tramos' },
  consult_sensors: { label: 'Consultar sensores', detail: 'Ver equipos y puntos de monitoreo' },
  consult_indicators: { label: 'Consultar indicadores', detail: 'Revisar mediciones ambientales' },
  consult_alerts: { label: 'Consultar alertas', detail: 'Ver desviaciones y avisos' },
  manage_incidents: { label: 'Gestionar incidentes', detail: 'Abrir y clasificar casos' },
  corrective_actions: { label: 'Registrar acciones correctivas', detail: 'Plan y seguimiento de remediación' },
  field_evidence: { label: 'Registrar evidencias', detail: 'Documentar hallazgos de campo' },
  generate_reports: { label: 'Generar reportes', detail: 'Crear reportes ambientales' },
  manage_users: { label: 'Administrar usuarios', detail: 'Invitar y modificar accesos' },
})

export const ROLES = Object.freeze({
  company_admin: { label: 'Administrador de empresa', permissions: Object.keys(PERMISSIONS) },
  site_director: { label: 'Director de obra', permissions: ['view_projects', 'consult_sensors', 'consult_indicators', 'consult_alerts', 'manage_incidents', 'corrective_actions', 'generate_reports'] },
  environmental_engineer: { label: 'Ingeniero ambiental', permissions: ['view_projects', 'consult_sensors', 'consult_indicators', 'consult_alerts', 'manage_incidents', 'generate_reports'] },
  inspector: { label: 'Inspector', permissions: ['view_projects', 'consult_sensors', 'consult_indicators', 'consult_alerts', 'manage_incidents', 'field_evidence'] },
  field_collaborator: { label: 'Colaborador de campo', permissions: ['view_projects', 'consult_alerts', 'field_evidence'] },
})

export class AccessPolicyError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'AccessPolicyError'
    this.code = code
  }
}

export function validateInvitation(input, users = []) {
  const errors = {}
  if (!input?.name?.trim()) errors.name = 'Ingresa el nombre del colaborador.'
  const email = input?.email?.trim().toLowerCase() || ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Ingresa un correo válido.'
  else if (users.some((user) => user.companyId === input.companyId && user.email.toLowerCase() === email)) errors.email = 'Este correo ya está registrado en la empresa.'
  if (!Object.hasOwn(ROLES, input?.roleId)) errors.roleId = 'Selecciona un rol válido.'
  if (!input?.companyId) errors.companyId = 'Selecciona una empresa.'
  return errors
}

export function inviteUser(input, users = [], actor, now = new Date()) {
  requireAdmin(actor, input)
  const errors = validateInvitation(input, users)
  if (Object.keys(errors).length) throw new AccessPolicyError('INVALID_INVITATION', 'Revisa los datos de la invitación.')
  return {
    id: globalThis.crypto.randomUUID(), companyId: input.companyId, name: input.name.trim(), email: input.email.trim().toLowerCase(),
    roleId: input.roleId, permissions: [...ROLES[input.roleId].permissions],
    invitation: { status: 'pending', invitedAt: now.toISOString() },
    access: { status: 'pending', grantedAt: null },
  }
}

function requireAdmin(actor, target) {
  if (!actor || actor.access?.status !== 'active' || !actor.permissions?.includes('manage_users')) {
    throw new AccessPolicyError('ADMIN_REQUIRED', 'Solo un administrador con acceso activo puede gestionar usuarios.')
  }
  if (target?.companyId !== actor.companyId) throw new AccessPolicyError('CROSS_COMPANY_FORBIDDEN', 'Solo puedes gestionar usuarios de tu empresa.')
}

export function grantUserAccess(user, actor, now = new Date()) {
  requireAdmin(actor, user)
  if (user.access.status === 'active') throw new AccessPolicyError('ALREADY_ACTIVE', 'El colaborador ya tiene acceso.')
  return { ...user, invitation: { ...user.invitation, status: 'accepted' }, access: { status: 'active', grantedAt: now.toISOString() } }
}

export function revokeUserAccess(user, actor) {
  requireAdmin(actor, user)
  if (user.id === actor.id) throw new AccessPolicyError('SELF_REVOKE_FORBIDDEN', 'No puedes revocar tu propio acceso.')
  if (user.access.status !== 'active') throw new AccessPolicyError('ACCESS_NOT_ACTIVE', 'El colaborador no tiene acceso activo.')
  return { ...user, access: { ...user.access, status: 'revoked' } }
}

export function assignRole(user, roleId, actor) {
  requireAdmin(actor, user)
  if (!Object.hasOwn(ROLES, roleId)) throw new AccessPolicyError('INVALID_ROLE', 'El rol seleccionado no existe.')
  if (user.id === actor.id && roleId !== 'company_admin') throw new AccessPolicyError('SELF_LOCKOUT_FORBIDDEN', 'No puedes quitarte el rol de administrador.')
  return { ...user, roleId, permissions: [...ROLES[roleId].permissions] }
}

export function setUserPermissions(user, permissions, actor) {
  requireAdmin(actor, user)
  if (user.access.status !== 'active') throw new AccessPolicyError('ACCESS_NOT_ACTIVE', 'Otorga acceso antes de editar permisos.')
  if (!Array.isArray(permissions) || permissions.some((permission) => !Object.hasOwn(PERMISSIONS, permission))) {
    throw new AccessPolicyError('INVALID_PERMISSIONS', 'La selección contiene permisos desconocidos.')
  }
  if (user.id === actor.id && !permissions.includes('manage_users')) throw new AccessPolicyError('SELF_LOCKOUT_FORBIDDEN', 'Conserva tu permiso para administrar usuarios.')
  return { ...user, permissions: [...new Set(permissions)] }
}

export function canSignIn(user, companyId) {
  return Boolean(user && user.companyId === companyId && user.invitation?.status === 'accepted' && user.access?.status === 'active')
}
