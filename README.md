# EcoRoad FrontEnd

Aplicación Vue con PrimeVue para gestión ambiental de proyectos viales. Los módulos se organizan por bounded context: Commercial, Projects, Environmental Monitoring, Alerting and Risk Evaluation y Monitoring Asset and Deployment.

## Ejecución local

```bash
npm install
npm run dev
```

`npm run dev` inicia Vite y la fake API local. Abre la dirección indicada por Vite y visita `/assets` para administrar sensores y puntos. La empresa de demostración tiene una suscripción activa; los datos de la fake API se reinician al detener el servidor.

```bash
npm test
npm run build
```

Consulta [el contexto de activos](docs/assets-context.md) y [el contrato de su fake API](docs/assets-api-contract.md) para el modelo y sus flujos.
