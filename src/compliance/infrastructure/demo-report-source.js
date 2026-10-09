import { PROJECT_FIXTURES } from '../../projects/infrastructure/project-fixtures.js'
import { DEMO_READINGS } from '../../monitoring/infrastructure/monitoring-fixtures.js'
import { createDemoAlerts } from '../../alerting/infrastructure/alert-fixtures.js'

// A local read model for the first UI delivery. HTTP consolidation follows in the next iteration.
export function getDemoReportSource() {
  return { projects: PROJECT_FIXTURES, readings: DEMO_READINGS, alerts: createDemoAlerts() }
}
