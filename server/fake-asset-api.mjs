import { randomUUID } from 'node:crypto'
import { canAccessOperationalModules } from '../src/commercial/domain/commercial-model.js'
import { AssetPolicyError, activateSensor, assignSensor, calibrateSensor, canReport, deactivateSensor, releaseSensor, summarizeAssets, validateMonitoringPoint, validateSensorAsset } from '../src/assets/domain/monitoring-asset.js'
import { createDemoAssetData } from '../src/assets/infrastructure/asset-fixtures.js'
import { readJson, sendJson } from './http-json.mjs'

export function createFakeAssetRoutes({ subscriptions, projects, includeExample = true }) {
  const pointsByCompany = new Map()
  const sensorsByCompany = new Map()
  if (includeExample) {
    const demo = createDemoAssetData()
    pointsByCompany.set('demo-company', new Map(demo.points.map((point) => [point.id, point])))
    sensorsByCompany.set('demo-company', new Map(demo.sensors.map((sensor) => [sensor.id, sensor])))
  }
  let nextCode = 6

  return async (request, response, path) => {
    const companyId = request.headers['x-demo-company-id']
    if (!companyId || Array.isArray(companyId)) return sendJson(response, 400, { code: 'COMPANY_REQUIRED', message: 'Selecciona una empresa.' })
    if (!canAccessOperationalModules(subscriptions.get(companyId))) return sendJson(response, 403, { code: 'SUBSCRIPTION_REQUIRED', message: 'La empresa necesita una suscripción activa para administrar sensores.' })
    const companyPoints = pointsByCompany.get(companyId) || new Map()
    const companySensors = sensorsByCompany.get(companyId) || new Map()
    pointsByCompany.set(companyId, companyPoints)
    sensorsByCompany.set(companyId, companySensors)

    if (path === '/api/assets/projects' && request.method === 'GET') return sendJson(response, 200, projects.listProjects(companyId))
    if (path === '/api/assets/summary' && request.method === 'GET') return sendJson(response, 200, summarizeAssets([...companySensors.values()]))

    if (path === '/api/assets/points') {
      if (request.method === 'GET') {
        const projectId = new URL(request.url, 'http://localhost').searchParams.get('projectId')
        return sendJson(response, 200, [...companyPoints.values()].filter((point) => !projectId || point.projectId === projectId))
      }
      if (request.method === 'POST') {
        const input = await readJson(request)
        const project = projects.getProject(companyId, input?.projectId)
        const errors = validateMonitoringPoint(input, project)
        if (Object.keys(errors).length) return sendJson(response, 422, { code: 'INVALID_POINT', message: 'Revisa el punto de monitoreo.', errors })
        const point = { id: randomUUID(), projectId: project.id, sectionId: input.sectionId, name: input.name.trim(), pk: input.pk.trim(), latitude: Number(input.latitude), longitude: Number(input.longitude) }
        companyPoints.set(point.id, point)
        return sendJson(response, 201, point)
      }
      return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    }

    const pointMatch = /^\/api\/assets\/points\/([^/]+)$/.exec(path)
    if (pointMatch) {
      const id = decodeURIComponent(pointMatch[1])
      const point = companyPoints.get(id)
      if (!point) return sendJson(response, 404, { code: 'POINT_NOT_FOUND', message: 'Punto de monitoreo no encontrado.' })
      if (request.method === 'GET') return sendJson(response, 200, point)
      if (request.method === 'PUT') {
        if ([...companySensors.values()].some((sensor) => sensor.pointId === id)) return sendJson(response, 409, { code: 'POINT_IN_USE', message: 'Libera los sensores antes de mover este punto.' })
        const input = await readJson(request)
        const project = projects.getProject(companyId, input?.projectId)
        const errors = validateMonitoringPoint(input, project)
        if (Object.keys(errors).length) return sendJson(response, 422, { code: 'INVALID_POINT', message: 'Revisa el punto de monitoreo.', errors })
        const updated = { id, projectId: project.id, sectionId: input.sectionId, name: input.name.trim(), pk: input.pk.trim(), latitude: Number(input.latitude), longitude: Number(input.longitude) }
        companyPoints.set(id, updated)
        return sendJson(response, 200, updated)
      }
      if (request.method === 'DELETE') {
        if ([...companySensors.values()].some((sensor) => sensor.pointId === id)) return sendJson(response, 409, { code: 'POINT_IN_USE', message: 'Libera los sensores antes de eliminar este punto.' })
        companyPoints.delete(id)
        return sendJson(response, 200, { deleted: true })
      }
      return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    }

    if (path === '/api/assets/sensors') {
      if (request.method === 'GET') {
        const query = new URL(request.url, 'http://localhost').searchParams
        const projectId = query.get('projectId')
        const status = query.get('status')
        const search = query.get('search')?.trim().toLocaleLowerCase('es')
        return sendJson(response, 200, [...companySensors.values()].filter((sensor) =>
          (!projectId || sensor.projectId === projectId) && (!status || sensor.status === status) &&
          (!search || `${sensor.code} ${sensor.name} ${sensor.serialNumber}`.toLocaleLowerCase('es').includes(search))))
      }
      if (request.method === 'POST') {
        const input = await readJson(request)
        const errors = validateSensorAsset(input)
        if (Object.keys(errors).length) return sendJson(response, 422, { code: 'INVALID_SENSOR', message: 'Revisa los datos del sensor.', errors })
        const serialNumber = input.serialNumber.trim().toUpperCase()
        if ([...sensorsByCompany.values()].some((items) => [...items.values()].some((sensor) => sensor.serialNumber === serialNumber))) {
          return sendJson(response, 409, { code: 'DUPLICATE_SERIAL', message: 'Ya existe un sensor con ese número de serie.' })
        }
        const sensor = { id: randomUUID(), code: `SEN-${String(nextCode++).padStart(3, '0')}`, name: input.name.trim(), serialNumber, type: input.type, pointId: null, projectId: null, sectionId: null, status: 'available', calibration: null, activatedAt: null, lastSeenAt: null }
        companySensors.set(sensor.id, sensor)
        return sendJson(response, 201, sensor)
      }
      return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })
    }

    const sensorMatch = /^\/api\/assets\/sensors\/([^/]+)(?:\/(assignment|calibration|activation|deactivation|release))?$/.exec(path)
    if (!sensorMatch) return sendJson(response, 404, { code: 'NOT_FOUND', message: 'Ruta de activos no encontrada.' })
    const id = decodeURIComponent(sensorMatch[1])
    const sensor = companySensors.get(id)
    if (!sensor) return sendJson(response, 404, { code: 'SENSOR_NOT_FOUND', message: 'Sensor no encontrado.' })
    if (!sensorMatch[2] && request.method === 'GET') return sendJson(response, 200, { ...sensor, canReport: canReport(sensor) })
    if (request.method !== 'POST') return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', message: 'Operación no permitida.' })

    let updated
    try {
      switch (sensorMatch[2]) {
        case 'assignment': {
          const input = await readJson(request)
          const point = companyPoints.get(input?.pointId)
          if (!point) return sendJson(response, 404, { code: 'POINT_NOT_FOUND', message: 'Punto de monitoreo no encontrado.' })
          if ([...companySensors.values()].some((other) => other.id !== id && other.pointId === point.id && other.type === sensor.type)) {
            return sendJson(response, 409, { code: 'POINT_TYPE_OCCUPIED', message: 'Este punto ya tiene un sensor del mismo tipo.' })
          }
          updated = assignSensor(sensor, point)
          break
        }
        case 'calibration': {
          const input = await readJson(request)
          updated = calibrateSensor(sensor, input?.validUntil)
          break
        }
        case 'activation': updated = activateSensor(sensor); break
        case 'deactivation': updated = deactivateSensor(sensor); break
        case 'release': updated = releaseSensor(sensor); break
        default: return sendJson(response, 404, { code: 'NOT_FOUND', message: 'Operación de sensor no encontrada.' })
      }
    } catch (error) {
      if (!(error instanceof AssetPolicyError)) throw error
      return sendJson(response, error.code === 'INVALID_CALIBRATION' ? 422 : 409, { code: error.code, message: error.message })
    }
    companySensors.set(id, updated)
    return sendJson(response, 200, { ...updated, canReport: canReport(updated) })
  }
}
