import { computed, ref } from 'vue'
import { validateInvitation } from '../domain/user-access.js'
import { getIamApi } from './iam-session.js'
import { useFakeApi } from '../../shared/infrastructure/api-mode.js'

function pendingInvitation(invitation) {
  return { id: invitation.id, companyId: invitation.companyId, name: invitation.name, email: invitation.email,
    roleId: { CompanyAdmin: 'company_admin', SiteDirector: 'site_director', EnvironmentalEngineer: 'environmental_engineer', Inspector: 'inspector', FieldCollaborator: 'field_collaborator' }[invitation.role],
    permissions: [], access: { status: 'pending' }, invitation: { status: 'pending' }, isInvitation: true }
}

export function createIamDemoStore(companyId, api = getIamApi()) {
  const users = ref([])
  const selectedId = ref(null)
  const selected = computed(() => users.value.find((user) => user.id === selectedId.value) || null)
  const error = ref('')
  const fieldErrors = ref({})

  async function load() {
    error.value = ''
    try {
      const activeUsers = await api.listUsers()
      if (useFakeApi) users.value = activeUsers
      else {
        const invitations = await api.listInvitations()
        users.value = [...activeUsers, ...invitations.filter((item) => item.status === 'Pending' &&
          !activeUsers.some((user) => user.email.toLowerCase() === item.email.toLowerCase())).map(pendingInvitation)]
      }
      if (!users.value.some((user) => user.id === selectedId.value)) selectedId.value = users.value[1]?.id || users.value[0]?.id || null
    } catch (cause) { error.value = cause.message }
  }

  async function update(action, id) {
    error.value = ''
    try {
      const changed = await action(id)
      users.value = users.value.map((user) => user.id === id ? changed : user)
      return true
    } catch (cause) { error.value = cause.message; return false }
  }

  async function invite(input) {
    error.value = ''
    fieldErrors.value = validateInvitation({ ...input, companyId }, users.value)
    if (Object.keys(fieldErrors.value).length) return null
    try {
      const invitation = await api.invite(input)
      const user = useFakeApi ? invitation : pendingInvitation(invitation)
      users.value = [...users.value, user]
      selectedId.value = user.id
      return user
    } catch (cause) { error.value = cause.message; return null }
  }

  return {
    users, selectedId, selected, error, fieldErrors, load, invite,
    grant: (id) => update(api.grant, id),
    revoke: (id) => update(api.revoke, id),
    changeRole: (id, roleId) => update((target) => api.changeRole(target, roleId), id),
    changePermissions: (id, permissions) => update((target) => api.changePermissions(target, permissions), id),
  }
}
