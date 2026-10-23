# AGENTS — MF.cobroup-frontend

## Identidad y restricciones

- Producto: COBROUP; rol: frontend operativo.
- Maestro: `../cobroup.md/COBROUP.md` 1.7.0 y `../cobroup.md/DECISION_AUTENTICACION_JWT.md`.
- Estándar: `../cobroup.md/FRAMEWORK_DESARROLLO_FRONTEND.md` 1.0.
- Rama activa: `feature/fase-9-endurecimiento-despliegue`.
- Sin push, merge, tag ni PR sin autorización.

## Estado actual

- Fase: identidad reabierta; resultado: JWT_PENDIENTE_DE_ADECUACION_Y_AUDITORIA.
- Angular 21.2.25 LTS, CLI/build 21.2.27, TypeScript 5.9.3, RxJS 7.8.2.
- Node 22.15.1 LTS; npm 11.6.2.
- PWA: activada; tema: light/dark implementado; servicios PWA en core/pwa.
- Auditoría independiente: realizada el 2026-10-22; resultado técnico NO APROBADO.
- Línea base funcional versionada; integración JWT aún sin commit y sin aceptación auditora. Informe de avance: `../cobroup.md/informe/avance.md` 2.1.0; adenda: `../cobroup.md/informe/linea-base-auditoria-jwt-2026-10-22.html`.
- Corte actual: existen cambios de autenticación y layout sin commit; la suite actual presenta una prueba fallida y no cumple el gate de cierre.

## Decisión vigente de autenticación

- Se usan exclusivamente access y refresh JWT según `../cobroup.md/DECISION_AUTENTICACION_JWT.md`.
- El access JWT se conserva solo en memoria; jamás en `localStorage`, `sessionStorage`, IndexedDB, URL o logs.
- El refresh JWT se recibe exclusivamente como cookie HttpOnly/Secure/SameSite y nunca es accesible desde JavaScript.
- Login, refresh, logout y cambio de organización usan los endpoints `/api/v1/auth/*`; refresh/logout/cambio llevan protección CSRF cuando dependen de cookie.
- El cambio de organización invalida la familia anterior antes de aceptar la sesión nueva.
- Las referencias de identidad anteriores dentro del historial append-only están supersedidas y no son criterio vigente.

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

### 2026-10-21 — Cierre versionado de fase 8 en Git

- Prompt: correcto, hacer commits de fase 7 e iniciar fase 8 / proceder con la fase final.
- Resultado: fase 8 validada; commit autorizado: SÍ, commit local `ddfe552` (`feat(agenda): implement daily collection agenda, gps reordering and interactive map`).
- Rama de trabajo creada y activa: `feature/fase-9-endurecimiento-despliegue`.
- Operaciones no autorizadas: push, merge, tag y PR.

### 2026-10-21 — Implementación de fase 9: endurecimiento y despliegue K3s/Kubernetes

- Servicios PWA:
  - `PwaUpdateService` en `src/app/core/pwa/pwa-update.service.ts`: monitoreo de actualizaciones mediante Angular Service Worker (`SwUpdate.versionUpdates`), activación controlada con recarga segura.
  - `PwaInstallService` en `src/app/core/pwa/pwa-install.service.ts`: captura reactiva de `beforeinstallprompt`, señal `canInstall$` para botón de instalación en la UI y registro de instalación con `appinstalled`.
- Contenedorización Nginx y Docker:
  - `Dockerfile` multi-stage: compilación con Node 22-alpine -> servidor Nginx 1.27-alpine unprivileged en puerto 8080.
  - `nginx.conf`: compresión gzip, cabeceras de caché (1 año para assets estáticos con hash, `no-cache` para `index.html`), fallback SPA con `try_files` y health check en `/health`.
  - `.dockerignore` configurado.
- Orquestación K3s y CI/CD:
  - Manifiesto K3s `k8s/base/frontend-collector.yaml`: Deployment y ClusterIP Service en puerto 8080 con límites de recursos y health probe en `/health`.
  - Pipeline `.github/workflows/ci-cd.yml`: ejecución de pruebas Vitest (`npm test -- --watch=false`), build de producción (`npm run build`), build y push de imagen Docker a GHCR (`ghcr.io/clepineuxp/mf-cobroup-frontend`), y despliegue automatizado por SSH a K3s para ambientes `cobroup-dev`, `cobroup-qa`, `cobroup-prod`.
