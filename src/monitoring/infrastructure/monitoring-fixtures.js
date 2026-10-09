// Demo read models only. The monitoring context references project and section IDs without owning them.
export const MONITORING_PROJECTS = [
  {
    id: 'prj-lima-canta', name: 'Carretera Lima - Canta', corridor: 'PK 00+000 a 112+000',
    sections: [
      { id: 'lim-01', name: 'Trapiche - Chorrillos', pk: '00+000 - 32+000', workFront: 'Movimiento de tierras' },
      { id: 'lim-02', name: 'Yangas - Santa Rosa', pk: '32+000 - 64+000', workFront: 'Planta de agregados' },
      { id: 'lim-03', name: 'Huamantanga - Yaso', pk: '64+000 - 92+000', workFront: 'Corte y nivelación' },
      { id: 'lim-04', name: 'Canta - Obrajillo', pk: '92+000 - 112+000', workFront: 'Estabilización de taludes' },
    ],
  },
  { id: 'prj-arequipa-norte', name: 'Carretera Arequipa - Norte', corridor: 'PK 00+000 a 78+200', sections: [
    { id: 'aqp-01', name: 'Acceso norte', pk: '00+000 - 42+200', workFront: 'Movimiento de tierras' },
    { id: 'aqp-02', name: 'Quebrada San José', pk: '42+200 - 78+200', workFront: 'Rehabilitación de calzada' },
  ] },
  { id: 'prj-cusco-anta', name: 'Vía Cusco - Anta', corridor: 'PK 12+400 a 45+800', sections: [
    { id: 'cus-01', name: 'Tramo Anta', pk: '12+400 - 45+800', workFront: 'Mantenimiento de drenajes' },
  ] },
]

// Example thresholds for UI simulation; they are not an official regulatory profile.
export const DEMO_THRESHOLD_PROFILES = {
  pm10: { kind: 'maximum', observationAt: 100, criticalAt: 150 },
  noise: { kind: 'maximum', observationAt: 70, criticalAt: 80 },
  ph: { kind: 'range', minimum: 6.5, optimalMinimum: 6.8, optimalMaximum: 8.2, maximum: 8.5 },
  vibration: { kind: 'maximum', observationAt: 4, criticalAt: 5 },
}

const timestamp = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString()
export const DEMO_READINGS = [
  { id: 'rd-001', projectId: 'prj-lima-canta', sectionId: 'lim-01', parameterId: 'pm10', value: 42, recordedAt: timestamp(4), source: 'telemetry' },
  { id: 'rd-002', projectId: 'prj-lima-canta', sectionId: 'lim-01', parameterId: 'noise', value: 62, recordedAt: timestamp(7), source: 'telemetry' },
  { id: 'rd-003', projectId: 'prj-lima-canta', sectionId: 'lim-02', parameterId: 'noise', value: 72, recordedAt: timestamp(3), source: 'telemetry' },
  { id: 'rd-004', projectId: 'prj-lima-canta', sectionId: 'lim-02', parameterId: 'vibration', value: 2.1, recordedAt: timestamp(8), source: 'manual' },
  { id: 'rd-005', projectId: 'prj-lima-canta', sectionId: 'lim-03', parameterId: 'pm10', value: 185, recordedAt: timestamp(2), source: 'telemetry' },
  { id: 'rd-006', projectId: 'prj-lima-canta', sectionId: 'lim-03', parameterId: 'pm10', value: 121, recordedAt: timestamp(62), source: 'telemetry' },
  { id: 'rd-007', projectId: 'prj-lima-canta', sectionId: 'lim-04', parameterId: 'ph', value: 6.8, recordedAt: timestamp(12), source: 'manual' },
  { id: 'rd-008', projectId: 'prj-arequipa-norte', sectionId: 'aqp-01', parameterId: 'pm10', value: 162, recordedAt: timestamp(5), source: 'telemetry' },
  { id: 'rd-009', projectId: 'prj-cusco-anta', sectionId: 'cus-01', parameterId: 'ph', value: 8.3, recordedAt: timestamp(6), source: 'manual' },
]
