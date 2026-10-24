# Contexto — MF.cobroup-frontend

Aplicación operativa Angular/PWA. Consume únicamente contratos del backend operativo. La autorización real siempre reside en servidor.

- Ubicación del cliente: GPS voluntario con carga/bloqueo de guardado, resultado y timeout; mapa emergente con pin movible y confirmación/cancelación. Sin coordenadas predeterminadas inventadas. [Decisión vigente](../../../cobroup.md/DECISION_UBICACION_CLIENTES_EDICION_USUARIOS.md).

- Fase 3: shell responsive, sesión multi-organización y lectura de rutas activas autorizadas mediante el backend operativo. La identidad JWT está reabierta para revalidación.
- Roles previstos: `ADMIN`, `SUPERVISOR`, `COLLECTOR`; tenant y rutas proceden de identidad validada.
- Offline: solo shell estático; sin datos privados ni escrituras financieras cacheadas.
- Contratos: [fronteras v1](../contracts/platform-boundaries-v1.md).
- Decisiones: [fundación](../decisions/0001-phase-1-foundation.md) y [sesión JWT](../decisions/0002-jwt-session.md).
- Roadmap: [propuesta](../roadmap/phase-proposal.md).

## Plantillas por rangos y cobro mensual — 2026-10-23

Decisión vigente: [rangos, rutas y mensual](../../../cobroup.md/DECISION_PLANTILLAS_RANGOS_RUTAS.md). Monto/porcentaje mínimo y máximo inclusivos; plantillas publicadas asignadas explícitamente a la ruta del cliente, con validación del servidor. Mensual conserva el día de inicio por meses calendario. Migración administrativa preparada y pendiente de aplicación; no modifica condiciones de préstamos existentes.
