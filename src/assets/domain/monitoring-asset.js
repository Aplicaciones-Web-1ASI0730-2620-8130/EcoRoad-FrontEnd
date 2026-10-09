import { parseKilometerPost } from '../../projects/domain/road-section.js'

export const SENSOR_TYPES = Object.freeze({
  pm10: { label: 'Material particulado PM10', unit: 'µg/m³', icon: 'pi pi-cloud' },
  noise: { label: 'Ruido ambiental LAeq', unit: 'dBA', icon: 'pi pi-volume-up' },
  water: { label: 'Calidad del agua', unit: 'pH', icon: 'pi pi-filter' },
  vibration: { label: 'Vibración', unit: 'mm/s', icon: 'pi pi-chart-line' },
})

export const ASSET_STATUSES = Object.freeze({
  available: { label: 'Disponible', severity: 'secondary' },
  assigned: { label: 'Asignado', severity: 'warn' },
  active: { label: 'Activo', severity: 'success' },
})

export class AssetPolicyError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'AssetPolicyError'
    this.code = code
  }
}

export function validateMonitoringPoint(input, project) {
  const errors = {}
  if (!project) { errors.projectId = 'Selecciona un proyecto disponible.'; return errors }
  const section = project.sections?.find((item) => item.id === input?.sectionId)
  if (!section) errors.sectionId = 'Selecciona un tramo del proyecto.'
  if (!input?.name?.trim()) errors.name = 'Ingresa el nombre del punto.'
  const pk = parseKilometerPost(input?.pk)
  if (pk === null) errors.pk = 'Usa el formato PK 00+000.'
  else if (section && (pk < parseKilometerPost(section.startPk) || pk > parseKilometerPost(section.endPk))) errors.pk = 'El PK debe estar dentro del tramo.'
  const latitude = Number(input?.latitude)
  const longitude = Number(input?.longitude)
  if (input?.latitude === '' || input?.latitude == null || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.latitude = 'Ingresa una latitud entre -90 y 90.'
  if (input?.longitude === '' || input?.longitude == null || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.longitude = 'Ingresa una longitud entre -180 y 180.'
  return errors
}

export function validateSensorAsset(input) {
  const errors = {}
  if (!input?.name?.trim()) errors.name = 'Ingresa el nombre del equipo.'
  if (!/^[A-Z0-9-]{3,40}$/i.test(input?.serialNumber?.trim() || '')) errors.serialNumber = 'Usa de 3 a 40 letras, números o guiones.'
  if (!Object.hasOwn(SENSOR_TYPES, input?.type)) errors.type = 'Selecciona un tipo de sensor.'
  return errors
}

export function assignSensor(sensor, point) {
  if (sensor.status === 'active') throw new AssetPolicyError('ACTIVE_SENSOR', 'Desactiva el sensor antes de reasignarlo.')
  if (!point) throw new AssetPolicyError('POINT_REQUIRED', 'Selecciona un punto de monitoreo.')
  return { ...sensor, pointId: point.id, projectId: point.projectId, sectionId: point.sectionId, status: 'assigned', calibration: null, activatedAt: null }
}

export function calibrateSensor(sensor, validUntil, now = new Date()) {
  if (sensor.status !== 'assigned' || !sensor.pointId) throw new AssetPolicyError('ASSIGNMENT_REQUIRED', 'Asigna el sensor a un punto antes de calibrarlo.')
  const expiry = new Date(validUntil)
  if (!Number.isFinite(expiry.getTime()) || expiry <= now) throw new AssetPolicyError('INVALID_CALIBRATION', 'La vigencia de calibración debe ser posterior a la fecha actual.')
  return { ...sensor, calibration: { calibratedAt: now.toISOString(), validUntil: expiry.toISOString() } }
}

export function isCalibrationValid(sensor, now = new Date()) {
  return Boolean(sensor.calibration?.validUntil && new Date(sensor.calibration.validUntil) > now)
}

export function activateSensor(sensor, now = new Date()) {
  if (sensor.status !== 'assigned' || !sensor.pointId) throw new AssetPolicyError('ASSIGNMENT_REQUIRED', 'Asigna el sensor a un punto antes de activarlo.')
  if (!isCalibrationValid(sensor, now)) throw new AssetPolicyError('CALIBRATION_REQUIRED', 'Calibra el sensor con vigencia activa antes de activarlo.')
  return { ...sensor, status: 'active', activatedAt: now.toISOString() }
}

export function deactivateSensor(sensor) {
  if (sensor.status !== 'active') throw new AssetPolicyError('SENSOR_NOT_ACTIVE', 'Solo puedes desactivar sensores activos.')
  return { ...sensor, status: 'assigned', activatedAt: null }
}

export function releaseSensor(sensor) {
  if (sensor.status === 'active') throw new AssetPolicyError('ACTIVE_SENSOR', 'Desactiva el sensor antes de liberarlo.')
  if (!sensor.pointId) throw new AssetPolicyError('SENSOR_NOT_ASSIGNED', 'El sensor no está asignado.')
  return { ...sensor, pointId: null, projectId: null, sectionId: null, status: 'available', calibration: null, activatedAt: null }
}

export function canReport(sensor, now = new Date()) {
  return sensor.status === 'active' && Boolean(sensor.pointId && sensor.projectId && isCalibrationValid(sensor, now))
}

export function summarizeAssets(sensors, now = new Date()) {
  return {
    total: sensors.length,
    active: sensors.filter((sensor) => canReport(sensor, now)).length,
    assigned: sensors.filter((sensor) => sensor.status === 'assigned').length,
    available: sensors.filter((sensor) => sensor.status === 'available').length,
    calibrationDue: sensors.filter((sensor) => sensor.pointId && !isCalibrationValid(sensor, now)).length,
  }
}
