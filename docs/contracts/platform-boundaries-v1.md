# Contratos preliminares v1

| Aplicación | Servicio directo | Capacidades futuras | Propietario |
|---|---|---|---|
| Operativa | `MS.Cobroup.Backend` | Clientes, préstamos, cuotas, pagos, evidencias, agenda | Backend operativo |
| Administrativa | `MS.Cobroup.BackendAdmin` | Configuración, rutas, asignaciones, plantillas, aprobaciones | Backend admin |
| Administrativa | Consulta operativa versionada | Mapas, mora, recaudo | Backend operativo/proyección |

Claims futuros: `sub`, `tenant_id`, roles y expiración. La interfaz no acepta éxito hasta confirmación de API. Errores contendrán código, mensaje seguro y `traceId`. No se cachean respuestas autenticadas por defecto.

Fase 3 consume `GET /api/operations/v1/routes`; el backend decide el alcance por tenant, rol y asignación. La PWA no consulta BackendAdmin directamente ni filtra seguridad solo en cliente.
