# EcoRoad-FrontEnd

SPA de EcoRoad con Vue, Vite y PrimeVue, organizada por bounded contexts.

## Ejecutar

```sh
npm install
npm run dev
```

`npm run dev` inicia Vite y la fake API local. La bandeja de Alerting and Risk Evaluation está en `/alerts`. Usa mediciones y perfiles de riesgo de demostración; permite consultar alertas y registrar su atención. La fake API conserva los cambios durante la ejecución del servidor y los reinicia al detenerlo. Su contrato está en `docs/alerting-api-contract.md`.

Usa `npm test` para las pruebas y `npm run build` para verificar la compilación.
