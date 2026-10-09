import { ROLES } from '../domain/user-access.js'

const active = (id, name, email, roleId) => ({
  id, companyId: 'demo-company', name, email, roleId, permissions: [...ROLES[roleId].permissions],
  invitation: { status: 'accepted', invitedAt: '2026-09-01T12:00:00Z' },
  access: { status: 'active', grantedAt: '2026-09-02T12:00:00Z' },
})

export const DEMO_ADMIN_ID = 'usr-carlos'
export function createDemoUsers() {
  return [
    active(DEMO_ADMIN_ID, 'Carlos Mendoza', 'c.mendoza@empresa.pe', 'company_admin'),
    active('usr-ana', 'Ana Torres', 'ana.torres@empresa.pe', 'environmental_engineer'),
    active('usr-luis', 'Luis García', 'luis.garcia@empresa.pe', 'inspector'),
    active('usr-maria', 'María López', 'maria.lopez@empresa.pe', 'field_collaborator'),
  ]
}
