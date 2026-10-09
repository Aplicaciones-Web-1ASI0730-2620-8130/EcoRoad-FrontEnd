# Monitoring Asset and Deployment

Este bounded context administra el inventario de sensores EcoRoad y los puntos de monitoreo donde se despliegan. Los proyectos y tramos pertenecen al contexto Projects; aquí se referencian por identificador y se consulta su catálogo. Las lecturas, alertas y series históricas pertenecen a Environmental Monitoring y Alerting.

## Modelo y reglas

- **Monitoring Point:** proyecto, tramo, nombre, PK y coordenadas. El PK debe estar dentro del tramo y las coordenadas deben ser válidas. Un punto con sensores asignados no se puede mover ni eliminar.
- **Sensor Asset:** código, serie única, tipo, estado y asociación opcional a un punto. Una sola unidad de cada tipo puede ocupar un punto.
- **Ciclo de despliegue:** `available` → asignación → `assigned` → calibración vigente → activación → `active`. La desactivación devuelve el sensor a `assigned`; la liberación lo devuelve a `available` y borra su calibración.
- **Política de reporte:** `canReport` es verdadero solo para sensores activos, asociados a proyecto y punto y con calibración vigente. La reasignación invalida una calibración previa.
- **Acceso:** la fake API requiere empresa y suscripción activa, igual que los demás módulos operativos.

## Frontend

La ruta `/assets` muestra el inventario filtrable, estado de despliegue, un mapa esquemático por PK, detalle del sensor y las acciones de registro, asignación, calibración, activación, desactivación y liberación. También permite crear, editar y eliminar puntos geolocalizados. El mapa representa progresión del corredor por PK; no es cartografía GIS.

Carpetas del contexto:

```text
src/assets/
  domain/           Reglas y transiciones puras
  application/      Estado y comandos de la interfaz
  infrastructure/   Repositorio HTTP y datos de ejemplo
  presentation/     Ruta, vista y estilos
server/fake-asset-api.mjs
```

Los datos de ejemplo viven en memoria mientras se ejecuta el servidor. La API de telemetría actual conserva sus propias lecturas simuladas; una integración posterior debe validar el identificador del sensor y `canReport` en el servicio que acepta mediciones.
