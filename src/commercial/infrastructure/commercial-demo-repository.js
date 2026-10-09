import { SUBSCRIPTION_STATUS } from '../domain/commercial-model.js'

const STORAGE_KEY = 'ecoroad.commercial.demo.v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function write(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  return state
}

function addYear(date) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + 1)
  return next.toISOString()
}

export const commercialDemoRepository = {
  getState: read,
  registerCompany(input) {
    if (read()) throw new Error('Ya existe una empresa registrada en este navegador.')
    return write({
      company: {
        id: crypto.randomUUID(),
        name: input.companyName.trim(),
        ruc: input.ruc,
        type: input.companyType,
        adminName: input.adminName.trim(),
        adminEmail: input.adminEmail.trim().toLowerCase(),
        professionalLicense: input.professionalLicense?.trim() || '',
        registeredAt: new Date().toISOString(),
      },
      subscription: {
        planId: input.planId,
        status: SUBSCRIPTION_STATUS.PENDING,
        activatedAt: null,
        expiresAt: null,
      },
    })
  },
  selectPlan(planId) {
    const state = read()
    if (!state) throw new Error('Registra una empresa antes de seleccionar un plan.')
    if (state.subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      throw new Error('El cambio de plan activo requiere la confirmación del proveedor de pagos.')
    }
    state.subscription.planId = planId
    return write(state)
  },
  simulateActivation() {
    const state = read()
    if (!state) throw new Error('No hay una empresa registrada.')
    if (state.subscription.status === SUBSCRIPTION_STATUS.ACTIVE) return state
    const now = new Date().toISOString()
    state.subscription = {
      ...state.subscription,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      activatedAt: now,
      expiresAt: addYear(now),
    }
    return write(state)
  },
  simulateRenewal() {
    const state = read()
    if (!state) throw new Error('No hay una empresa registrada.')
    if (state.subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      throw new Error('Activa la suscripción antes de renovarla.')
    }
    const base = new Date(state.subscription.expiresAt) > new Date()
      ? state.subscription.expiresAt
      : new Date().toISOString()
    state.subscription.expiresAt = addYear(base)
    return write(state)
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY)
  },
}