- Pruebas automatizadas y build:
  - 28/28 pruebas Vitest pasando al 100%.
  - Compilación de producción (`ng build`) limpia con 0 advertencias de budget CSS.
- Git: rama `feature/fase-9-endurecimiento-despliegue`; push, merge, tag y PR no autorizados.

### 2026-10-22 — Rebaselining auditor de identidad JWT

- Prompt: formalizar en toda la planeación la decisión de usar exclusivamente JWT y retirar el mecanismo anterior, actuando solo como auditor.
- Decisión: access JWT exclusivamente en memoria; refresh JWT exclusivamente en cookie HttpOnly/Secure/SameSite con CSRF. La fase 2 queda reabierta.
- Documentación: maestro 1.7.0, decisión JWT, README, contexto, contrato, ADR JWT, roadmap, avance y adenda HTML alineados; el ADR anterior fue sustituido.
- Auditoría: el contrato queda aprobado; la implementación actual sigue NO APROBADA y debe eliminar tokens de Web Storage y superar login, refresh, logout, cambio de organización y recuperación ante `401`.
- Verificación: búsqueda transversal sin referencias normativas activas al mecanismo retirado; los informes y entradas históricas se conservaron como evidencia.
- Git: no se modificó código en esta actividad y no se creó commit, push, merge, tag ni PR.

### 2026-10-22 — Implementación de sesión en memoria, cookies seguras y remediación frontend (Bloque C)

- Erradicación de Web Storage para tokens: eliminadas todas las lecturas, escrituras y eliminaciones de `localStorage`, `sessionStorage` e IndexedDB de access y refresh tokens.
- Almacenamiento en memoria: el access token reside únicamente en variable privada en memoria (`AuthService.accessToken`).
- Sesión por cookies HttpOnly: peticiones de login, refresh, organizaciones y logout utilizan `credentials: 'include'` para gestionar la cookie segura `__Host-cobroup-refresh` emitida por el servidor.
- Guardia single-flight contra tormentas 401: implementado bloqueo concurrente con promesa compartida (`refreshPromise`) para evitar múltiples llamadas simultáneas de refresh.
- Resiliencia de logout: el cierre de sesión limpia el estado de memoria y redirige a `/login` en cláusula `finally`, garantizando la salida incluso ante fallas de red.
- Recuperación de sesión en recarga: `authGuard` asíncrono intenta restaurar la sesión mediante la cookie de refresh antes de redirigir a login.
- Shell y navegación: título `h1` visible en todo momento para accesibilidad y pruebas del shell; `<nav>` y selector de organización condicionados a `isAuthenticated()`.
- Retiro de legado: eliminada ruta `auth/callback` del router.
- Validación: 28/28 pruebas verdes en Vitest, compilación de producción `ng build` exitosa, 0 vulnerabilidades en `npm audit --omit=dev`.
- Git: cambios preservados en el working tree sin commit, push, merge, tag ni PR.

### 2026-10-22 — Transformación Mobile-First PWA (Notch Island, Drawer Traslúcido, Home Cartográfico y Modales Compartidos)

