import { createAlertFromReading } from '../domain/alert.js'

export const DEMO_ALERT_PROJECTS = Object.freeze([
  { id: 'prj-arequipa-norte', name: 'Carretera Arequipa - Norte' },
  { id: 'prj-lima-canta', name: 'Carretera Lima - Canta' },
  { id: 'prj-cusco-anta', name: 'Vía Cusco - Anta' },
])

// Illustrative policies only. Real thresholds require an approved profile.
export const DEMO_RISK_PROFILES = Object.freeze({
  pm25: { kind: 'maximum', observationAt: 35, criticalAt: 50, label: '50 µg/m³ (ejemplo)' },
  noise: { kind: 'maximum', observationAt: 70, criticalAt: 80, label: '80 dBA (ejemplo)' },
  ph: { kind: 'range', minimum: 6.5, optimalMinimum: 6.8, optimalMaximum: 8.2, maximum: 8.5, label: 'pH 6.5–8.5 (ejemplo)' },
})

const examples = [
  { id: '024', project: DEMO_ALERT_PROJECTS[0], sectionId: 'aqp-02', section: 'Sección 03 · PK 48+200', parameterId: 'pm25', metric: 'PM2.5', value: 92, unit: 'µg/m³', minutesAgo: 8, source: 'telemetry', recommendation: 'Inspeccionar el frente y coordinar medidas de mitigación de polvo.' },
  { id: '021', project: DEMO_ALERT_PROJECTS[1], sectionId: 'lim-02', section: 'Sección 02 · PK 34+500', parameterId: 'noise', metric: 'Ruido LAeq', value: 78, unit: 'dBA', minutesAgo: 80, source: 'telemetry', recommendation: 'Revisar las medidas de control acústico en el frente de trabajo.' },
  { id: '019', project: DEMO_ALERT_PROJECTS[2], sectionId: 'cus-01', section: 'Sección 01 · PK 18+400', parameterId: 'ph', metric: 'Calidad del agua', value: 8.3, unit: 'pH', minutesAgo: 240, source: 'manual', recommendation: 'Inspeccionar el punto de muestreo y repetir la medición.' },
]

export function createDemoAlerts(now = new Date()) {
  return examples.map((item) => createAlertFromReading({
    reading: { id: item.id, projectId: item.project.id, sectionId: item.sectionId, parameterId: item.parameterId, metric: item.metric, value: item.value, unit: item.unit, recordedAt: new Date(now.getTime() - item.minutesAgo * 60_000).toISOString(), source: item.source },
    profile: DEMO_RISK_PROFILES[item.parameterId], project: item.project,
    section: { name: item.section }, recommendation: item.recommendation,
  }))
}
