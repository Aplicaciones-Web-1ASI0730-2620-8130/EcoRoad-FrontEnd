# Contrato provisional de Alerting and Risk Evaluation

Las rutas requieren `X-Demo-Company-Id`. Una suscripción activa es obligatoria. Los errores usan `{ code, message }`.

- `GET /api/alerts`: lista alertas de la empresa. Acepta `projectId`, `risk`, `status` y `search` como filtros opcionales.
- `GET /api/alerts/:id`: devuelve el detalle de una alerta de la empresa.
- `POST /api/alerts/:id/acknowledgments`: registra la atención con `{ "acknowledgedBy": "Nombre" }` y devuelve la alerta actualizada.

El comando devuelve `422 INVALID_ACKNOWLEDGMENT` si el nombre falta o supera 80 caracteres; `409 ALREADY_ACKNOWLEDGED` si la alerta ya fue atendida. Un identificador ajeno o inexistente devuelve `404 ALERT_NOT_FOUND`. Sin suscripción activa se devuelve `403 SUBSCRIPTION_REQUIRED`.

Los datos de ejemplo viven en memoria durante la ejecución de `server/fake-commercial-api.mjs` y se reinician al detener el servidor. El frontend usa `VITE_ALERTING_API_URL` para apuntar a otra implementación del mismo contrato.
