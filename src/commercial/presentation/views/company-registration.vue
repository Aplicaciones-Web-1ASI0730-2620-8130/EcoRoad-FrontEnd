<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import CommercialHeader from '../components/commercial-header.vue'
import { COMPANY_TYPES, PLANS } from '../../domain/commercial-model.js'
import { useCommercial } from '../../application/use-commercial.js'

const router = useRouter()
const commercial = useCommercial()
const form = reactive({
  companyName: '',
  ruc: '',
  companyType: 'construction',
  adminName: '',
  professionalLicense: '',
  adminEmail: '',
  planId: 'professional',
  acceptedTerms: false,
})
const errors = ref({})

function submit() {
  errors.value = commercial.registerCompany(form)
  if (Object.keys(errors.value).length === 0) router.push({ name: 'commercial-subscription' })
}
</script>

<template>
  <CommercialHeader />
  <main class="registration-page">
    <div class="form-shell">
      <div class="eyebrow">EcoRoad · Gestión comercial</div>
      <h1>Registro de cuenta empresarial</h1>
      <p class="page-intro">Habilita el monitoreo ambiental y la auditoría de tus proyectos de construcción o mantenimiento vial.</p>

      <Message v-if="commercial.company.value" severity="info" :closable="false" class="notice">
        Ya hay una empresa registrada en este navegador de demostración.
        <RouterLink to="/commercial/subscription">Ver suscripción</RouterLink>
      </Message>
      <Message severity="warn" :closable="false" class="notice">
        Modo demo local: no se procesan pagos ni se crea una cuenta real.
      </Message>

      <form class="registration-form" novalidate @submit.prevent="submit">
        <section class="form-section">
          <h2><span>1</span> Selecciona tu plan</h2>
          <div class="plan-list" role="radiogroup" aria-label="Plan de suscripción">
            <button
              v-for="plan in PLANS"
              :key="plan.id"
              type="button"
              class="plan-option"
              :class="{ selected: form.planId === plan.id }"
              role="radio"
              :aria-checked="form.planId === plan.id"
              @click="form.planId = plan.id"
            >
              <strong>{{ plan.label }}</strong>
              <small>{{ plan.description }}</small>
            </button>
          </div>
          <small v-if="errors.planId" class="field-error">{{ errors.planId }}</small>
        </section>

        <section class="form-section">
          <h2><span>2</span> Datos de la empresa</h2>
          <div class="form-grid company-grid">
            <div class="field">
              <label for="company-name">Razón social <b>*</b></label>
              <InputText id="company-name" v-model="form.companyName" placeholder="Ej. Consorcio Vial Sierra Central S.A.C." :invalid="!!errors.companyName" autocomplete="organization" />
              <small v-if="errors.companyName" class="field-error">{{ errors.companyName }}</small>
            </div>
            <div class="field">
              <label for="ruc">RUC (11 dígitos) <b>*</b></label>
              <InputText id="ruc" v-model="form.ruc" placeholder="20601234567" :invalid="!!errors.ruc" inputmode="numeric" maxlength="11" />
              <small v-if="errors.ruc" class="field-error">{{ errors.ruc }}</small>
            </div>
          </div>
          <div class="field">
            <span class="field-label">Tipo de empresa <b>*</b></span>
            <div class="company-types" role="radiogroup" aria-label="Tipo de empresa">
              <button
                v-for="type in COMPANY_TYPES"
                :key="type.value"
                type="button"
                class="type-option"
                :class="{ selected: form.companyType === type.value }"
                role="radio"
                :aria-checked="form.companyType === type.value"
                @click="form.companyType = type.value"
              >
                <i :class="type.icon" aria-hidden="true"></i>
                <strong>{{ type.label }}</strong>
                <small>{{ type.detail }}</small>
              </button>
            </div>
            <small v-if="errors.companyType" class="field-error">{{ errors.companyType }}</small>
          </div>
        </section>

        <section class="form-section">
          <h2><span>3</span> Contacto administrador</h2>
          <div class="form-grid">
            <div class="field">
              <label for="admin-name">Nombre completo <b>*</b></label>
              <InputText id="admin-name" v-model="form.adminName" placeholder="Ej. Ing. Carlos Mendoza Ruiz" :invalid="!!errors.adminName" autocomplete="name" />
              <small v-if="errors.adminName" class="field-error">{{ errors.adminName }}</small>
            </div>
            <div class="field">
              <label for="license">Colegiatura profesional <em>Opcional</em></label>
              <InputText id="license" v-model="form.professionalLicense" placeholder="CIP #84920" />
            </div>
            <div class="field">
              <label for="admin-email">Correo institucional <b>*</b></label>
              <InputText id="admin-email" v-model="form.adminEmail" type="email" placeholder="c.mendoza@empresa.pe" :invalid="!!errors.adminEmail" autocomplete="email" />
              <small v-if="errors.adminEmail" class="field-error">{{ errors.adminEmail }}</small>
            </div>
          </div>
        </section>

        <div class="terms-box">
          <Checkbox v-model="form.acceptedTerms" input-id="terms" binary />
          <label for="terms">Acepto los términos del servicio de monitoreo ambiental y gestión de telemetría de EcoRoad.</label>
        </div>
        <small v-if="errors.acceptedTerms" class="field-error terms-error">{{ errors.acceptedTerms }}</small>
        <Message v-if="errors.form" severity="error" :closable="false" class="notice">{{ errors.form }}</Message>

        <div class="form-actions">
          <span>El acceso del administrador se configurará en el contexto de identidad.</span>
          <Button type="submit" label="Crear cuenta empresarial" icon="pi pi-arrow-right" icon-pos="right" :disabled="!!commercial.company.value" />
        </div>
      </form>
    </div>
  </main>
</template>

