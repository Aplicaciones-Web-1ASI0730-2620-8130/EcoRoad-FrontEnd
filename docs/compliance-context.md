# Compliance and Reporting

Este contexto consolida datos históricos de otros contextos para construir reportes ambientales por proyecto y periodo. No es dueño de proyectos, mediciones, alertas, incidentes ni evidencias.

La primera entrega incluyó:

- Modelo de criterios de reporte y validación de proyecto, fechas y secciones disponibles.
- Proyección pura que agrupa mediciones por indicador y cuenta alertas del periodo, con límites inclusivos.
- Ruta `/compliance` y pantalla de configuración y vista previa, basada en el mockup de reportes.
- Fuente local de demostración que adapta fixtures existentes de Projects, Environmental Monitoring y Alerting.

La segunda entrega sustituye esa fuente local por una fake API de consolidación. La pantalla consulta el catálogo de proyectos, solicita vistas previas y permite generar y reabrir reportes simulados durante la sesión del servidor. La fake API lee los proyectos del contexto Projects, las lecturas del contexto Environmental Monitoring y el estado actual de alertas del contexto Alerting. Cada reporte generado conserva una copia de su vista previa para que cambios posteriores en las fuentes no la modifiquen.

La vista identifica como pendientes las fuentes de incidentes y evidencias. No presenta un número ficticio para ellas ni afirma que la vista previa o los reportes simulados sean documentos oficiales. Cualquier firma, hash o aprobación regulatoria requiere un contrato de backend y reglas acordadas; no se simulan como válidos en esta etapa. Consulta el [contrato de la fake API](compliance-api-contract.md).
