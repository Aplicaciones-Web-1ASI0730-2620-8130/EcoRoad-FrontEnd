# EcoRoad Frontend

SPA de EcoRoad con Vue 3, Vite y PrimeVue. El código se organiza por contexto (`domain`, `application`, `infrastructure`, `presentation`).

## Ejecutar con el backend y MySQL

1. Inicia MySQL y comprueba que el esquema del backend tiene las migraciones aplicadas.
2. Inicia `EcoRoad-platform` desde Rider con el perfil `EcoRoad-platform` y la variable de entorno `ConnectionStrings__DefaultConnection` configurada para tu base local. El backend debe responder en `http://localhost:5080/scalar`.
3. En este repositorio ejecuta `npm install` y `npm run dev`. Abre la URL de Vite que aparece en la terminal. Vite redirige `/api` al backend en el puerto 5080.
4. Registra una empresa, crea su administrador IAM, activa la suscripción e inicia sesión. Las rutas operativas requieren sesión, permiso y suscripción activa.
5. Para verificar las rutas de lectura, ejecuta `npm run smoke:real`. Si Vite también está encendido, configura `ECOROAD_FRONTEND_URL` con su URL para verificar el proxy. El comando no escribe datos.

Si el backend usa otro puerto, agrega `API_PROXY_TARGET=http://127.0.0.1:<puerto>` a `.env.local` antes de iniciar Vite. Mantén `VITE_*_API_URL` sin configurar para usar el proxy local. Consulta `.env.example`.

## Modos y comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Frontend con backend real mediante `/api` |
| `npm run dev:fake` | Frontend y API simulada local |
| `npm run smoke:real` | Comprobación de solo lectura del backend |
| `npm test` | Pruebas de dominio, API simulada y contratos HTTP |
| `npm run lint` | Análisis estático |
| `npm run build` | Compilación de producción |

El modo simulado usa datos en memoria. Para activarlo con `npm run dev` configura `VITE_API_MODE=fake` y el destino de la API simulada; `npm run dev:fake` realiza ambos pasos.

## Módulos conectados

- Comercial y suscripciones: `/commercial/register`, `/commercial/subscription`
- Identidad y permisos: `/iam/login`, `/iam/collaborators`
- Proyectos y tramos: `/projects`
- Monitoreo, historial y captura: `/monitoring`, `/monitoring/history`, `/monitoring/operations`
- Sensores y puntos: `/assets`
- Alertas e incidentes: `/alerts`, `/incidents`
- Reportes: `/compliance`

Las pantallas con API real presentan únicamente los campos que ofrece el backend. Las pruebas automatizadas usan respuestas simuladas para verificar el contrato; `smoke:real` comprueba rutas de lectura del servidor en ejecución. Para verificar cambios de estado, usa la interfaz con una empresa de prueba.

## Límites actuales del backend

- La API de alertas lista solo alertas activas. No hay consulta de reglas registradas.
- La API de cumplimiento permite generar un PDF con identificadores y cantidades, pero no ofrece un listado de reportes ni verifica criptográficamente el texto de firma.
- La API de incidentes almacena una URL de evidencia; no ofrece subida ni descarga de archivos.
- El estado de cumplimiento de un proyecto se puede actualizar, pero no consultar con el contrato actual.

La API simulada y sus contratos de demostración permanecen en `server/` y `docs/` para desarrollo y pruebas.
