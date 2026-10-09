# Contrato provisional: Project and Road Site Management

Base local: `/api/`. El frontend usa `VITE_PROJECTS_API_URL` para cambiarla.

## Rutas

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/projects` | Lista de proyectos de la empresa |
| POST | `/projects` | Proyecto creado (201) |
| GET | `/projects/:projectId` | Proyecto con sus tramos |
| POST | `/projects/:projectId/sections` | Tramo creado (201) |
| PUT | `/projects/:projectId/sections/:sectionId` | Tramo actualizado |
| DELETE | `/projects/:projectId/sections/:sectionId` | `{ "deleted": true }` |

El proyecto nuevo requiere `name`, `location`, `type`, `concessionaireName` y `sections` con al menos un elemento. Cada tramo requiere `name`, `startPk`, `endPk` y `workFront`. Las progresivas usan `00+000`; el PK final debe ser mayor al inicial y los tramos no pueden superponerse. No se puede eliminar el último tramo.

La fake API lee `X-Demo-Company-Id` para separar los datos y exige una suscripción activa y vigente. El frontend usa `demo-company` si no existe una empresa seleccionada en el modo demo. Este encabezado **no autentica** a nadie: el backend real debe obtener la identidad y la empresa de una sesión segura, validar permisos y mantener la autorización en el servidor.

Errores JSON: `{ "code": "...", "message": "...", "errors": ... }`. Códigos relevantes: `SUBSCRIPTION_REQUIRED` (403), `PROJECT_NOT_FOUND` (404), `INVALID_PROJECT` / `INVALID_SECTION` (422), `LAST_SECTION` (409). Los datos quedan en memoria hasta reiniciar la fake API.
