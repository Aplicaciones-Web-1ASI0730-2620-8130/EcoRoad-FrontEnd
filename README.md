# EcoRoad Frontend

SPA de EcoRoad construida con Vue, Vite y PrimeVue. Esta rama implementa el primer bounded context: **Commercial and Subscription Management**.

## Ejecutar

```sh
npm install
npm run dev
```

Abre la URL indicada por Vite. `npm run build` genera la versión de producción.

## Alcance de esta primera entrega

- Registro de cuenta empresarial con RUC, tipo de empresa, contacto administrador y selección de plan.
- Vista de suscripción con estado, vigencia y datos de la empresa.
- Selección de plan, activación y renovación simuladas en el navegador para revisar el flujo completo.
- Regla de acceso operacional expresada en `canAccessOperationalModules`.

Los datos de demostración se guardan en `localStorage` bajo `ecoroad.commercial.demo.v1`. No hay cobros ni autenticación reales. Para reiniciar el flujo, elimina esa clave desde las herramientas del navegador.

## Límite del contexto

`src/commercial/` sigue la estructura `domain/`, `application/`, `infrastructure/`, `presentation/` del proyecto de referencia. Commercial es dueño de `Company Account` y `Subscription`. La contraseña, las invitaciones, los roles y la sesión pertenecen al futuro contexto IAM. Por eso el formulario solo recoge datos de contacto del administrador.

La activación real deberá confirmarse desde el backend después del pago. El frontend solo mostrará el estado informado por la API; la autorización de proyectos y monitoreo deberá validarse en el backend.

## Pendiente para integrar la API

Se requieren contratos para registrar la cuenta, consultar y seleccionar el plan, consultar el estado de la suscripción y renovarla; además de la definición del proveedor de pagos y la sesión de IAM. Cuando estén disponibles, se sustituirá `commercial-demo-repository.js` por un adaptador HTTP sin cambiar las reglas del dominio ni las vistas.
