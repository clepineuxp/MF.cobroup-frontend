# MF.cobroup-frontend

PWA operativa de COBROUP para cobradores, supervisores y administradores. El acceso usa usuario y contraseña contra la autoridad JWT de BackendAdmin, abre la última organización utilizada y permite cambiar entre membresías activas. Fase 4 incorpora clientes reales por ruta, teléfonos, ubicaciones y captura GPS con alternativa manual; préstamos y cobros siguen fuera de alcance.

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

`npm start` escucha en todas las interfaces mediante `0.0.0.0:5200`. El build de producción habilita el service worker. `proxy.conf.json` dirige `/identity` a la autoridad JWT y `/api` al backend operativo. El gateway de despliegue debe conservar esas rutas bajo el mismo origen.

La pantalla `/rutas` consume `GET /api/operations/v1/routes`. El access token vive exclusivamente en memoria y nunca se escribe en `localStorage`, `sessionStorage`, IndexedDB, URL o logs. El refresh token solo existe en una cookie `HttpOnly`, `Secure` y `SameSite`, inaccesible para JavaScript; las solicitudes que usan la cookie incorporan protección CSRF. Ante `401` se permite un único intento de refresh y luego se devuelve el error. Los datos autenticados no se incorporan al caché PWA. Cambiar de organización revoca la familia anterior y obtiene tokens del tenant seleccionado.

El contrato normativo está en [`DECISION_AUTENTICACION_JWT.md`](../cobroup.md/DECISION_AUTENTICACION_JWT.md). La implementación actual está pendiente de conformidad y nueva auditoría.
