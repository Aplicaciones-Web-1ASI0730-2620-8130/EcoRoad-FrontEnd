import { computed, ref } from 'vue'
import { commercialDemoRepository } from '../infrastructure/commercial-demo-repository.js'
import { PLANS, canAccessOperationalModules, validateCompanyRegistration } from '../domain/commercial-model.js'

const state = ref(commercialDemoRepository.getState())
const error = ref('')

export function useCommercial() {
  const company = computed(() => state.value?.company || null)
  const subscription = computed(() => state.value?.subscription || null)
  const selectedPlan = computed(() => PLANS.find((plan) => plan.id === subscription.value?.planId) || null)
  const hasOperationalAccess = computed(() => canAccessOperationalModules(subscription.value))

  function run(action) {
    error.value = ''
    try {
      state.value = action()
      return true
    } catch (cause) {
      error.value = cause.message
      return false
    }
  }

  return {
    company,
    subscription,
    selectedPlan,
    hasOperationalAccess,
    error,
    registerCompany(input) {
      const errors = validateCompanyRegistration(input)
      if (Object.keys(errors).length) return errors
      return run(() => commercialDemoRepository.registerCompany(input)) ? {} : { form: error.value }
    },
    selectPlan(planId) {
      if (!PLANS.some((plan) => plan.id === planId)) return false
      return run(() => commercialDemoRepository.selectPlan(planId))
    },
    activate: () => run(() => commercialDemoRepository.simulateActivation()),
    renew: () => run(() => commercialDemoRepository.simulateRenewal()),
    reset: () => run(() => {
      commercialDemoRepository.clear()
      return null
    }),
  }
}

