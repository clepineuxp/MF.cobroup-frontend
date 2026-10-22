# AGENTS — MF.cobroup-frontend

## Identidad y restricciones

- Producto: COBROUP; rol: frontend operativo.
- Maestro: `../cobroup.md/COBROUP.md` 1.5.0.
- Estándar: `../cobroup.md/FRAMEWORK_DESARROLLO_FRONTEND.md` 1.0.
- Rama activa: `feature/fase-8-mapas-analitica`.
- Sin push, merge, tag ni PR sin autorización.

## Estado actual

- Fase: 8; resultado: COMPLETADA_FUNCIONALMENTE.
- Angular 21.2.25 LTS, CLI/build 21.2.27, TypeScript 5.9.3, RxJS 7.8.2.
- Node 22.15.1 LTS; npm 11.6.2.
- PWA: activada; tema: light/dark implementado.
- Auditoría independiente: no realizada.
- Línea base: 9 fases totales; 8 completas funcionalmente, 1 posterior pendiente. Informe: `../cobroup.md/informe/avance.md`.
- Corte actual: Fase 7 cerrada en Git (`f547dd0`); Fase 8 completada: agenda diaria de cobro (`/agenda`) con paradas secuenciadas y reordenamiento por GPS (Haversine), mapa interactivo de clientes (`/mapa`) con OpenStreetMap y pines semánticos de estado (mora, vence hoy, al día, sin cuota), componente reutilizable `map-view`, y acción rápida de cobro integrado; build productivo limpio con 0 warnings; 28/28 pruebas Vitest pasando; budget SCSS < 4.00 kB.

## Historial cronológico (append-only)

### 2026-10-21 — Inicialización fase 1

- Prompt: crear PWA operativa independiente sin flujos falsos ni lógica posterior.
- Git: usuario autorizó `feature/fase-1-inicializacion`; commit autorizado: NO.
- Decisiones: PWA ahora; shell estático sin caché de negocio; configuración API `/api/operations/v1`.
- Archivos: Angular base, layout, overview, core/auth/config, shared, themes, manifest, documentación y pruebas.
- Comandos: Angular CLI 21.2.27; instalación inicial con npm 10 falló por `edgesOut`; completada con npm 11.6.2; `ng add @angular/pwa@21.2.27` exitoso.
- Riesgos: `npm audit` reportó 4 vulnerabilidades altas solo en herramientas de desarrollo (`@angular/cli`/MCP SDK y `@angular/build`/Vite); `npm audit --omit=dev` reportó 0. No se aplicó `--force` porque propone cambios incompatibles. Iconos de plantilla pendientes de identidad COBROUP aprobada.
- Verificación final: `npm run build` exitoso (201.26 kB inicial; `ngsw.json` y manifest generados); `npm test -- --watch=false` 4/4; `ng serve` respondió HTTP 200 en `127.0.0.1:4200`; escaneo de residuos/secretos conocidos sin coincidencias.
- Próxima acción: cerrar fase 1 y aprobar identidad/tenant antes de autenticación real.

### 2026-10-21 — Sincronización de nombres backend

- Prompt: alinear nombres locales y remotos de backend con GitHub.
- Cambio: contratos documentales actualizados a `MS.Cobroup.Backend` y `MS.Cobroup.BackendAdmin`.
- Rama: `feature/fase-1-inicializacion`; commit autorizado: NO; sin cambios funcionales.

### 2026-10-21 — Cierre versionado de fase 1

- Prompt: realizar commits de fase 1 y pasar a fase 2.
- Resultado: fase 1 validada; commit autorizado: SÍ, únicamente para el alcance acumulado de fase 1.
- Operaciones no autorizadas: push, merge, tag y PR.
- Siguiente rama prevista: `feature/fase-2-identidad-tenant`.

### 2026-10-21 — Acceso operativo por organización, fase 2

- Implementación: formulario de acceso; sesión antiforgery; OIDC Code + PKCE; callback; tokens solo en memoria; refresh y revocación; guard y proxies locales de identidad/API.
- Validación: build exitoso y pruebas 4/4.
- Integración: autoridad real inicializada con una organización y usuarios `Admin`, `Supervisor` y `Collector`; el flujo OIDC completo se validó por rol.
- Git: commit de cierre de fase 2 autorizado por el usuario; sin push, merge, tag ni PR.

### 2026-10-21 — Inicio de fase 3

- Rama creada para configuración y rutas.
- El primer corte pertenece al backend administrativo. La PWA operativa esperará contratos de consulta de rutas filtrados por asignación antes de exponer navegación o datos.
- Git: sin cambios funcionales de fase 3; push, merge, tag y PR no autorizados.

### 2026-10-21 — Puerto de desarrollo fase 3

- `ng serve` configurado por defecto en `0.0.0.0:5200`; origen local OIDC actualizado a `http://localhost:5200` en la autoridad central.
- Git: cambio sin commit; push, merge, tag y PR no autorizados.

