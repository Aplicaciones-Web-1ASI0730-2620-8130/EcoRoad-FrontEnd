# Commercial and Subscription Management: contrato HTTP propuesto

Este documento define la frontera que necesitará la SPA para sustituir el repositorio demo. **Las rutas y formas JSON son una propuesta**, pendiente de acuerdo con el equipo backend. No se realizan pagos desde el navegador.

## Operaciones

- `POST /company-accounts`: registrar `Company Account`. Recibe razón social, RUC, tipo de empresa y contacto administrador. Devuelve el identificador de empresa. Las credenciales del administrador pertenecen a IAM.
- `GET /company-accounts/{companyId}`: consultar la empresa visible para la sesión.
- `GET /company-accounts/{companyId}/subscription`: consultar plan, estado, fecha de activación y vencimiento.
- `PUT /company-accounts/{companyId}/subscription/plan`: seleccionar un plan cuando la suscripción aún no está activa. Recibe `{ "planId": "base|professional|enterprise" }`.
- `POST /company-accounts/{companyId}/subscription/activation-requests`: iniciar el proceso de activación; el backend devuelve la información necesaria para continuar el pago o una solicitud pendiente.
- `POST /company-accounts/{companyId}/subscription/renewal-requests`: iniciar la renovación.

El backend confirma la activación o renovación después de recibir una confirmación confiable del proveedor de pagos. El frontend vuelve a consultar `GET .../subscription` para mostrar el estado final. Una respuesta a la solicitud de activación no equivale a `Subscription activated`.

## Modelo de lectura mínimo

```json
{
  "companyId": "company-123",
  "planId": "professional",
  "status": "pending",
  "activatedAt": null,
  "expiresAt": null
}
```

Estados mínimos: `pending`, `active`, `expired`. El backend debe definir estados adicionales como suspensión, cancelación o pago fallido antes de conectar la UI real.

## Reglas de integración

- El backend es la autoridad para permisos y suscripción activa; el guard del frontend solo mejora la navegación.
- El identificador de empresa y el token deben provenir de la sesión de IAM. El navegador no debe elegir libremente otra empresa.
- Las respuestas de error deben incluir `message` y, de ser posible, un `code` estable. La UI debe distinguir al menos validación (400/422), falta de acceso (401/403), conflicto de RUC o plan (409) y fallo temporal (5xx).
- No enviar ni almacenar contraseñas en Commercial. La pasarela de pagos recibe la información de pago por un flujo seguro definido por backend.

