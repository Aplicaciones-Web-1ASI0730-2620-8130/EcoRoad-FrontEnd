import { computed, ref } from 'vue'
import { createCommercialApiRepository } from '../infrastructure/commercial-api-repository.js'
import { PLANS, canAccessOperationalModules, validateCompanyRegistration } from '../domain/commercial-model.js'

const SELECTED_COMPANY_KEY = 'ecoroad.commercial.selected-company'
const api = createCommercialApiRepository({
  baseUrl: import.meta.env.VITE_COMMERCIAL_API_URL || new URL('/api/', window.location.origin).href,
})
const state = ref(null)
const error = ref('')
const loading = ref(false)
const selectedCompanyId = ref(localStorage.getItem(SELECTED_COMPANY_KEY))

function describeError(cause) {
  return cause instanceof TypeError
    ? 'No se pudo conectar con la fake API. Inicia npm run api:fake.'
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
    if (!result && error.value.includes('no encontrada')) {
      localStorage.removeItem(SELECTED_COMPANY_KEY)
      selectedCompanyId.value = null
      state.value = null
    }
    return !!result
  }

  return {
    company,
    subscription,
    selectedPlan,
    hasOperationalAccess,
    error,
    loading,
    refresh,
    async registerCompany(input) {
      const errors = validateCompanyRegistration(input)
      if (Object.keys(errors).length) return errors
      const result = await run(async () => {
        const currentCompany = await api.registerCompany(input)
        selectedCompanyId.value = currentCompany.id
        localStorage.setItem(SELECTED_COMPANY_KEY, currentCompany.id)
        const currentSubscription = await api.selectPlan(currentCompany.id, input.planId)
        state.value = { company: currentCompany, subscription: currentSubscription }
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
      selectedCompanyId.value = 'demo-company'
      localStorage.setItem(SELECTED_COMPANY_KEY, 'demo-company')
      return refresh()
    },
    clearSelection() {
      selectedCompanyId.value = null
      localStorage.removeItem(SELECTED_COMPANY_KEY)
      state.value = null
      error.value = ''
    },
  }
}
