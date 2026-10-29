<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import MonitoringShell from '../../../monitoring/presentation/components/monitoring-shell.vue'
import { PERMISSIONS, ROLES } from '../../domain/user-access.js'
import { createIamDemoStore } from '../../application/use-iam-demo.js'
import { getDemoCompanyId } from '../../../projects/infrastructure/demo-company.js'
import { currentUser } from '../../application/iam-session.js'
import '../iam.css'

const store = createIamDemoStore(getDemoCompanyId())
onMounted(() => store.load())
const selected = store.selected
const search = ref('')
const visibleUsers = computed(() => store.users.value.filter((user) => `${user.name} ${user.email} ${ROLES[user.roleId].label}`.toLocaleLowerCase('es').includes(search.value.trim().toLocaleLowerCase('es'))))
const activeCount = computed(() => store.users.value.filter((user) => user.access.status === 'active').length)
const pendingCount = computed(() => store.users.value.filter((user) => user.invitation.status === 'pending').length)
const inviteOpen = ref(false)
const inviteDraft = reactive({ name: '', email: '', roleId: 'environmental_engineer' })
const draftRole = ref('')
const draftPermissions = ref([])
const feedback = ref('')
const initials = (name) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

watch(store.selectedId, () => {
  const user = selected.value
  draftRole.value = user?.roleId || ''
  draftPermissions.value = [...(user?.permissions || [])]
  feedback.value = ''
}, { immediate: true })

async function submitInvite() {
  const invited = await store.invite({ ...inviteDraft })
  if (!invited) return
  inviteOpen.value = false
  Object.assign(inviteDraft, { name: '', email: '', roleId: 'environmental_engineer' })
  feedback.value = 'Invitación creada. Concede acceso para habilitar el inicio de sesión.'
}

async function grant() {
  if (await store.grant(selected.value.id)) feedback.value = 'Acceso concedido.'
}

async function revoke() {
  if (await store.revoke(selected.value.id)) feedback.value = 'Acceso revocado.'
}

async function saveRole() {
  if (await store.changeRole(selected.value.id, draftRole.value)) {
    draftPermissions.value = [...selected.value.permissions]
    feedback.value = 'Rol asignado y permisos base actualizados.'
  }
}

function togglePermission(permission) {
  draftPermissions.value = draftPermissions.value.includes(permission)
    ? draftPermissions.value.filter((item) => item !== permission)
    : [...draftPermissions.value, permission]
}

async function savePermissions() {
  if (await store.changePermissions(selected.value.id, draftPermissions.value)) feedback.value = 'Permisos guardados.'
}
</script>

