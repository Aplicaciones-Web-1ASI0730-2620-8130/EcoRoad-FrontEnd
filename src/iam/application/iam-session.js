import { shallowRef } from 'vue'
import { createIamApiRepository } from '../infrastructure/iam-api-repository.js'

const STORAGE_KEY = 'ecoroad.iam.demo-session'
const token = shallowRef(globalThis.sessionStorage?.getItem(STORAGE_KEY) || null)
export const currentUser = shallowRef(null)
const api = createIamApiRepository({
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
  globalThis.sessionStorage?.setItem(STORAGE_KEY, result.token)
  return result.user
}

export async function signOut() {
  try { if (token.value) await api.signOut() } catch { /* An expired demo session is already signed out. */ } finally { clearSession() }
}

export function hasSessionToken() { return Boolean(token.value) }
export function getSessionToken() { return token.value }
export function getIamApi() { return api }
