import { shallowRef } from 'vue'
import { createIamApiRepository } from '../infrastructure/iam-api-repository.js'
import { createIamBackendRepository } from '../infrastructure/iam-backend-repository.js'
import { useFakeApi } from '../../shared/infrastructure/api-mode.js'
import { SELECTED_COMPANY_KEY } from '../../projects/infrastructure/demo-company.js'

const STORAGE_KEY = 'ecoroad.iam.session'
const token = shallowRef(globalThis.sessionStorage?.getItem(STORAGE_KEY) || null)
export const currentUser = shallowRef(null)
const api = (useFakeApi ? createIamApiRepository : createIamBackendRepository)({
  baseUrl: import.meta.env?.VITE_IAM_API_URL || new URL('/api/', globalThis.location?.origin || 'http://localhost').href,
  getToken: () => token.value,
})

export function clearSession() {
  token.value = null
  currentUser.value = null
  globalThis.sessionStorage?.removeItem(STORAGE_KEY)
}

export async function restoreSession() {
  if (!token.value) return null
  try {
    const { user } = await api.currentSession()
    currentUser.value = user
    if (!useFakeApi) globalThis.localStorage?.setItem(SELECTED_COMPANY_KEY, user.companyId)
    return user
  } catch {
    clearSession()
    return null
  }
}

export async function signIn(companyId, email, password) {
  const result = await api.signIn(companyId, email, password)
  token.value = result.token
  currentUser.value = result.user
  if (!useFakeApi) globalThis.localStorage?.setItem(SELECTED_COMPANY_KEY, result.user.companyId)
  globalThis.sessionStorage?.setItem(STORAGE_KEY, result.token)
  return result.user
}

export async function signOut() {
  try { if (token.value) await api.signOut() } catch { /* An expired demo session is already signed out. */ } finally { clearSession() }
}

export function hasSessionToken() { return Boolean(token.value) }
export function getSessionToken() { return token.value }
export function getIamApi() { return api }
