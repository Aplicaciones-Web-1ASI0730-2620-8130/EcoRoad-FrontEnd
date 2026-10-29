# Fake API: Compliance and Reporting

Base: `/api/compliance`. Todas las solicitudes requieren `X-Demo-Company-Id` de una empresa con suscripción activa. La cabecera solo simula selección de empresa; no es autenticación.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/projects` | Proyectos de la empresa, incluidos los registrados durante esta sesión. |
| POST | `/previews` | Consolidación actual para los criterios enviados; no persiste. |
| POST | `/reports` | Genera una copia de la consolidación y devuelve `201`. |
| GET | `/reports?projectId=...` | Lista de reportes simulados de la empresa. |
| GET | `/reports/:id` | Copia generada previamente. |

El cuerpo de `POST /previews` y `POST /reports` es `{ "projectId": "...", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "sections": ["indicators", "alerts"] }`. Las fechas incluyen ambos extremos. Solo se aceptan secciones con fuente disponible.

La respuesta de vista previa incluye proyecto, periodo, secciones, resumen por indicador, cantidad de lecturas, alertas críticas y atendidas. `incidentCount` y `evidenceCount` son `null` porque aún no existe la fuente de esos contextos. Un reporte generado agrega `id`, `createdAt`, `simulation: true` y `preview`. El servidor guarda esa vista previa como copia; cambios posteriores en alertas no alteran reportes ya generados.

Los errores usan `{ code, message, errors? }`: `COMPANY_REQUIRED` (400), `SUBSCRIPTION_REQUIRED` (403), `REPORT_NOT_FOUND` (404) e `INVALID_REPORT_CRITERIA` (422). Los datos y reportes se pierden al reiniciar la fake API. No hay PDF, firma, aprobación regulatoria ni garantía criptográfica de inmutabilidad.
