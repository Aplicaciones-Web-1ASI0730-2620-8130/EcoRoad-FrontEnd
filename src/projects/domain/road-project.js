import { useFakeApi } from '../../shared/infrastructure/api-mode.js'

export const PROJECT_TYPES = Object.freeze([
  { value: 'construction', label: 'Construcción vial' },
  { value: 'maintenance', label: 'Mantenimiento vial' },
  { value: 'rehabilitation', label: 'Rehabilitación vial' },
])

export const ENVIRONMENTAL_STATUSES = Object.freeze({
  optimal: { label: 'Óptimo', severity: 'success' },
  observation: { label: 'En observación', severity: 'warn' },
  critical: { label: 'Crítico', severity: 'danger' },
  not_monitored: { label: 'Sin monitoreo', severity: 'secondary' },
})

export function validateRoadProject(input) {
  const errors = {}
  if (!input.name?.trim()) errors.name = 'Ingresa el nombre oficial del proyecto.'
  if (useFakeApi && !input.location?.trim()) errors.location = 'Ingresa la ubicación del proyecto.'
  if (!useFakeApi && !input.code?.trim()) errors.code = 'Ingresa el código del proyecto.'
  if (useFakeApi && !PROJECT_TYPES.some((type) => type.value === input.type)) errors.type = 'Selecciona el tipo de obra.'
  if (useFakeApi && !input.concessionaireName?.trim()) errors.concessionaireName = 'Ingresa la entidad concesionaria.'
  return errors
}

export function matchesProjectFilters(project, { search = '', status = 'all', type = 'all' } = {}) {
  const query = search.trim().toLocaleLowerCase('es')
  const searchable = [project.name, project.code, project.location].join(' ').toLocaleLowerCase('es')
  return (!query || searchable.includes(query)) &&
    (status === 'all' || project.environmentalStatus === status) &&
    (!useFakeApi || type === 'all' || project.type === type)
}

