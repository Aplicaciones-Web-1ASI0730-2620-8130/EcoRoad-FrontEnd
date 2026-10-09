# Alerting and Risk Evaluation

## Alcance implementado

La ruta `/alerts` presenta una bandeja de alertas ambientales con filtros por proyecto, riesgo, estado y texto. El panel de detalle muestra la medición, el perfil aplicado y una acción sugerida. El usuario puede registrar la atención durante la sesión actual.

El contexto recibe identificadores y mediciones de Environmental Monitoring y decide el riesgo mediante perfiles de máximo o rango. `createAlertFromReading` crea alertas para lecturas críticas o en observación. Las lecturas conformes no generan alertas.

Los perfiles y registros en `src/alerting/infrastructure/alert-fixtures.js` son inventados para la demostración. No establecen límites regulatorios oficiales. El navegador consulta la fake API; el acuse de recibo sobrevive a la recarga y se reinicia al detener el servidor.

La fake API ofrece consultas y el comando de atención con datos aislados por empresa. Su contrato está en `docs/alerting-api-contract.md`. La apertura y gestión de incidentes pertenece a Incident and Remediation Management.
