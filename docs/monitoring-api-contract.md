# Environmental Monitoring fake API

Todas las rutas requieren el header `X-Demo-Company-Id`. La API devuelve `403 SUBSCRIPTION_REQUIRED` si la empresa no tiene una suscripción activa.

## Endpoints

- `GET /api/monitoring/projects`: proyectos visibles para la empresa.
- `GET /api/monitoring/projects/:projectId/dashboard`: resumen de indicadores, lecturas actuales y estado por tramo.
- `GET /api/monitoring/projects/:projectId/history?sectionId=all&parameterId=pm10&from=YYYY-MM-DD&to=YYYY-MM-DD`: lecturas históricas filtradas.

Los errores usan `{ code, message }`. La API responde `422 INVALID_HISTORY_FILTERS` cuando `from` es posterior a `to` y `404 MONITORING_PROJECT_NOT_FOUND` cuando el proyecto no pertenece a la empresa.

La implementación de desarrollo está en `server/fake-monitoring-api.mjs` y mantiene los datos en memoria.
