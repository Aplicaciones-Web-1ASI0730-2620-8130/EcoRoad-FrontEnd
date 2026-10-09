# Fake API: Monitoring Asset and Deployment

Base: `/api/assets`. Todas las solicitudes requieren `X-Demo-Company-Id` de una empresa con suscripción activa. Los cambios se guardan solo en memoria durante la ejecución del servidor.

## Consultas

- `GET /projects`: proyectos y tramos disponibles para desplegar equipos.
- `GET /summary`: totales de sensores, activos habilitados para reporte, asignados, disponibles y calibraciones pendientes.
- `GET /points?projectId=...`: puntos de la empresa, opcionalmente filtrados por proyecto.
- `GET /points/:id`: detalle de un punto.
- `GET /sensors?projectId=...&status=...&search=...`: inventario filtrado.
- `GET /sensors/:id`: detalle con `canReport` calculado.

## Comandos

- `POST /points`: `{ projectId, sectionId, name, pk, latitude, longitude }`.
- `PUT /points/:id`: mismo cuerpo; solo cuando no haya sensores en el punto.
- `DELETE /points/:id`: solo cuando no haya sensores en el punto.
- `POST /sensors`: `{ name, serialNumber, type }`, con tipo `pm10`, `noise`, `water` o `vibration`.
- `POST /sensors/:id/assignment`: `{ pointId }`.
- `POST /sensors/:id/calibration`: `{ validUntil }` en fecha ISO futura.
- `POST /sensors/:id/activation`, `/deactivation`, `/release`: sin cuerpo.

El éxito devuelve el recurso actualizado; `DELETE /points/:id` devuelve `{ "deleted": true }`. Los errores devuelven `{ code, message, errors? }` y un estado HTTP apropiado. Códigos principales: `SUBSCRIPTION_REQUIRED` (403), `POINT_NOT_FOUND` y `SENSOR_NOT_FOUND` (404), `INVALID_POINT`, `INVALID_SENSOR` e `INVALID_CALIBRATION` (422), `POINT_IN_USE`, `DUPLICATE_SERIAL`, `POINT_TYPE_OCCUPIED`, `ASSIGNMENT_REQUIRED`, `CALIBRATION_REQUIRED` y `ACTIVE_SENSOR` (409).

Esta fake API sirve para probar el contrato y los flujos de la interfaz; no representa autorización real de dispositivos ni recibe telemetría.
