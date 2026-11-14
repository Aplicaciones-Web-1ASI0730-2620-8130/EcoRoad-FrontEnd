import { createProjectBackendRepository } from '../../projects/infrastructure/project-backend-repository.js'

export const PARAMETER_TYPES = Object.freeze({ pm10: 'AirQuality', noise: 'NoiseLevel', ph: 'WaterQuality', vibration: 'Vibration' })
const SENSOR_PARAMETERS = Object.freeze({ Pm10: 'pm10', Noise: 'noise', Water: 'ph', Vibration: 'vibration' })

export function createMonitoringOperationsBackendRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projects = createProjectBackendRepository({ baseUrl, fetchImpl, getCompanyId })
  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La operación de monitoreo falló (HTTP ${response.status}).`)
    return payload
  }
  return {
    listProjects: projects.listProjects,
    listProfiles: () => request('monitoring/threshold-profiles'),
    configureProfile: (name, parameterId, limits) => request('monitoring/threshold-profiles', {
      method: 'POST', body: { name: name.trim(), parameterType: PARAMETER_TYPES[parameterId], limits },
    }),
    updateProfile: (id, limits) => request(`monitoring/threshold-profiles/${encodeURIComponent(id)}/thresholds`, {
      method: 'PUT', body: limits,
    }),
    listSensors: async (projectId) => (await request(`assets/sensors?projectId=${encodeURIComponent(projectId)}`))
      .map((sensor) => ({ ...sensor, parameterId: SENSOR_PARAMETERS[sensor.type] })),
    recordManual: ({ projectId, sectionId, operatorId, parameterId, value, notes }) => request('monitoring/measurements/manual', {
      method: 'POST', body: { projectId, sectionId, operatorId, parameterType: PARAMETER_TYPES[parameterId], value: Number(value), recordedAt: null, notes: notes?.trim() || null },
    }),
    recordTelemetry: ({ sensor, value }) => request('monitoring/measurements/telemetry', {
      method: 'POST', body: { projectId: sensor.projectId, sectionId: sensor.sectionId, monitoringPointId: sensor.monitoringPointId,
        sensorId: sensor.id, parameterType: PARAMETER_TYPES[SENSOR_PARAMETERS[sensor.type]], value: Number(value), recordedAt: null },
    }),
    registerAlertRule: ({ parameter, unit, timeBand, limit, criticalExcess }) => request('alert-rules', {
      method: 'POST', body: { parameter: parameter.trim(), unit: unit.trim(), timeBand, limit: Number(limit), criticalExcess: Number(criticalExcess) },
    }),
    evaluateAlert: ({ workFrontId, parameter, timeBand, measuredValue }) => request('alerts/evaluations', {
      method: 'POST', body: { workFrontId, parameter: parameter.trim(), timeBand, measuredValue: Number(measuredValue) },
    }),
  }
}
