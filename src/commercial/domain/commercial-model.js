import { useFakeApi } from '../../shared/infrastructure/api-mode.js'

export const COMPANY_TYPES = Object.freeze(useFakeApi ? [
  { value: 'construction', label: 'Empresa constructora', detail: 'Proyectos de construcción vial', icon: 'pi pi-building' },
  { value: 'maintenance', label: 'Empresa de mantenimiento', detail: 'Conservación y mantenimiento vial', icon: 'pi pi-wrench' },
  { value: 'supervision', label: 'Empresa supervisora', detail: 'Supervisión y consultoría ambiental', icon: 'pi pi-eye' },
] : [
  { value: 'Construction', label: 'Empresa constructora', detail: 'Proyectos de construcción vial', icon: 'pi pi-building' },
  { value: 'EnvironmentalConsulting', label: 'Consultora ambiental', detail: 'Supervisión y consultoría ambiental', icon: 'pi pi-eye' },
])

export const PLANS = Object.freeze([
  { id: 'base', label: 'Base', description: 'Para comenzar a gestionar proyectos' },
  { id: 'professional', label: 'Profesional', description: 'Para operaciones y monitoreo ambiental' },
  { id: 'enterprise', label: 'Enterprise', description: 'Para operaciones de mayor escala' },
])

export const SUBSCRIPTION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
})

export function validateCompanyRegistration(input) {
  const errors = {}
  if (!input.companyName?.trim()) errors.companyName = 'Ingresa la razón social.'
  if (useFakeApi && !/^\d{11}$/.test(input.ruc || '')) errors.ruc = 'El RUC debe tener 11 dígitos.'
  if (!useFakeApi && input.companyCode?.trim().length !== 3) errors.companyCode = 'El código debe tener 3 caracteres.'
  if (!(useFakeApi ? ['construction', 'maintenance', 'supervision'] : ['Construction', 'EnvironmentalConsulting']).includes(input.companyType)) errors.companyType = 'Selecciona el tipo de empresa.'
  if (!input.adminName?.trim()) errors.adminName = 'Ingresa el nombre del administrador.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.adminEmail || '')) errors.adminEmail = 'Ingresa un correo válido.'
  if (!PLANS.some((plan) => plan.id === input.planId)) errors.planId = 'Selecciona un plan.'
  if (!input.acceptedTerms) errors.acceptedTerms = 'Debes aceptar los términos.'
  return errors
}

export function canAccessOperationalModules(subscription) {
  return subscription?.status === SUBSCRIPTION_STATUS.ACTIVE &&
    (!subscription.expiresAt || new Date(subscription.expiresAt).getTime() > Date.now())
}

