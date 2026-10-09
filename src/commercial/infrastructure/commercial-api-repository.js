/**
 * HTTP boundary for Commercial and Subscription Management.
 *
 * The route names below are proposals until the backend contract is agreed.
 * Keep them here so no presentation component depends on API paths.
 */
export class CommercialApiError extends Error {
  constructor(message, status, code = null) {
    super(message)
    this.name = 'CommercialApiError'
    this.status = status
    this.code = code
  }
}

const defaultEndpoints = {
  accounts: '/company-accounts',
  account: (companyId) => `/company-accounts/${encodeURIComponent(companyId)}`,
  subscription: (companyId) => `/company-accounts/${encodeURIComponent(companyId)}/subscription`,
  plan: (companyId) => `/company-accounts/${encodeURIComponent(companyId)}/subscription/plan`,
  activationRequest: (companyId) => `/company-accounts/${encodeURIComponent(companyId)}/subscription/activation-requests`,
  renewalRequest: (companyId) => `/company-accounts/${encodeURIComponent(companyId)}/subscription/renewal-requests`,
}

export function createCommercialApiRepository({
  baseUrl,
  fetchImpl = globalThis.fetch,
  endpoints = defaultEndpoints,
  getAccessToken = () => null,
}) {
  if (!baseUrl) throw new Error('Commercial API baseUrl is required.')
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.')

  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  async function request(path, { method = 'GET', body, signal } = {}) {
    const token = getAccessToken()
    const headers = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetchImpl(new URL(path.replace(/^\//, ''), root), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = response.status === 204
      ? null
      : contentType.includes('application/json')
        ? await response.json()
        : null

    if (!response.ok) {
      throw new CommercialApiError(
        payload?.message || `La operación comercial falló (HTTP ${response.status}).`,
        response.status,
        payload?.code || null,
      )
    }
    return payload
  }

  return {
    registerCompany(input, options = {}) {
      return request(endpoints.accounts, {
        method: 'POST',
        body: {
          name: input.companyName.trim(),
          ruc: input.ruc,
          type: input.companyType,
          administrator: {
            name: input.adminName.trim(),
            email: input.adminEmail.trim().toLowerCase(),
            professionalLicense: input.professionalLicense?.trim() || null,
          },
          acceptedTerms: input.acceptedTerms,
        },
        ...options,
      })
    },
    getAccount(companyId, options = {}) {
      return request(endpoints.account(companyId), options)
    },
    getSubscription(companyId, options = {}) {
      return request(endpoints.subscription(companyId), options)
    },
    selectPlan(companyId, planId, options = {}) {
      return request(endpoints.plan(companyId), {
        method: 'PUT',
        body: { planId },
        ...options,
      })
    },
    requestActivation(companyId, options = {}) {
      return request(endpoints.activationRequest(companyId), {
        method: 'POST',
        ...options,
      })
    },
    requestRenewal(companyId, options = {}) {
      return request(endpoints.renewalRequest(companyId), {
        method: 'POST',
        ...options,
      })
    },
  }
}

