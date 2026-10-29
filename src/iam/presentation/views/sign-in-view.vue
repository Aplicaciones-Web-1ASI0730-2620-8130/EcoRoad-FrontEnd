<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { getDemoCompanyId } from '../../../projects/infrastructure/demo-company.js'
import { signIn } from '../../application/iam-session.js'
import '../iam.css'

const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const visible = ref(false)
const busy = ref(false)
const error = ref('')
const isDemoCompany = getDemoCompanyId() === 'demo-company'

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await signIn(getDemoCompanyId(), email.value, password.value)
    const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : '/projects'
    await router.replace(target)
  } catch (cause) { error.value = cause.message } finally { busy.value = false }
}
</script>

<template>
  <div class="iam-login-page">
    <header class="iam-login-header"><RouterLink to="/"><span class="iam-login-mark"><i class="pi pi-leaf" aria-hidden="true"></i></span><strong>EcoRoad</strong></RouterLink><span>IDENTIDAD Y ACCESO</span></header>
    <main class="iam-login-main"><section class="iam-login-card" aria-labelledby="iam-login-title">
      <span class="iam-login-mark large"><i class="pi pi-leaf" aria-hidden="true"></i></span>
      <h1 id="iam-login-title">Iniciar sesión en EcoRoad</h1>
      <p>Accede al monitoreo ambiental de tus proyectos viales.</p>
      <form @submit.prevent="submit">
        <label for="iam-email">Correo institucional</label><input id="iam-email" v-model.trim="email" type="email" autocomplete="username" required placeholder="nombre@empresa.pe" />
        <label for="iam-password">Contraseña</label><div class="iam-password"><input id="iam-password" v-model="password" :type="visible ? 'text' : 'password'" autocomplete="current-password" required /><button type="button" :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="visible = !visible"><i :class="visible ? 'pi pi-eye-slash' : 'pi pi-eye'" aria-hidden="true"></i></button></div>
        <div v-if="error" class="iam-error" role="alert">{{ error }}</div>
        <Button type="submit" label="Ingresar a la plataforma" icon="pi pi-arrow-right" icon-pos="right" :loading="busy" />
      </form>
      <div class="iam-demo-credentials"><strong>Acceso de demostración</strong><span>{{ isDemoCompany ? 'c.mendoza@empresa.pe' : 'Usa el correo administrador registrado' }}</span><span>EcoRoadDemo123!</span><small>Esta contraseña solo funciona en la fake API local. Las cuentas nuevas se reinician al reiniciar el servidor.</small></div>
    </section></main>
  </div>
</template>
