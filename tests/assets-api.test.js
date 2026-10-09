import test from 'node:test'
import assert from 'node:assert/strict'
import { createFakeCommercialApi } from '../server/fake-commercial-api.mjs'
import { AssetApiError, createAssetApiRepository } from '../src/assets/infrastructure/asset-api-repository.js'
import { createCommercialApiRepository } from '../src/commercial/infrastructure/commercial-api-repository.js'
import { createProjectApiRepository } from '../src/projects/infrastructure/project-api-repository.js'

test('fake asset API manages the sensor deployment lifecycle within one company', async () => {
  const server = createFakeCommercialApi()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/`
    const api = createAssetApiRepository({ baseUrl, getCompanyId: () => 'demo-company' })
    assert.equal((await api.listSensors()).length, 5)
    assert.equal((await api.listPoints()).length, 4)
    const project = (await api.listProjects()).find((item) => item.id === 'prj-lima-canta')
    assert.ok(project)
    const point = await api.createPoint({ projectId: project.id, sectionId: project.sections[0].id, name: 'Punto de prueba', pk: '06+000', latitude: -11.7, longitude: -76.8 })
    const updatedPoint = await api.updatePoint(point.id, { ...point, name: 'Punto actualizado' })
    assert.equal(updatedPoint.name, 'Punto actualizado')
    await assert.rejects(api.createPoint({ ...point, pk: '999+000' }), (error) => error.status === 422 && error.code === 'INVALID_POINT')

    const sensor = await api.registerSensor({ name: 'Equipo nuevo', serialNumber: 'NEW-001', type: 'pm10' })
    await assert.rejects(api.registerSensor({ name: 'Duplicado', serialNumber: 'new-001', type: 'pm10' }),
      (error) => error instanceof AssetApiError && error.status === 409 && error.code === 'DUPLICATE_SERIAL')
    assert.equal((await api.getSensor(sensor.id)).canReport, false)
    await assert.rejects(api.activateSensor(sensor.id), (error) => error.code === 'ASSIGNMENT_REQUIRED')
    await api.assignSensor(sensor.id, point.id)
    await assert.rejects(api.deletePoint(point.id), (error) => error.code === 'POINT_IN_USE')
    await assert.rejects(api.activateSensor(sensor.id), (error) => error.code === 'CALIBRATION_REQUIRED')
    await api.calibrateSensor(sensor.id, new Date(Date.now() + 86400000).toISOString())
    assert.equal((await api.activateSensor(sensor.id)).canReport, true)
    await assert.rejects(api.releaseSensor(sensor.id), (error) => error.code === 'ACTIVE_SENSOR')
    await api.deactivateSensor(sensor.id)
    assert.equal((await api.releaseSensor(sensor.id)).status, 'available')
    assert.deepEqual(await api.deletePoint(point.id), { deleted: true })
    assert.equal((await api.listSensors({ status: 'available' })).length, 2)

    const commercial = createCommercialApiRepository({ baseUrl })
    const company = await commercial.registerCompany({ companyName: 'Obras Test', ruc: '20601234569', companyType: 'construction', adminName: 'Ana Torres', adminEmail: 'ana@obras.pe', acceptedTerms: true })
    const other = createAssetApiRepository({ baseUrl, getCompanyId: () => company.id })
    await assert.rejects(other.listSensors(), (error) => error.status === 403 && error.code === 'SUBSCRIPTION_REQUIRED')
    await commercial.selectPlan(company.id, 'base')
    await commercial.requestActivation(company.id)
    assert.deepEqual(await other.listSensors(), [])
    await assert.rejects(other.getSensor(sensor.id), (error) => error.status === 404 && error.code === 'SENSOR_NOT_FOUND')

    const projects = createProjectApiRepository({ baseUrl, getCompanyId: () => company.id })
    const newProject = await projects.registerProject({ name: 'Carretera nueva', location: 'Lima', type: 'construction', concessionaireName: 'Obras Test', sections: [{ name: 'Tramo 1', startPk: '00+000', endPk: '10+000', workFront: 'Tierra' }] })
    const newPoint = await other.createPoint({ projectId: newProject.id, sectionId: newProject.sections[0].id, name: 'Estación nueva', pk: '03+000', latitude: -12, longitude: -77 })
    assert.equal(newPoint.projectId, newProject.id)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
