# EcoRoad Frontend

SPA de EcoRoad construida con Vue, Vite y PrimeVue. Esta rama implementa el bounded context **Commercial and Subscription Management**.

## Ejecutar con la fake API

En una terminal:

```sh
npm install
npm run api:fake
```

En otra terminal:

```sh
npm run dev
```

Abre la URL indicada por Vite. La fake API escucha en `http://127.0.0.1:3001/api` y Vite redirige las peticiones `/api` a ese servidor. `npm run build` genera la versión de producción y `npm test` comprueba las reglas y el flujo HTTP.

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
# EcoRoad FrontEnd

Aplicación Vue con PrimeVue para gestión ambiental de proyectos viales. Los módulos se organizan por bounded context: Commercial, Projects, Environmental Monitoring, Alerting and Risk Evaluation, Monitoring Asset and Deployment y Compliance and Reporting (primera parte).

## Ejecución local

```bash
# EcoRoad-FrontEnd

SPA de EcoRoad con Vue, Vite y PrimeVue, organizada por bounded contexts.

## Ejecutar

```sh
npm install
npm run dev
```

`npm run dev` inicia Vite y la fake API local. Abre la dirección indicada por Vite y visita `/assets` para administrar sensores y puntos, o `/compliance` para la vista previa de reportes. La empresa de demostración tiene una suscripción activa; los datos de la fake API se reinician al detener el servidor.

```bash
npm test
npm run build
```

Consulta [el contexto de activos](docs/assets-context.md), [el contrato de su fake API](docs/assets-api-contract.md) y [el alcance inicial de Compliance and Reporting](docs/compliance-context.md).
`npm run dev` inicia Vite y la fake API local. La bandeja de Alerting and Risk Evaluation está en `/alerts`. Usa mediciones y perfiles de riesgo de demostración; permite consultar alertas y registrar su atención. La fake API conserva los cambios durante la ejecución del servidor y los reinicia al detenerlo. Su contrato está en `docs/alerting-api-contract.md`.

Usa `npm test` para las pruebas y `npm run build` para verificar la compilación.
