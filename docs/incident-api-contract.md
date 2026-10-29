# Contrato de la fake API de incidentes

Todas las rutas requieren `Authorization: Bearer <token>` de IAM y `X-Demo-Company-Id` igual a la empresa de la sesión. La empresa debe tener suscripción activa. La fake API devuelve JSON, salvo la descarga del archivo.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/incidents` | Listar expedientes de la empresa; admite `status`, `projectId`, `search`. |
| GET | `/api/incidents/reference-data` | Alertas y colaboradores activos de la empresa. |
| GET | `/api/incidents/:id` | Consultar un expediente. |
| POST | `/api/incidents` | Abrir desde `{ alertId, description }`. Una alerta solo puede originar un expediente. |
| POST | `/api/incidents/:id/assignment` | Asignar `{ userId }`. |
| POST | `/api/incidents/:id/actions` | Registrar `{ description }`. |
| POST | `/api/incidents/:id/evidence` | Registrar `{ note, attachment? }`. |
| GET | `/api/incidents/:id/evidence/:evidenceId/file` | Descargar archivo adjunto. |
| POST | `/api/incidents/:id/resolution` | Marcar como resuelto si existen acción y evidencia. |
| POST | `/api/incidents/:id/closure` | Registrar cierre formal. |

`attachment` contiene `name`, `mimeType` (`image/png`, `image/jpeg`, `application/pdf`) y `dataBase64`, con límite de 2 MB decodificados. La respuesta de evidencia contiene metadatos `name`, `mimeType`, `size` y `sha256`, sin incluir los bytes. Los errores devuelven `{ code, message }` y usan `401` para falta de sesión, `403` para empresa/suscripción/permisos, `404` para recursos no encontrados, `409` para conflictos de estado o duplicados y `422` para datos inválidos.
