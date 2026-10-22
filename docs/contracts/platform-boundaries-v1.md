# Contratos preliminares v1

| Aplicación | Servicio directo | Capacidades futuras | Propietario |
|---|---|---|---|
| Operativa | `MS.Cobroup.Backend` | Clientes, préstamos, cuotas, pagos, evidencias, agenda | Backend operativo |
| Administrativa | `MS.Cobroup.BackendAdmin` | Configuración, rutas, asignaciones, plantillas, aprobaciones | Backend admin |
| Administrativa | Consulta operativa versionada | Mapas, mora, recaudo | Backend operativo/proyección |

El access token JWT aporta `typ=access`, `sub`, `organization_id`, rol y vigencia; permanece solo en memoria. El refresh token es inaccesible a JavaScript y viaja únicamente en cookie segura. La interfaz no acepta éxito hasta confirmación de API. Los errores contienen código, mensaje seguro y `traceId`, sin tokens. No se cachean respuestas autenticadas. Ver `../../../cobroup.md/DECISION_AUTENTICACION_JWT.md`.

Fase 3 consume `GET /api/operations/v1/routes`; el backend decide el alcance por tenant, rol y asignación. La PWA no consulta BackendAdmin directamente ni filtra seguridad solo en cliente.
