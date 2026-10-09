# Incident and Remediation Management · primera entrega

Este contexto coordina el ciclo de vida de una incidencia ambiental vinculada a una alerta: apertura, asignación de responsable, registro de acción correctiva, evidencia de campo, resolución y cierre formal. Alerting conserva la decisión de riesgo y el registro original de la alerta; Incident and Remediation Management guarda su propio expediente y solo referencia el ID de la alerta.

La ruta `/incidents` muestra un tablero por estado y un expediente lateral, inspirado en los mockups del proyecto. Incluye filtros por proyecto, estado y texto. El administrador puede abrir un caso, asignarlo, registrar medidas y evidencia, resolverlo y cerrarlo. Cada transición aplica las reglas del dominio y los permisos de IAM (`manage_incidents`, `corrective_actions`, `field_evidence`). Un caso no se resuelve sin acción y evidencia.

Esta primera entrega usa datos locales de ejemplo. Los cambios de incidentes se reinician al recargar. Los textos de evidencia documentan la actuación de campo; la carga de archivos y la persistencia pertenecen al siguiente avance con fake API. Los tres expedientes iniciales muestran los estados pendiente, en progreso y resuelto. Un cuarto ejemplo de alerta permite abrir un caso desde la interfaz.
