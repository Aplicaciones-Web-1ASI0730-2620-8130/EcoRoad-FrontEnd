const pathFor = (id, suffix = '') => `company-accounts/${encodeURIComponent(id)}${suffix}`

function accountFromBackend(account) {
  return {
    ...account,
    companyCode: account.code,
    companyType: account.segment,
    registeredAt: account.createdAt,
  }
}

function subscriptionFromBackend(subscription) {
  return {
    ...subscription,
    planId: subscription.plan?.toLowerCase() || null,
    status: subscription.status?.toLowerCase() === 'selected' ? 'pending' : subscription.status?.toLowerCase() || 'missing',
    expiresAt: subscription.currentPeriodEnd || null,
  }
}

export function createCommercialBackendRepository({ baseUrl, fetchImpl = globalThis.fetch }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const error = new Error(payload?.message || `La operación comercial falló (HTTP ${response.status}).`)
      error.status = response.status
      throw error
    }
    return payload
  }
  return {
    registerCompany: async (input) => accountFromBackend(await request('company-accounts', {
      method: 'POST',
      body: { name: input.companyName.trim(), code: input.companyCode.trim(), segment: input.companyType },
    })),
    getAccount: async (id) => accountFromBackend(await request(pathFor(id))),
    getSubscription: async (id) => subscriptionFromBackend(await request(pathFor(id, '/subscription'))),
    selectPlan: async (id, planId) => subscriptionFromBackend(await request(pathFor(id, '/subscription'), {
      method: 'POST', body: { plan: planId, billingCycle: 'Monthly' },
    })),
    requestActivation: async (id) => ({ subscription: subscriptionFromBackend(await request(pathFor(id, '/subscription/activation'), { method: 'POST' })) }),
    requestRenewal: async (id) => ({ subscription: subscriptionFromBackend(await request(pathFor(id, '/subscription/renewal'), { method: 'POST' })) }),
  }
}
