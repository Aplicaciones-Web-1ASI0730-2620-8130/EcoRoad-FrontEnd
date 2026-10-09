# EcoRoad Frontend

SPA de EcoRoad construida con Vue, Vite y PrimeVue. El código se organiza por bounded contexts.

## Ejecutar con la fake API

En una terminal:

```sh
npm install
npm run dev
```

`npm run dev` inicia Vite y la fake API juntos. Abre la URL indicada por Vite. La fake API escucha en `http://127.0.0.1:3001/api` y Vite redirige las peticiones `/api` a ese servidor. `npm run api:fake` puede usarse por separado si solo necesitas la API. `npm run build` genera la versión de producción y `npm test` comprueba las reglas y los flujos HTTP.

## Alcance del contexto comercial

- Registro de cuenta empresarial con RUC, tipo de empresa, contacto administrador y selección de plan.
- Vista de suscripción con estado, vigencia y datos de la empresa.
- Selección de plan, activación y renovación simuladas mediante una fake API local.
- Cuenta de ejemplo basada en los mockups, disponible desde la vista de suscripción.
- Regla de acceso operacional expresada en `canAccessOperationalModules`.

La fake API mantiene los datos en memoria durante la ejecución del servidor y se reinicia al detenerlo. El navegador guarda solamente el ID de empresa seleccionada en `localStorage` bajo `ecoroad.commercial.selected-company`. No hay cobros ni autenticación reales.

## Límite del contexto

`src/commercial/` sigue la estructura `domain/`, `application/`, `infrastructure/`, `presentation/` del proyecto de referencia. Commercial es dueño de `Company Account` y `Subscription`. La contraseña, las invitaciones, los roles y la sesión pertenecen al futuro contexto IAM. Por eso el formulario solo recoge datos de contacto del administrador.

La fake API confirma inmediatamente la activación y renovación para simular el flujo. En producción, esos estados deberán confirmarse desde el backend después del pago; la autorización de proyectos y monitoreo deberá validarse en el backend.

## Integración posterior

El frontend usa `commercial-api-repository.js`. Sus rutas actuales están implementadas por `server/fake-commercial-api.mjs` y descritas en `docs/commercial-api-contract.md`. Para apuntar a otra API se puede configurar `VITE_COMMERCIAL_API_URL`; antes habrá que acordar el contrato definitivo, conectar IAM y definir el proveedor de pagos.

## Project and Road Site Management

La primera versión incluye el listado, búsqueda y filtros de proyectos viales, un formulario de registro básico y una vista de detalle. La segunda versión permite registrar tramos y sus frentes de trabajo junto con el proyecto, y agregarlos, editarlos o eliminarlos desde el detalle. Valida el formato de las progresivas `PK 00+000`, su orden y que los tramos no se superpongan.

El tercer incremento conecta proyectos y tramos a la fake API, y consulta la suscripción antes de entrar al módulo. Los datos de ejemplo están en `src/projects/infrastructure/project-fixtures.js`. Los cambios sobreviven a una recarga del navegador, pero se reinician al detener el servidor. La empresa demo activa se usa por defecto si aún no se seleccionó una empresa; las empresas recién registradas necesitan activar su plan. La fake API valida la misma regla de acceso y separa los proyectos por empresa. Esta simulación no sustituye la autenticación ni autorización del backend real.

El contrato provisional está en `docs/projects-api-contract.md`. Para otra API se puede configurar `VITE_PROJECTS_API_URL` y `VITE_COMMERCIAL_API_URL`.

## Environmental Monitoring (segunda versión)

`src/monitoring/` incorpora el dashboard ambiental por proyecto y tramo, con indicadores de aire, ruido, agua y vibración. Las lecturas y perfiles de umbral son datos de ejemplo definidos en `src/monitoring/infrastructure/monitoring-fixtures.js`; no representan telemetría real ni certificación normativa. Este contexto referencia los identificadores de proyectos y tramos, pero no administra los sensores IoT ni genera alertas o incidentes.

El historial de indicadores se consulta en `/monitoring/history` y permite filtrar por proyecto, tramo, parámetro y fechas. El dashboard y el historial consumen la fake API local mediante `monitoring-api-repository.js`; el contrato provisional está en `docs/monitoring-api-contract.md`.
