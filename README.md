# MF.cobroup-frontend

PWA operativa de COBROUP para cobradores, supervisores y administradores. El acceso usa usuario y contraseña, abre la última organización utilizada y permite cambiar entre membresías activas. Conserva Authorization Code + PKCE, refresh rotatorio en memoria y logout con revocación; no simula operaciones.

## Requisitos

- Node.js 22.15.1 LTS (`.nvmrc`)
- npm 11.6.2
- Angular 21.2.25 / CLI 21.2.27

```powershell
npm ci
npm start
npm test -- --watch=false
npm run build
```

`npm start` escucha en todas las interfaces mediante `0.0.0.0:5200`; el origen local para navegador y OIDC es `http://localhost:5200`. El build de producción habilita el service worker. `proxy.conf.json` dirige `/identity` a la autoridad y `/api` al backend operativo. El gateway de despliegue debe conservar esas rutas bajo el mismo origen. Los tokens no se persisten en almacenamiento del navegador.
