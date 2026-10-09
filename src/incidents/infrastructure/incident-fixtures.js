import { createDemoAlerts } from '../../alerting/infrastructure/alert-fixtures.js'
import { createDemoUsers } from '../../iam/infrastructure/iam-demo-data.js'
import { assignResponsible, openIncident, recordCorrectiveAction, recordFieldEvidence, resolveIncident } from '../domain/incident.js'

export function createDemoIncidents(now = new Date()) {
  const [critical, noise, water] = createDemoAlerts(now)
  const [admin, engineer, inspector] = createDemoUsers()
  const open = (alert, description, id) => ({ ...openIncident({ alert, companyId: 'demo-company', description }, admin, now), id })

  const pending = open(critical, 'Concentración elevada de material particulado en el frente de corte.', 'INC-024')
  const assigned = assignResponsible(open(noise, 'Nivel de ruido próximo al umbral en la zona de trituración.', 'INC-021'), inspector, admin)
  const withAction = recordCorrectiveAction(assigned, 'Instalar pantallas acústicas móviles junto a la trituradora.', admin, now)
  const withEvidence = recordFieldEvidence(withAction, 'Registro fotográfico de las pantallas instaladas y medición de control.', admin, now)
  const waterAssigned = assignResponsible(open(water, 'Desviación preventiva de pH en el punto de muestreo.', 'INC-019'), engineer, admin)
  const waterAction = recordCorrectiveAction(waterAssigned, 'Repetir el muestreo y ajustar barreras de escorrentía.', admin, now)
  const waterEvidence = recordFieldEvidence(waterAction, 'Contramuestra de campo documentada.', inspector, now)
  return [pending, withEvidence, resolveIncident(waterEvidence, admin, now)]
}
