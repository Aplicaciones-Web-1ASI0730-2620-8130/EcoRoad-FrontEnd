export const ALERT_STATUSES = Object.freeze({
  active: { label: 'Activa' }, acknowledged: { label: 'Atendida' }, closed: { label: 'Cerrada' },
})
export const RISK_LEVELS = Object.freeze({
  critical: { label: 'Crítica', rank: 2, severity: 'danger' },
  observation: { label: 'En observación', rank: 1, severity: 'warn' },
})

// Monitoring supplies measurements; Alerting owns the risk decision.
export function evaluateRisk(value, profile) {
  if (!Number.isFinite(value) || !profile) return null
  if (profile.kind === 'maximum') {
    if (!Number.isFinite(profile.criticalAt) || !Number.isFinite(profile.observationAt) || profile.observationAt >= profile.criticalAt) return null
    if (value >= profile.criticalAt) return 'critical'
    if (value >= profile.observationAt) return 'observation'
    return null
  }
  if (profile.kind === 'range') {
    const limits = [profile.minimum, profile.optimalMinimum, profile.optimalMaximum, profile.maximum]
    if (limits.some((limit) => !Number.isFinite(limit)) || !(limits[0] < limits[1] && limits[1] < limits[2] && limits[2] < limits[3])) return null
    if (value < profile.minimum || value > profile.maximum) return 'critical'
    if (value < profile.optimalMinimum || value > profile.optimalMaximum) return 'observation'
    return null
  }
  return null
}

export function createAlertFromReading({ reading, profile, project, section, recommendation = '' }) {
  const risk = evaluateRisk(reading.value, profile)
  if (!risk) return null
  return {
    id: `ALR-${reading.id}`, readingId: reading.id,
    projectId: reading.projectId, projectName: project?.name || 'Proyecto sin nombre',
    sectionId: reading.sectionId, sectionName: section?.name || 'Tramo sin nombre',
    indicatorId: reading.parameterId, indicator: reading.metric || reading.parameterId,
    value: reading.value, unit: reading.unit || '', thresholdLabel: profile.label,
    risk, status: 'active', detectedAt: reading.recordedAt,
    source: reading.source || 'telemetry', recommendation,
  }
}

export function summarizeAlerts(alerts) {
  return alerts.reduce((summary, alert) => {
    summary.total += 1
    summary.byStatus[alert.status] = (summary.byStatus[alert.status] || 0) + 1
    summary.byRisk[alert.risk] = (summary.byRisk[alert.risk] || 0) + 1
    return summary
  }, { total: 0, byStatus: {}, byRisk: {} })
}

export function filterAlerts(alerts, { projectId = 'all', risk = 'all', status = 'all', search = '' } = {}) {
  const term = search.trim().toLocaleLowerCase('es')
  return alerts.filter((alert) => {
    const text = `${alert.id} ${alert.projectName} ${alert.sectionName} ${alert.indicator}`.toLocaleLowerCase('es')
    return (projectId === 'all' || alert.projectId === projectId) &&
      (risk === 'all' || alert.risk === risk) &&
      (status === 'all' || alert.status === status) && (!term || text.includes(term))
  }).sort((a, b) => RISK_LEVELS[b.risk].rank - RISK_LEVELS[a.risk].rank || b.detectedAt.localeCompare(a.detectedAt))
}

export function acknowledgeAlert(alert, acknowledgedBy, acknowledgedAt = new Date().toISOString()) {
  if (!alert || alert.status !== 'active' || !acknowledgedBy?.trim()) return null
  return { ...alert, status: 'acknowledged', acknowledgedBy: acknowledgedBy.trim(), acknowledgedAt }
}
