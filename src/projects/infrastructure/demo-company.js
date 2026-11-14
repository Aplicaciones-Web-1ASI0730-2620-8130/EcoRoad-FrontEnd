import { useFakeApi } from '../../shared/infrastructure/api-mode.js'

export const SELECTED_COMPANY_KEY = 'ecoroad.commercial.selected-company'

// Without IAM, the seeded active company is the default demo workspace.
export function getDemoCompanyId() {
  return globalThis.localStorage?.getItem(SELECTED_COMPANY_KEY) || (useFakeApi ? 'demo-company' : null)
}
