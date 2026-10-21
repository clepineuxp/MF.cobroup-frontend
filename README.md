# MF.cobroup-frontend

PWA operativa de COBROUP para cobradores, supervisores y administradores. Fase 2 incorpora acceso por organización y usuario, Authorization Code + PKCE, callback, refresh rotatorio en memoria y logout con revocación; no simula operaciones.

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

El build de producción habilita el service worker. `proxy.conf.json` dirige `/identity` a la autoridad y `/api` al backend operativo. El gateway de despliegue debe conservar esas rutas bajo el mismo origen. Los tokens no se persisten en almacenamiento del navegador.
