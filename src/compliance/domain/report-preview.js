export const REPORT_SECTIONS = Object.freeze({
  indicators: 'Indicadores ambientales',
  alerts: 'Alertas y desviaciones',
  incidents: 'Incidentes y medidas correctivas',
  evidence: 'Evidencias de campo',
})

function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateReportCriteria(criteria, projects, today = new Date().toISOString().slice(0, 10)) {
  const errors = {}
  if (!projects.some((project) => project.id === criteria.projectId)) errors.projectId = 'Selecciona un proyecto disponible.'
  if (!isoDate(criteria.from)) errors.from = 'Indica una fecha de inicio válida.'
  if (!isoDate(criteria.to)) errors.to = 'Indica una fecha de fin válida.'
  if (isoDate(criteria.from) && isoDate(criteria.to) && criteria.from > criteria.to) errors.to = 'La fecha de fin debe ser posterior al inicio.'
  if (isoDate(criteria.to) && criteria.to > today) errors.to = 'El periodo no puede terminar en el futuro.'
  if (!criteria.sections?.some((section) => section === 'indicators' || section === 'alerts')) errors.sections = 'Selecciona al menos un contenido disponible.'
  else if (criteria.sections.some((section) => !['indicators', 'alerts'].includes(section))) errors.sections = 'Hay fuentes pendientes de integración en la selección.'
  return errors
}

export function buildReportPreview(criteria, { projects, readings = [], alerts = [] }) {
  const errors = validateReportCriteria(criteria, projects)
  if (Object.keys(errors).length) return { errors }
  const project = projects.find((item) => item.id === criteria.projectId)
  const inPeriod = (date) => Boolean(date && date.slice(0, 10) >= criteria.from && date.slice(0, 10) <= criteria.to)
  const scopedReadings = readings.filter((item) => item.projectId === project.id && inPeriod(item.recordedAt))
  const scopedAlerts = alerts.filter((item) => item.projectId === project.id && inPeriod(item.detectedAt))
  const indicators = Object.values(scopedReadings.reduce((groups, item) => {
    const key = item.parameterId
    const group = groups[key] ||= { parameterId: key, count: 0, minimum: item.value, maximum: item.value }
    group.count++
    group.minimum = Math.min(group.minimum, item.value)
    group.maximum = Math.max(group.maximum, item.value)
    return groups
  }, {}))
  return {
    project: { id: project.id, name: project.name, code: project.code },
    period: { from: criteria.from, to: criteria.to },
    sections: [...criteria.sections],
    indicators,
    readingCount: scopedReadings.length,
    alertCount: scopedAlerts.length,
    criticalAlertCount: scopedAlerts.filter((item) => item.risk === 'critical').length,
    incidentCount: null,
    evidenceCount: null,
    sourceAvailability: { indicators: true, alerts: true, incidents: false, evidence: false },
  }
}
