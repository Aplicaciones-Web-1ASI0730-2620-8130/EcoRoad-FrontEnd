export function parseKilometerPost(value) {
  const match = /^(\d{1,3})\+(\d{3})$/.exec(String(value ?? '').trim())
  if (!match) return null
  return Number(match[1]) * 1000 + Number(match[2])
}

export function validateRoadSections(sections, { required = true } = {}) {
  const errors = { items: [] }
  if (!Array.isArray(sections) || sections.length === 0) {
    if (required) errors.sections = 'Agrega al menos un tramo del corredor vial.'
    return errors
  }

  const ranges = []
  sections.forEach((section, index) => {
    const row = {}
    if (!section.name?.trim()) row.name = 'Ingresa el nombre del tramo.'
    if (!section.workFront?.trim()) row.workFront = 'Describe el frente de trabajo.'

    const start = parseKilometerPost(section.startPk)
    const end = parseKilometerPost(section.endPk)
    if (start === null) row.startPk = 'Usa el formato PK 00+000.'
    if (end === null) row.endPk = 'Usa el formato PK 00+000.'
    if (start !== null && end !== null) {
      if (end <= start) row.endPk = 'El PK final debe ser mayor que el inicial.'
      else ranges.push({ index, start, end })
    }
    errors.items[index] = row
  })

  ranges.sort((a, b) => a.start - b.start)
  for (let index = 0; index < ranges.length; index += 1) {
    for (let next = index + 1; next < ranges.length && ranges[next].start < ranges[index].end; next += 1) {
      errors.items[ranges[index].index].range = 'Este tramo se superpone con otro tramo del proyecto.'
      errors.items[ranges[next].index].range = 'Este tramo se superpone con otro tramo del proyecto.'
    }
  }
  return errors
}

export function hasRoadSectionErrors(errors) {
  return Boolean(errors.sections || errors.items.some((row) => Object.keys(row).length > 0))
}

export function normalizeRoadSection(section) {
  return {
    id: section.id || crypto.randomUUID(),
    name: section.name.trim(),
    startPk: section.startPk.trim(),
    endPk: section.endPk.trim(),
    workFront: section.workFront.trim(),
    status: section.status || 'active',
  }
}
