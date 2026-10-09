<script setup>
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import CommercialHeader from '../components/commercial-header.vue'
import { PLANS, SUBSCRIPTION_STATUS } from '../../domain/commercial-model.js'
import { useCommercial } from '../../application/use-commercial.js'

const commercial = useCommercial()
const feedback = ref('')
const status = computed(() => commercial.subscription.value?.status || 'missing')
onMounted(() => commercial.refresh())
const formattedDate = (date) => date
  ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(date))
  : 'Pendiente'

async function perform(action, message) {
  feedback.value = ''
  if (await action()) feedback.value = message
}
</script>

<template>
  <CommercialHeader />
  <main class="subscription-page">
    <div class="subscription-shell">
      <div class="eyebrow">EcoRoad / Gestión comercial / Suscripción</div>
      <div class="page-heading">
        <div>
          <h1>Tu suscripción</h1>
          <p class="page-intro">Consulta el plan y la vigencia del servicio de tu empresa.</p>
        </div>
        <Tag v-if="status === SUBSCRIPTION_STATUS.ACTIVE" severity="success" value="Activa" />
        <Tag v-else-if="status === SUBSCRIPTION_STATUS.PENDING" severity="warn" value="Pendiente de activación" />
      </div>

      <Message severity="warn" :closable="false" class="notice">
        Fake API local: la activación y renovación son simulaciones sin pago real.
      </Message>
      <Message v-if="feedback" severity="success" :closable="false" class="notice">{{ feedback }}</Message>
      <Message v-if="commercial.error.value" severity="error" :closable="false" class="notice">{{ commercial.error.value }}</Message>

      <div v-if="!commercial.company.value" class="empty-state">
        <i class="pi pi-building" aria-hidden="true"></i>
        <h2>Aún no hay una empresa registrada</h2>
        <p>Registra tu empresa o carga la cuenta de ejemplo para revisar su suscripción.</p>
        <RouterLink to="/commercial/register" class="text-link">Ir al registro <i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
        <div class="example-action">
          <Button label="Cargar empresa de ejemplo" icon="pi pi-database" outlined :loading="commercial.loading.value" @click="perform(commercial.loadExample, 'Cuenta de ejemplo cargada desde la fake API.')" />
        </div>
      </div>

      <template v-else>
        <div class="subscription-grid">
          <section class="subscription-card primary-card">
            <div class="card-topline">
              <span>PLAN CONTRATADO</span>
              <i class="pi pi-verified" aria-hidden="true"></i>
            </div>
            <h2>{{ commercial.selectedPlan.value?.label }}</h2>
            <p>{{ commercial.selectedPlan.value?.description }}</p>
            <div class="card-divider"></div>
            <dl>
              <div><dt>Estado</dt><dd>{{ status === SUBSCRIPTION_STATUS.ACTIVE ? 'Activo' : 'Pendiente de activación' }}</dd></div>
              <div><dt>Fecha de activación</dt><dd>{{ formattedDate(commercial.subscription.value?.activatedAt) }}</dd></div>
              <div><dt>Vigencia hasta</dt><dd>{{ formattedDate(commercial.subscription.value?.expiresAt) }}</dd></div>
            </dl>
          </section>
          <section class="subscription-card">
            <div class="card-topline"><span>CUENTA EMPRESARIAL</span><i class="pi pi-building" aria-hidden="true"></i></div>
            <h2>{{ commercial.company.value.name }}</h2>
            <p>RUC {{ commercial.company.value.ruc }}</p>
            <div class="card-divider"></div>
            <dl>
              <div><dt>Administrador</dt><dd>{{ commercial.company.value.adminName }}</dd></div>
              <div><dt>Correo</dt><dd>{{ commercial.company.value.adminEmail }}</dd></div>
              <div><dt>Registro</dt><dd>{{ formattedDate(commercial.company.value.registeredAt) }}</dd></div>
            </dl>
          </section>
        </div>

        <section class="subscription-card plan-management">
          <div>
            <div class="card-topline"><span>GESTIÓN DEL PLAN</span></div>
            <h2>{{ status === SUBSCRIPTION_STATUS.ACTIVE ? 'Renueva tu suscripción' : 'Selecciona y activa tu plan' }}</h2>
            <p v-if="status !== SUBSCRIPTION_STATUS.ACTIVE">La empresa tendrá acceso a los módulos operativos cuando la suscripción esté activa.</p>
            <p v-else>La renovación demo extenderá la vigencia por un año desde el vencimiento actual.</p>
          </div>
          <div v-if="status !== SUBSCRIPTION_STATUS.ACTIVE" class="plan-buttons" aria-label="Planes disponibles">
            <Button
              v-for="plan in PLANS"
              :key="plan.id"
              :label="plan.label"
              :outlined="commercial.subscription.value.planId !== plan.id"
              @click="perform(() => commercial.selectPlan(plan.id), 'Plan seleccionado.')"
            />
          </div>
          <div class="management-actions">
            <Button
              v-if="status !== SUBSCRIPTION_STATUS.ACTIVE"
              label="Simular activación"
              icon="pi pi-check-circle"
              :loading="commercial.loading.value"
              @click="perform(commercial.activate, 'Suscripción activada en el modo demo.')"
            />
            <Button
              v-else
              label="Simular renovación"
              icon="pi pi-refresh"
              :loading="commercial.loading.value"
              @click="perform(commercial.renew, 'Vigencia renovada en el modo demo.')"
            />
          </div>
        </section>
        <button type="button" class="change-company" @click="commercial.clearSelection(); feedback = ''">Cambiar empresa de demostración</button>
        <p class="access-note">
          <i :class="commercial.hasOperationalAccess.value ? 'pi pi-lock-open' : 'pi pi-lock'" aria-hidden="true"></i>
          {{ commercial.hasOperationalAccess.value ? 'Acceso operativo habilitado en esta demostración.' : 'Los módulos operativos requieren una suscripción activa.' }}
        </p>
      </template>
    </div>
  </main>
</template>