### 2026-10-21 — Usuario global y cambio de organización

- Login reducido a usuario/contraseña; usa la última organización accedida. Si no existe membresía activa, muestra “Solicitar unirme a una organización” sin inventar todavía un flujo de aprobación.
- Selector de organización agregado al shell; al cambiar revoca el refresh token anterior y reinicia Authorization Code + PKCE para obtener claims del nuevo tenant.
- Validación: build exitoso y pruebas 4/4.
- Git: cambios sin commit; fase 3 funcional pausada; push, merge, tag y PR no autorizados.

### 2026-10-21 — Cierre funcional de fase 3

- `/rutas`: muestra únicamente rutas activas autorizadas por el contrato operativo, con rol de acceso y cupos efectivos; contempla carga, vacío y error.
- Seguridad: consume solo `MS.Cobroup.Backend`, mantiene token en memoria y reintenta una vez tras refresh ante `401`; no cachea datos de negocio.
- Validación: build de producción exitoso; 5/5 pruebas de shell, tema y rutas.
- Git: cambios de fase 3 sin commit; push, merge, tag y PR no autorizados.

### 2026-10-21 — Cierre funcional de fase 4

- `/clientes`: listado, búsqueda, filtro por ruta, alta y edición con 1–6 teléfonos y 1–4 ubicaciones; principal única y captura GPS voluntaria con alternativa manual.
- Seguridad: rutas disponibles proceden del alcance autenticado; el tenant no viaja en comandos y traslado/estado permanecen restringidos por servidor.
- Validación: build productivo exitoso y 8/8 pruebas.
- Git: commit de fase 4 autorizado; push, merge, tag y PR permanecen prohibidos.

### 2026-10-21 — Inicio de fase 5: catálogo operativo

- Rama: `feature/fase-5-plantillas-excepciones`; fase 4 ya comprometida al iniciar.
- Interfaz: nueva pantalla `/plantillas` de solo lectura con límites, clasificación, versión y porcentajes de las plantillas publicadas para el tenant activo.
- Seguridad: consume exclusivamente la fachada operativa y no envía tenant; la pantalla aclara que la originación pertenece a fase 6.
- Validación: build productivo exitoso y 8/8 pruebas existentes.
- Pendiente de fase: formulario de solicitud excepcional ligado a cliente visible.
- Git: cambios de fase 5 sin commit; push, merge, tag y PR no autorizados.

### 2026-10-21 — Cierre funcional de fase 5: solicitudes operativas de excepción

- Interfaz: nueva pantalla `/excepciones` con formulario de solicitud para clientes activos de rutas asignadas (monto, plazo, tasa y justificación) y listado de solicitudes propias con estado y notas de respuesta.
- Cancelación: acción para cancelar solicitudes propias en estado `Pending` directamente desde la interfaz.
- Navegación: incorporada la ruta protegida `/excepciones` con título de página y enlace en la barra principal.
- Validación: build de producción limpio con 0 warnings y 0 errores; 10/10 pruebas ejecutadas y aprobadas en Vitest.
- Git: commit de fase 5 autorizado por el usuario: `674e62b` (`feat(loan-exceptions): implement operative loan exception request flow and cancellation`); push, merge, tag y PR permanecen prohibidos.

### 2026-10-21 — Cierre funcional de fase 6: originación y cronograma de préstamos

- Modelos y servicios:
  - `LoanDetails`, `LoanSearchItem`, `CalculatedSchedule`, `OriginateLoanRequest`, `SchedulePreviewRequest` en `loan.models.ts`.
  - `LoansService`: métodos `search`, `get`, `listByCustomer`, `previewSchedule` y `originate` consumiendo `/api/operations/v1/loans`.
- Experiencia de usuario y vistas:
  - Módulo `/prestamos`: listado reactivo de cartera con filtros por ruta y estado (`Active`, `PaidOff`, `Cancelled`), métricas de principal, tasa y saldo.
  - Modal interactivo de originación: selección de cliente de ruta, modo plantilla vs modo excepción aprobada, periodicidad, plazo y cálculo reactivo en vivo (`previewSchedule`).
  - Modal de inspección de cronograma: tabla completa de cuotas con fecha de vencimiento, monto esperado y pagado, y estado (`Pending`, `PartiallyPaid`, `Paid`).
  - Navegación: enlace en `main-layout.component.html` y ruta `/prestamos` en `app.routes.ts`.
- Estilos y rendimiento:
  - `loans.page.scss` optimizado a 3.8 kB, cumpliendo el presupuesto estricto de Angular (< 4.00 kB).
- Validación:
  - 17/17 pruebas Vitest pasando en verde (incluyendo pruebas unitarias para `LoansService` y `LoansPage`).
  - Build de producción generado con 0 advertencias y 0 errores (`ng build`).
- Git: commit local `762847f` (`feat(loans): implement operative loan origination and schedule inspection`) en rama `feature/fase-6-prestamos-cronograma`; push, merge, tag y PR no autorizados.

