export function createDemoAssetData(now = new Date()) {
  const validUntil = new Date(now.getTime() + 180 * 24 * 60 * 60_000).toISOString()
  const recent = new Date(now.getTime() - 4 * 60_000).toISOString()
  const points = [
    { id: 'pt-lim-01', projectId: 'prj-lima-canta', sectionId: 'lim-01', name: 'Estación Trapiche', pk: '05+000', latitude: -11.7182, longitude: -76.8503 },
    { id: 'pt-lim-02', projectId: 'prj-lima-canta', sectionId: 'lim-02', name: 'Frente Yangas', pk: '45+100', latitude: -11.6628, longitude: -76.6468 },
    { id: 'pt-lim-03', projectId: 'prj-lima-canta', sectionId: 'lim-03', name: 'Estación Huamantanga', pk: '74+200', latitude: -11.5481, longitude: -76.5112 },
    { id: 'pt-aqp-01', projectId: 'prj-arequipa-norte', sectionId: 'aqp-01', name: 'Acceso Norte', pk: '18+300', latitude: -16.2851, longitude: -71.5237 },
  ]
  const sensors = [
    { id: 'sen-001', code: 'SEN-001', name: 'Estación óptica PM10', serialNumber: 'ECO-PM10-001', type: 'pm10', pointId: 'pt-lim-01', projectId: 'prj-lima-canta', sectionId: 'lim-01', status: 'active', calibration: { calibratedAt: now.toISOString(), validUntil }, activatedAt: now.toISOString(), lastSeenAt: recent },
    { id: 'sen-002', code: 'SEN-002', name: 'Sonómetro LAeq', serialNumber: 'ECO-NOISE-002', type: 'noise', pointId: 'pt-lim-02', projectId: 'prj-lima-canta', sectionId: 'lim-02', status: 'active', calibration: { calibratedAt: now.toISOString(), validUntil }, activatedAt: now.toISOString(), lastSeenAt: recent },
    { id: 'sen-003', code: 'SEN-003', name: 'Muestreador de agua', serialNumber: 'ECO-WATER-003', type: 'water', pointId: 'pt-aqp-01', projectId: 'prj-arequipa-norte', sectionId: 'aqp-01', status: 'active', calibration: { calibratedAt: now.toISOString(), validUntil }, activatedAt: now.toISOString(), lastSeenAt: recent },
    { id: 'sen-004', code: 'SEN-004', name: 'Acelerómetro de campo', serialNumber: 'ECO-VIB-004', type: 'vibration', pointId: 'pt-lim-03', projectId: 'prj-lima-canta', sectionId: 'lim-03', status: 'assigned', calibration: null, activatedAt: null, lastSeenAt: null },
    { id: 'sen-005', code: 'SEN-005', name: 'Sensor PM10 de reserva', serialNumber: 'ECO-PM10-005', type: 'pm10', pointId: null, projectId: null, sectionId: null, status: 'available', calibration: null, activatedAt: null, lastSeenAt: null },
  ]
  return { points, sensors }
}