<template>
  <MonitoringShell>
    <div class="monitoring-heading iam-heading"><div><span class="monitoring-eyebrow">IDENTIDAD Y ACCESO</span><h1>Colaboradores y permisos</h1><p>Invita personas y configura las acciones disponibles según su función en la empresa.</p></div><Button label="Invitar colaborador" icon="pi pi-user-plus" @click="inviteOpen = !inviteOpen" /></div>
    <div class="iam-demo-note" role="note"><i class="pi pi-info-circle" aria-hidden="true"></i> Fake API local: los cambios se conservan al recargar y se reinician al reiniciar el servidor.</div>
    <div v-if="store.error.value" class="iam-error" role="alert">{{ store.error.value }}</div>
    <div v-if="feedback" class="iam-feedback" role="status">{{ feedback }}</div>

    <form v-if="inviteOpen" class="iam-panel iam-invite" novalidate @submit.prevent="submitInvite"><div class="iam-panel-title"><h2>Invitar nuevo colaborador</h2><button type="button" class="iam-plain" @click="inviteOpen = false">Cancelar</button></div><div class="iam-invite-grid">
      <label>Nombre completo <input v-model="inviteDraft.name" type="text" autocomplete="name" placeholder="Ej. Roberto Sánchez" /><small v-if="store.fieldErrors.value.name" class="iam-field-error">{{ store.fieldErrors.value.name }}</small></label>
      <label>Correo institucional <input v-model="inviteDraft.email" type="email" autocomplete="email" placeholder="nombre@empresa.pe" /><small v-if="store.fieldErrors.value.email" class="iam-field-error">{{ store.fieldErrors.value.email }}</small></label>
      <label>Rol inicial <select v-model="inviteDraft.roleId"><option v-for="[id, role] in Object.entries(ROLES)" :key="id" :value="id">{{ role.label }}</option></select><small v-if="store.fieldErrors.value.roleId" class="iam-field-error">{{ store.fieldErrors.value.roleId }}</small></label>
    </div><Button label="Crear invitación" type="submit" icon="pi pi-send" /></form>

    <div class="iam-summary"><div><span>COLABORADORES</span><strong>{{ store.users.value.length }}</strong><small>registrados en la empresa</small></div><div><span>ACCESOS ACTIVOS</span><strong>{{ activeCount }}</strong><small>pueden ingresar según la política</small></div><div><span>INVITACIONES PENDIENTES</span><strong>{{ pendingCount }}</strong><small>sin acceso a la plataforma</small></div></div>

    <div class="iam-layout"><section class="iam-panel iam-registry" aria-labelledby="iam-registry-title"><div class="iam-panel-title"><div><span>REGISTRO DE USUARIOS</span><h2 id="iam-registry-title">Colaboradores de la empresa</h2></div><span class="iam-count">{{ visibleUsers.length }} visibles</span></div><input v-model="search" class="iam-search" type="search" aria-label="Buscar colaborador" placeholder="Buscar por nombre, correo o rol..." />
      <div v-if="!visibleUsers.length" class="iam-empty">No hay colaboradores para esta búsqueda.</div>
      <div v-else class="iam-user-list"><button v-for="user in visibleUsers" :key="user.id" type="button" class="iam-user" :class="{ selected: selected?.id === user.id }" :aria-pressed="selected?.id === user.id" @click="store.selectedId.value = user.id"><span class="iam-user-avatar">{{ initials(user.name) }}</span><span class="iam-user-info"><strong>{{ user.name }}</strong><small>{{ user.email }}</small><small>{{ ROLES[user.roleId].label }}</small></span><span class="iam-status" :class="user.access.status">{{ user.access.status === 'active' ? 'Activo' : user.access.status === 'revoked' ? 'Revocado' : 'Invitado' }}</span></button></div>
    </section>

    <section class="iam-panel iam-detail" aria-labelledby="iam-detail-title"><template v-if="selected"><div class="iam-panel-title"><div><span>EDITAR ACCESO</span><h2 id="iam-detail-title">{{ selected.name }}</h2><p>{{ selected.email }}</p></div><span class="iam-status" :class="selected.access.status">{{ selected.access.status === 'active' ? 'Activo' : selected.access.status === 'revoked' ? 'Revocado' : 'Invitado' }}</span></div>
      <div class="iam-role-editor"><label for="iam-role">Rol de la organización</label><div><select id="iam-role" v-model="draftRole"><option v-for="[id, role] in Object.entries(ROLES)" :key="id" :value="id">{{ role.label }}</option></select><Button label="Asignar rol" size="small" outlined :disabled="draftRole === selected.roleId" @click="saveRole" /></div></div>
      <div class="iam-access-actions"><Button v-if="selected.access.status !== 'active'" label="Conceder acceso" icon="pi pi-check" size="small" @click="grant" /><Button v-else label="Revocar acceso" icon="pi pi-ban" size="small" severity="danger" outlined :disabled="selected.id === currentUser?.id" @click="revoke" /><small>{{ selected.access.status === 'active' ? 'El usuario cumple la política de acceso para iniciar sesión.' : 'No puede iniciar sesión hasta que se le conceda acceso.' }}</small></div>
      <fieldset class="iam-permissions"><legend>Acciones autorizadas</legend><label v-for="[key, permission] in Object.entries(PERMISSIONS)" :key="key" :class="{ disabled: selected.access.status !== 'active' }"><input type="checkbox" :checked="draftPermissions.includes(key)" :disabled="selected.access.status !== 'active'" @change="togglePermission(key)" /><span><strong>{{ permission.label }}</strong><small>{{ permission.detail }}</small></span></label></fieldset><Button label="Guardar permisos" icon="pi pi-check" class="iam-save" :disabled="selected.access.status !== 'active'" @click="savePermissions" />
    </template><div v-else class="iam-empty" id="iam-detail-title">Selecciona un colaborador para consultar sus permisos.</div></section></div>
  </MonitoringShell>
</template>