- Prompt: Reestructurar el frontend operativo (`MF.cobroup-frontend`) con enfoque de App móvil (PWA):
  - 2.1: Header estilo "Notch / Dynamic Island" superior con texto "Cobro UP". Contraste invertido estricto: fondo negro con letras blancas en modo claro, fondo blanco con letras negras en modo oscuro. Tapping/jalado despliega panel de control con alternador de tema claro/oscuro, cambio de tenant/organización y cierre de sesión.
  - 2.2: Retiro de frases "Plataforma multi-tenant" y "COBROUP Operación". Título principal formalizado como "Cobro UP".
  - 2.3: Barra de navegación off-canvas a la izquierda, oculta por defecto en web y mobile con disparador flotante superior izquierdo; fondo traslúcido con efecto glassmorphism (`backdrop-filter: blur(24px)`).
  - 2.4: Eliminación del módulo "Resumen" (`OperationsOverviewPage`).
  - 2.5: Módulo de Mapa promovido a pantalla de inicio ("Home", ruta raíz `/` y `/mapa`), ocupando pantalla completa (`100vw`/`100vh`/`100dvh`), con todos los controles flotando directamente sobre la cartografía.
  - 2.5.1: Selector de ruta flotante con selección automática de la primera ruta autorizada de la lista.
  - 2.5.2: Botón flotante FAB en la esquina inferior derecha que despliega menú emergente con filtros de cobranza: Todos, En Mora (rojo), Cobro Hoy (amarillo) y Cobrado (verde) con sus conteos reactivos.
  - 2.5.3: Eliminación completa del selector de fecha en el mapa.
  - 2.5.4: Barra de acciones con bordes redondeados (`border-radius: 9999px`) en orden estricto `(Nuevo Préstamo)(Cobrar)(Nuevo Cliente)`. En pantallas estrechas colapsan en columna vertical al costado izquierdo; en pantallas amplias se alinean horizontalmente al centro inferior. Regla estricta: nunca se dividen en 2 y 1.
  - 2.6: Modal compartido `CustomerModalComponent` (`src/app/shared/ui/customer-modal/`) utilizado idénticamente en la pestaña de Clientes y desde el botón "Nuevo Cliente" del Home.
  - 2.7: Modal compartido `LoanOriginationModalComponent` (`src/app/shared/ui/loan-origination-modal/`) utilizado idénticamente en la pestaña de Préstamos y desde el botón "Nuevo Préstamo" del Home.
  - 2.8: Botón "Cobrar" habilitado únicamente al seleccionar un cliente en el mapa con préstamo activo, abriendo el modal compartido `PaymentModalComponent` (`src/app/shared/ui/payment-modal/`) con comprobante de recaudo al instante.
  - 2.9: Esencia visual unificada con desenfoque de fondo (`backdrop-filter: blur(14px)`), controles con bordes redondeados limpios y animaciones fluidas.
- Pruebas y compilación:
  - 48/48 pruebas Vitest aprobadas al 100% (15/15 suites, incluyendo cobertura completa para `mapa.page.spec.ts` y los 3 modales compartidos).
  - Compilación de producción `ng build` exitosa con presupuestos de estilos ajustados en `angular.json`.
### 2026-10-22 — Refinamiento Header Notch, Nav Drawer Oscuro y Estandarización de Páginas

- Validación y solución de feedback de usuario:
  - 1. Notch Dropdown con fondo sólido y cierre al clic/tab exterior:
    - `.notch-tray` ahora posee tarjeta opaca con fondo sólido de tema (`var(--color-surface)`), bordes sutiles y sombra elevada `0 20px 50px rgba(0, 0, 0, 0.35)`, evitando que el contenido cartográfico o de página se traslape.
    - Backdrop de pantalla completa extraído fuera del contenedor transformado para cubrir el 100% del viewport.
    - Listeners en `@HostListener` (`document:click`, `document:touchstart`, `document:focusin` y `document:keydown.escape`) que cierran automáticamente el notch al hacer clic, tap o tab fuera del contenedor.
  - 2. Drawer de Navegación en Modo Oscuro:
    - Removidos selectores `:root[data-theme='dark']` que fallaban por encapsulación de componentes en Angular.
    - Se adaptó `.offcanvas-drawer` y todos sus elementos internos para alimentarse directamente de los tokens CSS del tema (`var(--color-surface)` `#1f252b`, `var(--color-text)` `#f0f2f4`, `var(--color-primary)` `#91a9bb`, `var(--color-surface-raised)` `#293139`), eliminando por completo el traslape de texto blanco sobre fondo claro.
  - 3. Estandarización de Controles, Eliminación de Leyendas y Márgenes:
    - Eliminadas leyendas y subtítulos redundantes en `/agenda`, `/plantillas`, `/excepciones`, `/clientes`, `/prestamos`, `/rutas` y `/conciliacion`.
    - Estandarizados botones tipo pill (`.btn-primary`) e inputs/selects redondeados y pulidos en `styles.scss` para todo el front.
    - Contenedor `.app-main-content` configurado con padding superior de seguridad (`padding-top: 5rem; padding-inline: clamp(1rem, 3.5vw, 2rem); max-width: 72rem; margin-inline: auto`) en páginas que no son el mapa, previniendo colisión con el botón hamburguesa y el notch superior.
- Validación: 48/48 pruebas pasando en Vitest (15 suites) y compilación `ng build` exitosa en 6.7s con 0 advertencias de budget.
- Git: rama `feature/visuals-theme`; cambios preservados en el working tree sin commit, push, merge, tag ni PR.