### 2026-10-21 — Cierre funcional de fase 7: pagos, evidencias y conciliación

- Modelos y servicios:
  - `PaymentDetails`, `PaymentAllocationItem`, `PaymentEvidenceItem`, `DailyReconciliationReport`, `RegisterPaymentRequest` en `payment.models.ts`.
  - `PaymentsService`: integración completa de `getPaymentMethods`, `registerPayment`, `listByLoan`, `getDailyReconciliation`, `attachEvidence`, `deleteEvidence` consumiendo `/api/operations/v1/payments`.
- Experiencia de usuario y vistas:
  - Modal de cobro en `/prestamos`: botón "Cobrar" en cada préstamo activo, cálculo reactivo en vivo de imputación en cascada sobre cuotas pendientes (AC-11), selector de medios de pago activos (AC-13), adjunto opcional de fotografía de soporte (AC-14), clave de idempotencia UUID (AC-12), y comprobante de recaudo generado al instante.
  - Pestaña de historial de pagos en el detalle del préstamo con desglose por cuota y fotos de evidencia.
  - Pantalla `/conciliacion`: selector de ruta y fecha de recaudo, tarjetas KPI (Total Recaudado, Pagos, Medios), desglose tabular por medio con porcentaje y barra de progreso (AC-17).
  - Navegación: enlace `/conciliacion` agregado en la barra superior y footer actualizado a Fase 7.
- Rendimiento, temas y presupuestos:
  - Estilos refactorizados con estricto uso de tokens semánticos `var(--color-...)` de `src/app/themes/`, eliminando códigos hexadecimales arbitrarios.
  - `loans.page.scss` optimizado a 3.8 kB y `reconciliation.page.scss` a 2.4 kB, cumpliendo el presupuesto estricto de Angular (< 4.00 kB) con 0 advertencias.
- Validación de arquitectura: cumplimiento estricto de FRAMEWORK_DESARROLLO_FRONTEND 1.0 (feature-based, contratos tipados en data-access, componentes desacoplados de HTTP, tema claro inicial con Dark toggle funcional y PWA compatible).
- Validación de suites:
  - 25/25 pruebas Vitest pasando en verde (incluyendo `PaymentsService`, `LoansPage` y `ReconciliationPage`).
  - Build de producción generado con 0 advertencias y 0 errores (`ng build`).
- Git: rama `feature/fase-7-pagos-conciliacion`; push, merge, tag y PR no autorizados.

### 2026-10-21 — Cierre versionado de fase 7 en Git

- Prompt: correcto, hacer commits de fase 7 e iniciar fase 8.
- Resultado: fase 7 validada; commit autorizado: SÍ, commit local `f547dd0` (`feat(payments): implement live payment modal, evidence capture and daily reconciliation view`).
- Rama de trabajo creada y activa: `feature/fase-8-mapas-analitica`.
- Operaciones no autorizadas: push, merge, tag y PR.

### 2026-10-21 — Implementación de fase 8: mapas, georreferenciación y analítica

- Componente UI reutilizable:
  - `src/app/shared/ui/map-view/map-view.component.ts`, `.html`, `.scss`: componente standalone con renderizado de mosaicos OpenStreetMap, marcadores interactivos codificados por color según estado (rojo mora, amarillo vence hoy, verde al día/cobrado, azul sin cuota) y popups con información de cuota y saldo.
- Modelos y servicios:
  - `agenda.models.ts` y `agenda.service.ts`: integración de `getDailyAgenda`, `optimizeRoute` y `getMapLocations` consumiendo `/api/operations/v1/agenda`.
- Páginas y experiencia de usuario:
  - `/agenda` (`agenda.page.ts`): resumen de paradas del día, saldo por cobrar, clientes en mora y pagos completados; lista de paradas ordenadas; botón "Reordenar por GPS" usando la geolocalización del navegador y optimización voraz; botón de cobro rápido con apertura automática del modal de pago pre-cargado con el cliente.
  - `/mapa` (`mapa.page.ts`): visualización cartográfica completa de los clientes de la ruta con panel de detalle reactivo.
  - Navegación: enlaces agregados en `main-layout.component.html` y rutas en `app.routes.ts`.
- Estilos, temas y presupuestos:
  - SCSS desacoplado con tokens semánticos (`var(--color-...)`); presupuesto de estilos < 4.00 kB cumplido con 0 advertencias.
- Validación de arquitectura: cumplimiento estricto de FRAMEWORK_DESARROLLO_FRONTEND 1.0 (feature-based, componentes comunes en `shared/ui`, servicios HTTP dedicados).
- Validación de suites:
  - 28/28 pruebas Vitest pasando en verde (incluyendo 3 pruebas para `AgendaService`).
  - Build de producción generado con 0 advertencias y 0 errores (`ng build`).
- Git: rama `feature/fase-8-mapas-analitica`; push, merge, tag y PR no autorizados.
