import { computed, ref } from 'vue'
import { assignRole, grantUserAccess, inviteUser, revokeUserAccess, setUserPermissions, validateInvitation } from '../domain/user-access.js'
import { createDemoUsers, DEMO_ADMIN_ID } from '../infrastructure/iam-demo-data.js'

// First delivery: page-local simulation. HTTP persistence and sign-in arrive with the fake API.
export function createIamDemoStore(companyId = 'demo-company') {
  const users = ref(createDemoUsers().filter((user) => user.companyId === companyId))
  const selectedId = ref(users.value[1]?.id || users.value[0]?.id || null)
  const selected = computed(() => users.value.find((user) => user.id === selectedId.value) || null)
  const actor = computed(() => users.value.find((user) => user.id === DEMO_ADMIN_ID))
  const error = ref('')
  const fieldErrors = ref({})

  function update(action, id) {
    error.value = ''
    try {
      const user = users.value.find((item) => item.id === id)
      if (!user) return false
      const changed = action(user, actor.value)
      users.value = users.value.map((item) => item.id === id ? changed : item)
      return true
    } catch (cause) { error.value = cause.message; return false }
  }

  function invite(input) {
    error.value = ''
    fieldErrors.value = validateInvitation({ ...input, companyId }, users.value)
    if (Object.keys(fieldErrors.value).length) return null
    try {
      const user = inviteUser({ ...input, companyId }, users.value, actor.value)
      users.value = [...users.value, user]
      selectedId.value = user.id
      return user
    } catch (cause) { error.value = cause.message; return null }
  }

  return {
    users, selectedId, selected, error, fieldErrors, invite,
    grant: (id) => update((user, admin) => grantUserAccess(user, admin), id),
    revoke: (id) => update((user, admin) => revokeUserAccess(user, admin), id),
    changeRole: (id, roleId) => update((user, admin) => assignRole(user, roleId, admin), id),
    changePermissions: (id, permissions) => update((user, admin) => setUserPermissions(user, permissions, admin), id),
  }
}
