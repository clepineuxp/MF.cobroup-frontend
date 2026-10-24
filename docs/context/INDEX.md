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


## Actualización PWA y estilo administrativo — 2026-10-23

Rama feature/update-pwa. Ambas aplicaciones notifican versiones descargadas con diálogo Actualizar ahora / Más tarde; recarga completa confirmada, búsqueda al estabilizar, cada 15 minutos, al recuperar foco/conexión y manual desde el panel superior. Sin caché de respuestas de negocio. Administración adopta navegación flotante, tarjetas y controles coherentes con operación; header operativo unido al borde al abrirse. Evidencias, pruebas y límites en AGENTS.md y [decisión de actualización](../../../cobroup.md/DECISION_ACTUALIZACION_PWA.md).


## Tarjetas de préstamos sin desbordamiento — 2026-10-23

Rama feature/loan-card-overflow desde dev. Distribución explícita de métricas, saldo en fila completa y acciones que ajustan línea; valores largos se conservan completos. Build y 4 pruebas dirigidas correctos. Evidencias y límites en AGENTS.md.

## Condiciones de préstamo manuales — 2026-10-24

Al elegir plantilla en Nuevo Préstamo no se autocompletan monto, interés ni cuotas. Se preservan valores escritos manualmente, se limpia la simulación y los campos siguen obligatorios/editables con límites de plantilla validados al guardar. Evidencias y alcance en AGENTS.md. Cambio pendiente de commit; corrección previa de tarjetas versionada en 6954e14.

## Cliente buscable en originación — 2026-10-24

Nuevo Préstamo incorpora combobox accesible que filtra al escribir y consulta el endpoint existente con debounce. Selección por clic/teclado y validación por ID real; cambiar texto limpia cliente/plantilla/excepción previos. Conserva captura manual de condiciones. 15 pruebas dirigidas y build correctos; navegador con fixtures locales. Detalle y límites en AGENTS.md. Ajuste previo de condiciones versionado en 4624fbd; buscador sin commit.

## Nombre completo y Alias Cliente — 2026-10-24

Modal de creación/edición de clientes: un único campo Nombre completo y etiqueta Alias Cliente. Se conservan campos técnicos de la API, datos anteriores y separación original del nombre al guardar sin cambios. Se mantiene validación de nombre/apellido del contrato vigente. 16 pruebas dirigidas y build aprobados; alcance y límites en AGENTS.md. Buscador previo versionado en 09929b4; este cambio pendiente de commit.
