import { createProjectBackendRepository } from '../../projects/infrastructure/project-backend-repository.js'

const sensorTypes = { pm10: 'Pm10', noise: 'Noise', water: 'Water', vibration: 'Vibration' }
const frontendTypes = Object.fromEntries(Object.entries(sensorTypes).map(([key, value]) => [value, key]))
const sensorPath = (id) => `assets/sensors/${encodeURIComponent(id)}`
const pointPath = (id) => `assets/points/${encodeURIComponent(id)}`

function pointFromBackend(point) {
  return { ...point, pk: point.kilometerPost.replace(/^PK\s*/i, ''), status: point.status.toLowerCase() }
}

function sensorFromBackend(sensor) {
  return {
    ...sensor,
    type: frontendTypes[sensor.type], status: sensor.status.toLowerCase(),
    pointId: sensor.monitoringPointId,
    calibration: sensor.calibrationValidUntil
      ? { calibratedAt: sensor.calibratedAt, validUntil: sensor.calibrationValidUntil } : null,
  }
}

export function createAssetBackendRepository({ baseUrl, fetchImpl = globalThis.fetch, getCompanyId }) {
  const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const projects = createProjectBackendRepository({ baseUrl, fetchImpl, getCompanyId })
  async function request(path, method = 'GET', body) {
    const response = await fetchImpl(new URL(path, root), {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = response.status === 204 ? null : await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || `La operación de activos falló (HTTP ${response.status}).`)
    return payload
  }
  const pointBody = (input) => ({
    projectId: input.projectId, sectionId: input.sectionId, name: input.name,
    kilometerPost: input.pk, latitude: Number(input.latitude), longitude: Number(input.longitude),
  })
  return {
    listProjects: projects.listProjects,
    listPoints: async (projectId) => (await request(`assets/points${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`))
      .map(pointFromBackend),
    createPoint: async (input) => pointFromBackend(await request('assets/points', 'POST', pointBody(input))),
    updatePoint: async (id, input) => pointFromBackend(await request(pointPath(id), 'PUT', pointBody(input))),
    deletePoint: async (id) => { await request(pointPath(id), 'DELETE'); return true },
    listSensors: async (filters = {}) => {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== 'all'))
      return (await request(`assets/sensors${query.size ? `?${query}` : ''}`)).map(sensorFromBackend)
    },
    getSensor: async (id) => sensorFromBackend(await request(sensorPath(id))),
    registerSensor: async (input) => sensorFromBackend(await request('assets/sensors', 'POST', {
      name: input.name, serialNumber: input.serialNumber, type: sensorTypes[input.type], model: null,
    })),
    assignSensor: async (id, pointId) => sensorFromBackend(await request(`${sensorPath(id)}/assignment`, 'POST', { monitoringPointId: pointId })),
    calibrateSensor: async (id, validUntil) => sensorFromBackend(await request(`${sensorPath(id)}/calibration`, 'POST', { validUntil })),
    activateSensor: async (id) => sensorFromBackend(await request(`${sensorPath(id)}/activation`, 'POST')),
    deactivateSensor: async (id) => sensorFromBackend(await request(`${sensorPath(id)}/deactivation`, 'POST')),
    releaseSensor: async (id) => sensorFromBackend(await request(`${sensorPath(id)}/release`, 'POST')),
  }
}
