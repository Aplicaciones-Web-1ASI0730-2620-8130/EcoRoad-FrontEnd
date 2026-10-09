export const ENVIRONMENTAL_PARAMETERS = Object.freeze({
  pm10: { label: 'Calidad del aire', metric: 'PM10', unit: 'µg/m³', icon: 'pi pi-arrow-right' },
  noise: { label: 'Ruido ambiental', metric: 'LAeq', unit: 'dBA', icon: 'pi pi-volume-up' },
  ph: { label: 'Calidad del agua', metric: 'pH', unit: 'pH', icon: 'pi pi-filter' },
  vibration: { label: 'Vibración', metric: 'Velocidad pico', unit: 'mm/s', icon: 'pi pi-chart-line' },
})

export const MONITORING_STATUSES = Object.freeze({
  optimal: { label: 'Óptimo', severity: 'success', rank: 0 },
  observation: { label: 'En observación', severity: 'warn', rank: 1 },
  critical: { label: 'Crítico', severity: 'danger', rank: 2 },
})

export function classifyReading(value, profile) {
  if (!Number.isFinite(value) || !profile) return null
  if (profile.kind === 'maximum') {
    if (value >= profile.criticalAt) return 'critical'
    if (value >= profile.observationAt) return 'observation'
    return 'optimal'
  }
  if (profile.kind === 'range') {
    if (value < profile.minimum || value > profile.maximum) return 'critical'
    if (value < profile.optimalMinimum || value > profile.optimalMaximum) return 'observation'
    return 'optimal'
  }
  return null
}

export function latestReadings(readings) {
  const latest = new Map()
  for (const reading of readings) {
    const key = `${reading.sectionId}:${reading.parameterId}`
    if (!latest.has(key) || reading.recordedAt > latest.get(key).recordedAt) latest.set(key, reading)
  }
  return [...latest.values()]
}

export function worstStatus(statuses) {
  return statuses.filter((status) => MONITORING_STATUSES[status]).reduce((worst, status) =>
    MONITORING_STATUSES[status].rank > MONITORING_STATUSES[worst].rank ? status : worst, 'optimal')
}

export function summarizeMonitoring(project, readings, profiles) {
  const current = latestReadings(readings)
  const sectionIds = new Set(project.sections.map((section) => section.id))
  const evaluated = current.filter((reading) => sectionIds.has(reading.sectionId) && classifyReading(reading.value, profiles[reading.parameterId])).map((reading) => ({
    ...reading,
    status: classifyReading(reading.value, profiles[reading.parameterId]),
  }))
  const sections = project.sections.map((section) => {
    const sectionReadings = evaluated.filter((reading) => reading.sectionId === section.id)
    return { ...section, readings: sectionReadings, status: sectionReadings.length ? worstStatus(sectionReadings.map((reading) => reading.status)) : null }
  })
  const parameters = Object.keys(ENVIRONMENTAL_PARAMETERS).map((id) => {
    const parameterReadings = evaluated.filter((reading) => reading.parameterId === id)
    const worst = [...parameterReadings].sort((a, b) => MONITORING_STATUSES[b.status].rank - MONITORING_STATUSES[a.status].rank)[0]
    return { id, ...ENVIRONMENTAL_PARAMETERS[id], reading: worst || null }
  })
  const statuses = evaluated.map((reading) => reading.status)
  return { sections, parameters, status: statuses.length ? worstStatus(statuses) : null, latestAt: evaluated.reduce((latest, reading) => reading.recordedAt > latest ? reading.recordedAt : latest, '') }
}
