# EcoRoad FrontEnd

SPA de EcoRoad construida con **Vue 3**, **Vite** y **PrimeVue** para la gestión ambiental de proyectos viales. El código se organiza por **bounded contexts** bajo `src/` (`domain/`, `application/`, `infrastructure/`, `presentation/`).

Módulos integrados en `develop`:

| Contexto | Rutas principales | Código |
|----------|-------------------|--------|
| Commercial and Subscription Management | `/commercial/register`, `/commercial/subscription` | `src/commercial/` |
| Identity and Access Management (IAM) | `/iam/login`, `/iam/collaborators` | `src/iam/` |
| Project and Road Site Management | `/projects` | `src/projects/` |
| Environmental Monitoring | `/monitoring`, `/monitoring/history` | `src/monitoring/` |
| Alerting and Risk Evaluation | `/alerts` | `src/alerting/` |
| Incident and Remediation Management | `/incidents` | `src/incidents/` |
| Monitoring Asset and Deployment | `/assets` | `src/assets/` |
| Compliance and Reporting | `/compliance` | `src/compliance/` |

Las rutas operativas (`/projects`, `/monitoring`, `/alerts`, `/incidents`, `/assets`, `/compliance`, `/iam/collaborators`) exigen sesión IAM, permisos por módulo y suscripción activa según las reglas de Commercial.

## Ejecución local

```bash
npm install
npm run dev
```

`npm run dev` levanta **Vite** y la **fake API** en `http://127.0.0.1:3001/api`. Vite redirige `/api` a ese servidor. Abre la URL que imprime Vite en la consola.

Si solo necesitas la API:

```bash
npm run api:fake
```

Otros scripts:

```bash
npm test          # reglas de dominio y flujos HTTP
npm run build     # build de producción
npm run preview   # vista previa del build
```

### Datos de demostración

- La fake API guarda datos **en memoria**; se reinician al detener el servidor.
- El navegador persiste el ID de empresa en `localStorage` (`ecoroad.commercial.selected-company`) y el token de sesión demo en `sessionStorage` (`ecoroad.iam.demo-session`).
- Inicio de sesión demo: usuario `c.mendoza@empresa.pe` y la contraseña indicada en `/iam/login` (empresa demo `demo-company`).

## Commercial and Subscription Management

- Registro de cuenta empresarial (RUC, tipo de empresa, contacto administrador, plan).
- Vista de suscripción con estado, vigencia y datos de la empresa.
- Activación y renovación simuladas; regla de acceso operacional en `canAccessOperationalModules`.
- Commercial es dueño de **Company Account** y **Subscription**; credenciales, roles e invitaciones viven en IAM.

Contrato y fake API: `docs/commercial-api-contract.md`, `server/fake-commercial-api.mjs`. Variable opcional: `VITE_COMMERCIAL_API_URL`.

## Project and Road Site Management

Listado, búsqueda, filtros, alta de proyectos y detalle con tramos (`PK 00+000`, orden y no superposición). Los datos de ejemplo están en `src/projects/infrastructure/project-fixtures.js`. Los cambios sobreviven a recargar el navegador mientras la API siga en ejecución.

Contrato: `docs/projects-api-contract.md`. Variable opcional: `VITE_PROJECTS_API_URL`.

## Environmental Monitoring

Dashboard por proyecto y tramo (aire, ruido, agua, vibración) e historial en `/monitoring/history`. Lecturas y umbrales de demo en `src/monitoring/infrastructure/monitoring-fixtures.js`; no son telemetría certificada.

Contrato: `docs/monitoring-api-contract.md`. Variable opcional: `VITE_MONITORING_API_URL`.

## Alerting, incidentes, activos y compliance

- **Alertas** (`/alerts`): consulta y atención sobre perfiles de riesgo de demostración. Ver `docs/alerting-context.md` y `docs/alerting-api-contract.md` (`VITE_ALERTING_API_URL`).
- **Incidentes** (`/incidents`): bandeja y remediación simulada. Ver `docs/incident-context.md` y `docs/incident-api-contract.md` (`VITE_INCIDENT_API_URL`).
- **Sensores y puntos** (`/assets`): despliegue de activos de monitoreo. Ver `docs/assets-context.md` y `docs/assets-api-contract.md` (`VITE_ASSET_API_URL`).
- **Reportes** (`/compliance`): vista previa de reportes ambientales. Ver `docs/compliance-context.md` y `docs/compliance-api-contract.md` (`VITE_COMPLIANCE_API_URL`).

## IAM

Sesión demo, permisos por colaborador y pantallas de acceso restringido. Alcance: `docs/iam-context.md`. Variable opcional: `VITE_IAM_API_URL`.

## Demo en Vercel

La función `api/index.js` atiende `/api/*` en el mismo dominio del frontend. `vercel.json` enruta esas peticiones a la función y devuelve `index.html` para rutas de Vue (por ejemplo `/iam/login`).

En serverless los datos en memoria pueden perderse entre instancias o reinicios. Para entornos compartidos hace falta un backend con persistencia externa.

## Integración con backend real

Cada contexto consume su repositorio `*-api-repository.js`. Las variables `VITE_*_API_URL` permiten apuntar a otra base; los contratos en `docs/` son provisionales hasta alinear autenticación, pagos y autorización con el backend definitivo.
