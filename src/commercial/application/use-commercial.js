import { computed, ref } from 'vue'
import { createCommercialApiRepository } from '../infrastructure/commercial-api-repository.js'
import { createCommercialBackendRepository } from '../infrastructure/commercial-backend-repository.js'
import { getIamApi } from '../../iam/application/iam-session.js'
import { useFakeApi } from '../../shared/infrastructure/api-mode.js'
import { PLANS, canAccessOperationalModules, validateCompanyRegistration } from '../domain/commercial-model.js'

const SELECTED_COMPANY_KEY = 'ecoroad.commercial.selected-company'
const PENDING_ONBOARDING_KEY = 'ecoroad.commercial.pending-onboarding'
const pendingOnboardingId = ref(localStorage.getItem(PENDING_ONBOARDING_KEY))
const api = (useFakeApi ? createCommercialApiRepository : createCommercialBackendRepository)({
  baseUrl: import.meta.env.VITE_COMMERCIAL_API_URL || new URL('/api/', window.location.origin).href,
})
const state = ref(null)
const error = ref('')
const loading = ref(false)
const selectedCompanyId = ref(localStorage.getItem(SELECTED_COMPANY_KEY))

function describeError(cause) {
  return cause instanceof TypeError
    ? 'No se pudo conectar con la API. Comprueba que el backend esté en ejecución.'
    : cause.message || 'Ocurrió un error inesperado.'
}

async function run(action) {
  error.value = ''
  loading.value = true
  try {
    return await action()
  } catch (cause) {
    error.value = describeError(cause)
    return null
  } finally {
    loading.value = false
  }
}

export function useCommercial() {
  const company = computed(() => state.value?.company || null)
  const needsAdminRegistration = computed(() => !useFakeApi && Boolean(pendingOnboardingId.value))
  const subscription = computed(() => state.value?.subscription || null)
  const selectedPlan = computed(() => PLANS.find((plan) => plan.id === subscription.value?.planId) || null)
  const hasOperationalAccess = computed(() => canAccessOperationalModules(subscription.value))

  async function refresh() {
    if (!selectedCompanyId.value) {
      state.value = null
      return true
    }
    const result = await run(async () => {
      const [currentCompany, currentSubscription] = await Promise.all([
        api.getAccount(selectedCompanyId.value),
        api.getSubscription(selectedCompanyId.value),
      ])
      state.value = { company: currentCompany, subscription: currentSubscription }
      return true
    })
    if (!result && error.value.includes('HTTP 404')) {
      localStorage.removeItem(SELECTED_COMPANY_KEY)
      selectedCompanyId.value = null
      state.value = null
    }
    return !!result
  }

  return {
    company,
    needsAdminRegistration,
    subscription,
    selectedPlan,
    hasOperationalAccess,
    error,
    loading,
    refresh,
    async registerCompany(input) {
      const errors = validateCompanyRegistration(input)
      if (!useFakeApi && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(input.adminPassword || '')) errors.adminPassword = 'Usa al menos 8 caracteres, mayúscula, minúscula y número.'
      if (Object.keys(errors).length) return errors
      const result = await run(async () => {
        const currentCompany = pendingOnboardingId.value
          ? await api.getAccount(pendingOnboardingId.value) : await api.registerCompany(input)
        selectedCompanyId.value = currentCompany.id
        localStorage.setItem(SELECTED_COMPANY_KEY, currentCompany.id)
        if (!useFakeApi && !pendingOnboardingId.value) {
          pendingOnboardingId.value = currentCompany.id
          localStorage.setItem(PENDING_ONBOARDING_KEY, currentCompany.id)
        }
        const currentSubscription = await api.selectPlan(currentCompany.id, input.planId)
        if (!useFakeApi) await getIamApi().signUp(currentCompany.id, input.adminName.trim(), input.adminEmail.trim(), input.adminPassword)
        state.value = { company: currentCompany, subscription: currentSubscription }
        pendingOnboardingId.value = null
        localStorage.removeItem(PENDING_ONBOARDING_KEY)
        return true
      })
      const failure = error.value
      if (!result && selectedCompanyId.value) await refresh()
      return result ? {} : { form: failure }
    },
    async selectPlan(planId) {
      if (!PLANS.some((plan) => plan.id === planId) || !selectedCompanyId.value) return false
      return !!(await run(async () => {
        const currentSubscription = await api.selectPlan(selectedCompanyId.value, planId)
        state.value = { ...state.value, subscription: currentSubscription }
        return true
      }))
    },
    async activate() {
      if (!selectedCompanyId.value) return false
      return !!(await run(async () => {
        const result = await api.requestActivation(selectedCompanyId.value)
        state.value = { ...state.value, subscription: result.subscription }
        return true
      }))
    },
    async renew() {
      if (!selectedCompanyId.value) return false
      return !!(await run(async () => {
        const result = await api.requestRenewal(selectedCompanyId.value)
        state.value = { ...state.value, subscription: result.subscription }
        return true
      }))
    },
    async loadExample() {
      if (!useFakeApi) return false
      selectedCompanyId.value = 'demo-company'
      localStorage.setItem(SELECTED_COMPANY_KEY, 'demo-company')
      return refresh()
    },
    clearSelection() {
      selectedCompanyId.value = null
      localStorage.removeItem(SELECTED_COMPANY_KEY)
      pendingOnboardingId.value = null
      localStorage.removeItem(PENDING_ONBOARDING_KEY)
      state.value = null
      error.value = ''
    },
  }
}
