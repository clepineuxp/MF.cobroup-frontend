# MF.cobroup-frontend

PWA operativa de COBROUP para cobradores, supervisores y capacidades operativas del administrador. Fase 1 ofrece shell, rutas base, temas y contratos técnicos; no simula operaciones.

## Requisitos

- Node.js 22.15.1 LTS (`.nvmrc`)
- npm 11.6.2
- Angular 21.2.25 / CLI 21.2.27

```powershell
npm ci
npx ng serve --host=127.0.0.1 --port=4200
npm test -- --watch=false
npm run build
```

El build de producción habilita el service worker. La API operativa se configurará detrás de `/api/operations/v1`; no hay secretos en el frontend.
