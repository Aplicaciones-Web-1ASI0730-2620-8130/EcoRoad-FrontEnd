<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { getIamApi } from '../../application/iam-session.js'

const route = useRoute()
const router = useRouter()
const invitation = ref(null)
const password = ref('')
const error = ref('')
const busy = ref(false)
const accepted = ref(false)
onMounted(async () => {
  try { invitation.value = await getIamApi().getInvitation(route.params.id) }
  catch (cause) { error.value = cause.message }
})
async function accept() {
  busy.value = true
  error.value = ''
  try {
    await getIamApi().acceptInvitation(route.params.id, password.value)
    accepted.value = true
  } catch (cause) { error.value = cause.message }
  finally { busy.value = false }
}
</script>

<template>
  <main class="iam-login-page"><section class="iam-login-card">
    <h1>Invitación a EcoRoad</h1>
    <p v-if="invitation">{{ invitation.name }}, has sido invitado a la empresa {{ invitation.companyId }}.</p>
    <p v-if="accepted">Cuenta creada. Un administrador debe concederte acceso antes de que puedas ingresar.</p>
    <form v-else-if="invitation?.status === 'Pending'" @submit.prevent="accept">
      <label for="invite-password">Crea una contraseña</label>
      <input id="invite-password" v-model="password" type="password" autocomplete="new-password" required minlength="8" />
      <Button type="submit" label="Aceptar invitación" :loading="busy" />
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <Button v-if="accepted" label="Ir a iniciar sesión" @click="router.push('/iam/login')" />
  </section></main>
</template>
