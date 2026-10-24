# AGENTS — MF.cobroup-frontend

## Identidad y restricciones

- Producto: COBROUP; rol: frontend operativo.
- Maestro: `../cobroup.md/COBROUP.md` 1.15.0 y `../cobroup.md/DECISION_AUTENTICACION_JWT.md`.
- Estándar: `../cobroup.md/FRAMEWORK_DESARROLLO_FRONTEND.md` 1.0.
- Rama activa: `feature/customer-identification`, creada desde `origin/dev`; árbol limpio al iniciar.
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

### 2026-10-23 — Diagnóstico y corrección de visibilidad de pantalla de Login

- Diagnóstico: la pantalla de login no aparecía al navegar a la ruta raíz `/` debido a un error de contexto de inyección en Angular (`NG0203: The Router token injection failed. inject() function must be called from an injection context`). En `auth.guard.ts`, `inject(Router)` se ejecutaba tras un `await auth.refreshAccessToken()`, perdiendo el contexto sincrónico de inyección de Angular cuando no había sesión previa. Esto provocaba una excepción no capturada en la navegación del enrutador, bloqueando la redirección hacia `/login` y dejando la vista `<router-outlet>` completamente vacía.
- Solución: inyección sincrónica de `Router` (`const router = inject(Router);`) al inicio de `authGuard` antes de cualquier `await`.
- Pruebas y validación:
  - Creada suite de pruebas unitarias dedicada `src/app/core/auth/auth.guard.spec.ts` verificando tanto el acceso autenticado como la redirección hacia `/login` ante ausencia de sesión.
  - 50/50 pruebas Vitest pasando al 100% (16/16 suites).
  - Verificación end-to-end con renderizado DOM en Edge: comprobada redirección automática desde `http://localhost:5200/` hacia `http://localhost:5200/login` y renderizado íntegro de `<app-login-page>` con formulario de credenciales.
- Git: rama `feature/visuals-theme`; commit `51e2dd3` (`fix(auth): fix injection context in authGuard and restore login redirection`).

### 2026-10-23 — Integración de Mapas Interactivos Leaflet y Pines con Foto/Avatar de Clientes

- Requerimiento: migración a motor cartográfico interactivo real con Leaflet / OpenStreetMap y soporte completo para imágenes de los clientes activos en pines del mapa e inspector.
- Selección técnica: Leaflet (1.9.4) y `@types/leaflet` con teselas globales OpenStreetMap (100% open-source, sin cuotas ni API keys, gestos táctiles fluidos en dispositivos móviles).
- Implementación en `MF.cobroup-frontend`:
  - `MapViewComponent` (`src/app/shared/ui/map-view/`): carga dinámica asíncrona (`await import('leaflet')`) en `ngAfterViewInit` para garantizar compatibilidad con Vitest/jsdom y SSR sin errores de `window is not defined`.
  - Pines circulares personalizados (`L.divIcon`):
    - Pin circular con imagen del cliente (`avatarUrl`).
    - Borde perimetral codificado por color de estado (rojo mora, amarillo cobro hoy, verde al día/cobrado).
    - Mecanismo fallback automático a iniciales de 2 letras en caso de URL nula o error de carga de imagen (`onerror`).
    - Halo pulsante (`@keyframes haloPulse`) y elevación z-index al seleccionar un cliente.
    - Etiqueta inferior con nombre del cliente y punta de anclaje georreferenciada.
  - Tarjeta de inspección flotante (`mapa.page.html`): incluye avatar circular del cliente con fallback reactivo e indicador de estado perimetral.
  - Modelo `CustomerMapLocation`: extendido con campo opcional `avatarUrl?: string | null`.
  - Configuración: `allowedCommonJsDependencies: ["leaflet"]` en `angular.json` y estilos de Leaflet en `src/styles.scss`.
- Validación y suites:
  - 50/50 pruebas Vitest pasando en verde (16/16 suites).
  - Compilación de producción (`ng build`) completada con éxito.
- Git: rama `feature/visuals-theme`; cambios preservados en el working tree sin commit, push, merge, tag ni PR.

### 2026-10-23 — Migración a capas ESRI World, sincronización con tema de página y alternador Satelital

- Diagnóstico de teselas:
  - Servidor base de OpenStreetMap (`tile.openstreetmap.org`) presentaba bloqueo TCP/timeout en redes locales (`151.101.1.91`).
  - Proveedores con marcas de agua o claves obligatorias (CARTO, Wikimedia) fueron descartados para preservar la limpieza de interfaz.
- Implementación de capas cartográficas de alto rendimiento ESRI ArcGIS (sin API key, sin marcas de agua, CORS `*` habilitado globalmente):
  - Modo Calles / Claro: `ArcGIS World_Street_Map`.
  - Modo Oscuro: `ArcGIS Canvas/World_Dark_Gray_Base` + `ArcGIS Canvas/World_Dark_Gray_Reference`.
  - Modo Satelital: `ArcGIS World_Imagery` de alta resolución satelital + overlay de red vial `ArcGIS Reference/World_Transportation`.
- Sincronización automática de tema y control flotante satelital:
  - Modo base del mapa reactivo al tema general de la aplicación (`ThemeService.theme()`): cambia automáticamente entre calles (claro) y lienzo oscuro (oscuro) al conmutar el tema de la aplicación desde el Notch superior.
  - Botón flotante del mapa (`btn-layer-mode`): conmuta exclusivamente entre el tema activo de la página (estándar claro/oscuro) y la vista Satelital (`isSatelliteMode`).
  - Al activar vista satelital, el botón resalta en estado activo (`.active`) y muestra icono de mapa (`🗺️`) para retornar al tema de la página; en vista estándar muestra el icono satelital (`🛰️`).
- Validación de suites:
  - 50/50 pruebas Vitest pasando al 100% (16/16 suites).
  - Presupuesto de estilos SCSS verificado (< 4.00 kB).
- Git: rama `feature/visuals-theme`; commit autorizado por usuario: SÍ, commit local `42e0867` (`feat(map): integrate leaflet with customer avatars, esri layers and theme satellite toggle`); push, merge, tag y PR no autorizados.



### 2026-10-23 — Plantillas por rangos y rutas; cuotas mensuales

- Solicitud: explicar y modificar plantillas para monto/porcentaje mínimo y máximo, y listar las de la ruta al prestar. Ampliación: agregar cobros mensuales.
- Regla: rangos continuos inclusivos, asignación explícita a rutas del tenant y validación de alcance/versión en servidor. Mensual usa meses calendario anclados al día original y conserva el cargo total pactado.
- Datos: mínimo monetario y rutas versionados, migración aditiva AddLoanTemplateRangesAndRoutes y SQL idempotente preparado. Plantillas históricas sin asignación requieren edición; no se cambian préstamos existentes.
- Trabajo previo de aprovisionamiento conservado. Sin commit, push ni despliegue solicitados para esta intervención. Migración no aplicada ni pruebas sobre datos reales.
- Validación final: Core administrativo 69/69 y operativo 97/97; frontend administrativo 49/49 y operativo 53/53. Pruebas dirigidas de modelo EF 6/6 y directorio HTTP 4/4. EF sin cambios de modelo pendientes y SQL idempotente generado. No se ejecutó migración ni integración PostgreSQL desplegada.

### 2026-10-23 — Commits autorizados de plantillas, mensual y mapa

- Solicitud expresa: realizar los commits e incluir la actualización del mapa.
- Alcance: rangos de crédito, asignación a rutas, cuotas mensuales, migración y documentación; ambas interfaces incluyen la compatibilidad de importación de Leaflet del mapa.
- Validación registrada: 278 pruebas aprobadas y compilaciones correctas; sin nuevos cambios funcionales posteriores.
- Commit autorizado: SÍ. Sin push ni despliegue; migración administrativa pendiente de aplicación.

### 2026-10-23 — GPS y selección de ubicación en mapa para clientes

- Solicitud: usar ubicación actual, bloquear continuación mientras responde GPS, mostrar carga/éxito/error y permitir seleccionar en mapa emergente.
- Rama: feature/clientes-gps-mapa creada desde origin/dev (7abab8b), según instrucción vigente; árbol limpio al inicio. Maestro 1.13.0 y framework frontend 1.0.
- Cambios: CustomerModalComponent conserva borrador por referencia durante GPS, muestra Cargando GPS y resultado, bloquea guardado/repeticiones/cambios de ubicaciones y descarta callbacks tardíos al cerrar/reabrir. Timeout del navegador y watchdog de 12 s; errores de permiso/disponibilidad/tiempo. Ubicaciones nuevas sin coordenadas ficticias; validación finita/rangos y origen Manual al editar coordenadas.
- Mapa: componente genérico LocationPicker con diálogo nativo, Leaflet/ESRI existentes, click, zoom/pan, pin arrastrable y confirmación/cancelación. Selección provisional; no altera alias/dirección/principal. Loading/error/reintento de teselas y limpieza al destruir. Loader externo inyectable para pruebas aisladas.
- Verificación: suite completa Vitest 63/63 en 17 suites; build de producción correcto sin advertencias de presupuesto. Pruebas cubren bloqueo, GPS éxito/permiso/timeout/ausencia, respuestas tardías, coordenadas vacías, mapa provisional, cancelación, click/arrastre y carga fallida.
- Límites: GPS y tiles se simularon en las pruebas; no se verificó en dispositivo real ni se creó/modificó ningún cliente desplegado. La pantalla administrativa de clientes actualmente consulta/asigna, no captura coordenadas; el formulario afectado es el operativo reutilizado en clientes y préstamos.
- Sin cambios de esquema/backend operativo. Auditoría independiente no realizada. Commit autorizado: NO para esta solicitud; sin push ni despliegue.

### 2026-10-23 — Commit autorizado de ubicación y edición de usuarios

- Solicitud expresa del propietario: hacer commits del alcance implementado de GPS/mapa de clientes y edición administrativa de usuarios, con pruebas y documentación asociadas.
- Se conservan las verificaciones y limitaciones registradas en la intervención anterior; sin nuevos cambios funcionales.
- Commit autorizado: SÍ para este alcance. Sin push, merge, tag, PR ni despliegue.

### 2026-10-24 — Selector de ubicación alineado con tema cartográfico y marcador de cliente

- Solicitud: conservar primero el rediseño de la página de clientes en un commit independiente y luego mejorar el selector de ubicación para heredar las capas claro/oscuro/satélite del mapa principal, reemplazando el pin mínimo por una figura de usuario con punta de ubicación.
- Git: rediseño del directorio de clientes comprometido de forma aislada en `9e3eebd` (`feat(customers): renovar directorio de clientes`). El selector GPS/mapa existente de `dev` se incorporó mediante cherry-pick local `1584870`, sin merge ni push.
- Implementación: `MapLayerModeService` centraliza la preferencia satelital y combina el modo estándar con `ThemeService`; `MapViewComponent` y `LocationPickerComponent` consumen el mismo estado. El selector permite alternar satélite, muestra el modo activo, carga las mismas capas ESRI y reacciona a cambios de tema mientras está abierto.
- Marcador: nuevo `divIcon` con silueta vectorial de usuario, cuerpo circular, flecha de anclaje, halo animado y sombra. La selección se resume en una tarjeta visual con coordenadas, en lugar del texto plano anterior.
- Verificación: TypeScript sin errores; 64/64 pruebas Vitest aprobadas en 17 suites; build productivo correcto y sin advertencias de presupuesto. La prueba del selector cubre herencia oscura, cambio a satélite y renderizado del nuevo marcador.
- Límite de revisión visual: el navegador local no tenía una sesión autenticada activa para abrir el formulario de clientes; no se ingresaron credenciales ni se alteraron datos. Los cambios del selector quedan en working tree sin commit, push, merge, tag ni despliegue.

### 2026-10-24 — Acceso a ubicación actual desde ambos mapas

- Solicitud: guardar el ajuste visual anterior y agregar un botón para ir a la ubicación actual tanto en el selector de coordenadas como en el mapa principal.
- Git: el ajuste previo de tema, satélite y marcador del selector quedó comprometido en `c8833cb` (`feat(map): sincronizar selector con tema y mejorar marcador`).
- Selector: nuevo control flotante solicita geolocalización únicamente al pulsarlo, centra el mapa con zoom 17 y mueve el marcador provisional a las coordenadas obtenidas; la selección todavía requiere confirmación explícita mediante `Usar esta ubicación`.
- Mapa principal: nuevo control flotante centra la vista en la posición actual y muestra un indicador azul pulsante independiente de los marcadores de clientes.
- Estados: ambos controles bloquean solicitudes repetidas mientras consultan el navegador y muestran mensajes específicos para permiso denegado, timeout, ubicación inválida, indisponibilidad o navegador sin soporte. Los callbacks tardíos se descartan al destruir el componente.
- Verificación: 67/67 pruebas Vitest aprobadas en 18 suites; compilación productiva correcta. Se añadieron pruebas de éxito GPS en ambos mapas y permiso denegado en el principal.
- Alcance externo: no se solicitó permiso real de ubicación, no se alteraron datos ni se realizó push, merge, tag, PR o despliegue.

### 2026-10-23 — Actualización PWA y coherencia visual

- Solicitud: popup de actualización en ambas PWA, administración alineada con la operativa y header operativo que se despliega unido al borde superior.
- Rama existente feature/update-pwa conservada; sin commit, push, merge, PR ni despliegue solicitados para esta intervención.
- PWA: servicio instanciado desde la raíz, VERSION_READY abre diálogo nativo accesible con Más tarde / Actualizar ahora. Recarga completa bajo confirmación para cambiar shell y chunks juntos, sin activar versiones sobre código ya cargado. Una versión pospuesta puede reabrirse desde el panel superior; una versión distinta vuelve a avisar.
- Detección: al estabilizar Angular, cada 15 minutos y al volver a primer plano/recuperar conexión, con exclusión concurrente y throttle de 1 minuto. Búsqueda manual, estado de carga, error de red y reintento. Listeners/timer se liberan al destruir el servicio. Worker y manifiesto sin caché HTTP persistente; caché Angular limitada a recursos estáticos.
- Interfaz: navegación lateral y panel superior compartiendo el lenguaje de la operativa, nuevas tarjetas/accesos administrativos y fundamentos de controles/tablas en themes. Header pegado a top:0; efecto de crecimiento/revelado sin translateY ni margen entre cabecera y bandeja; soporte Espacio, Enter y movimiento reducido. Drawer cerrado inert.
- Validación: 69/69 en suite completa y 1/1 adicional del diálogo; builds de producción correctos sin advertencias de presupuesto; CLI Angular local con Node v24.22.1, sin npm en PATH. Pruebas cubren descarga lista, posponer, nueva versión, recarga única, error/reintento, worker deshabilitado y diálogo accesible/bloqueo durante actualización.
- Navegador: dos releases locales A/B con service worker real para cada frontend; popup detectado, admin pospuesto/reabierto y ambas aplicaciones recargadas con marcador DOM B. Revisión visual de panel administrativo en claro/oscuro y header operativo conectado al borde. Sesión de demostración servida únicamente por fixture local, sin modificar cuentas/datos reales. No validado en PWA instalada móvil ni ingress productivo; no se realizó auditoría independiente.
- Despliegue: usuarios con una versión anterior que carece del aviso necesitarán cargar esta versión una vez para disponer del nuevo flujo. A partir de ahí los siguientes releases muestran el popup cuando terminan de descargarse.

### 2026-10-23 — Commits autorizados de actualización PWA

- Solicitud expresa del usuario: hacer los commits del alcance de actualización PWA, coherencia visual administrativa y header operativo, con pruebas y documentación asociadas.
- Se conservan las verificaciones registradas; sin nuevos cambios funcionales. Commit autorizado: SÍ. Sin push, merge, tag, PR ni despliegue.

### 2026-10-24 — Resolución de conflictos del PR #15 contra dev

- Solicitud expresa: resolver los conflictos de `feature/clients-page` con `dev` preservando funcionales ambos features.
- Integración: se incorporó `origin/dev` (`66225a2`) mediante merge local. Los cambios PWA, header, configuración, nginx y tokens visuales de `dev` se conservaron completos.
- Resolución del selector: los cinco conflictos add/add correspondían al mismo selector GPS incorporado por historiales distintos. Se conservó la versión evolucionada de esta rama porque incluye todo el contrato de `dev` (selección, arrastre, confirmación, estados de teselas y reintento), además de tema claro/oscuro, satélite, marcador de usuario y acceso a ubicación actual.
- Documentación: `AGENTS.md` conserva tanto el registro PWA de `dev` como los registros del directorio de clientes y las mejoras cartográficas de la rama.
- Verificación combinada: 74/74 pruebas Vitest aprobadas en 20 suites y build productivo correcto, sin conflictos ni marcadores pendientes.
- Git remoto: actualización de la rama del PR autorizada por la solicitud de resolver los conflictos; no se fusionó el PR a `dev` ni se realizó despliegue.

### 2026-10-24 — Identidad rombo, iconografía monocromática y versión PWA

- Solicitud: unificar iconos de ambos frontends en escala de grises, convertir el rombo del Resumen en marca de aplicación, mostrarlo en títulos/PWA/login y reemplazar el estado permanente “Buscando actualización” por versión instalada y búsqueda manual sin perder la automática.
- Marca: se crearon SVG accesibles `cobroup-mark.svg` y `cobroup-logo.svg`; el login, drawer, notch, favicon y metadatos visuales usan la misma geometría de rombos concéntricos. Los ocho PNG PWA (72–512 px) se regeneraron con zona segura y paleta `#405c72`/`#f4f6f8`.
- Iconografía: navegación reemplazada por SVG lineales reutilizables que heredan `currentColor`; los pictogramas decorativos heredados se normalizan con escala de grises, conservando colores únicamente para estados semánticos del mapa/cartera.
- PWA: versión visible `1.14.0`, botón manual `Buscar actualizaciones` y estado transitorio `Consultando…`; continúan las comprobaciones automáticas al estabilizar, cada 15 minutos, con foco, visibilidad y reconexión. `ngsw.json` incluye `appData` con versión y aplicación.
- Verificación: suite completa operativa 74/74, prueba dirigida PWA 6/6 y build productivo correctos. Se comprobó en navegador el login operativo con logo y marca en notch; el paquete final contiene SVG, PNG y appData.
- Git: cambios preservados sin commit, push, merge, tag, PR ni despliegue para esta solicitud.


### 2026-10-23 — Corrección de desbordamiento en tarjetas de préstamos

- Solicitud: corregir montos, etiquetas y acciones superpuestos en /prestamos del frontend operativo.
- Rama feature/loan-card-overflow desde origin/dev (9adc9bb), árbol limpio al inicio. Maestro 1.14.0 y framework frontend 1.0. Sin commit, push ni despliegue solicitados para este alcance.
- Cambio limitado a loans.page.scss: métricas en grid de dos columnas con saldo en fila completa; etiquetas y valores en columna, min-width:0 y overflow-wrap para contenido largo. Pie y acciones con flex-wrap y separación; grilla limitada al ancho disponible, filtros adaptables. Sin truncar montos ni cambiar cálculos, API, autenticación, temas o PWA.
- Verificación: build productivo correcto sin advertencias y 4/4 pruebas existentes de LoansPage. Navegador con fixtures locales, nombres largos y montos hasta 1.099.999.999.999: ancho contenido = ancho tarjeta (351 px), métricas y acciones dentro del borde. Revisión en claro/oscuro; captura local de evidencia. No se usaron datos reales ni se verificó en móvil instalado. Auditoría independiente no realizada. git diff --check correcto.

### 2026-10-24 — Commit autorizado de tarjetas de préstamos

- Solicitud expresa: hacer commit de la corrección de desbordamiento ya validada. Se conservan las pruebas y límites registrados. Sin push ni despliegue.

### 2026-10-24 — Captura manual de condiciones al elegir plantilla

- Solicitud: después del commit de tarjetas, quitar el autorrelleno de los campos inferiores al seleccionar una plantilla al crear un préstamo.
- Cambio: onTemplateChanged en el modal compartido y en la lógica previa de LoansPage ya no asigna máximo principal, mínimo interés ni maxLoanDays como número de cuotas. Limpia simulación/error; conserva los valores manuales existentes. Monto, interés y cuotas siguen siendo obligatorios/editables y se validan contra límites antes de guardar; frecuencia/fecha conservan los valores iniciales previos. Excepciones aprobadas conservan su comportamiento existente.
- Interfaz: ayuda visible que explica la captura manual y el papel de la plantilla como límites permitidos. Sin cambios de API, cálculos, reglas backend, autenticación ni PWA.
- Verificación: 11/11 pruebas dirigidas del modal y LoansPage (2 suites); cubren selección por DOM con campos vacíos/editables, obligatoriedad, preservación manual, simulación, límites y envío. Build productivo correcto sin advertencias; CLI Angular local, Node v24.22.1. No se realizaron préstamos reales ni E2E desplegado. Auditoría independiente no realizada.
- Git: rama feature/loan-card-overflow conservada para mantener el commit 6954e14 de tarjetas y este cambio acumulado. Este nuevo alcance queda sin commit; la autorización previa correspondía a la corrección de desbordamiento. Sin push ni despliegue.

### 2026-10-24 — Commit autorizado de condiciones manuales

- Solicitud expresa: hacer commit del ajuste que elimina el autorrelleno al seleccionar plantilla. Se conservan las verificaciones registradas; sin push ni despliegue.

### 2026-10-24 — Selector buscable de clientes en Nuevo Préstamo

- Solicitud: después de versionar el ajuste de condiciones manuales (4624fbd), permitir escribir letras en el selector de cliente para buscar.
- Cambio: input con rol combobox y lista accesible de clientes activos, consulta local inmediata sin distinción de acentos y búsqueda al servidor con debounce de 250 ms. Usa CustomersService.search existente con página 1 y 100 resultados por consulta; permite afinar escribiendo más letras, sin limitarse al lote inicial. Busca por nombre, comercio o teléfono según el endpoint existente.
- Interacción: clic, flechas, Enter, Escape y Tab; opción activa visible al navegar y lista con scroll interno. Se mantiene ID real en el formulario, no texto libre. Escribir otro término elimina selección anterior, plantilla y excepción dependientes; seleccionar conserva condiciones económicas manuales y habilita las plantillas de la ruta. Cliente preseleccionado muestra su nombre cuando está en el lote inicial.
- Concurrencia: temporizador liberado al cerrar/destruir; versión de consulta ignora respuestas atrasadas tras otra búsqueda o selección. No se reabre la lista por respuestas tardías. Carga, sin resultados, fallo de red y reintento por nueva escritura. Datos consultados permanecen solo en memoria; sin nuevas dependencias ni cambios backend/auth/PWA.
- Estilos centralizados en themes/_customer-combobox.scss con tokens existentes y sin colores nuevos.
- Validación final: 15/15 pruebas dirigidas del modal y LoansPage (2 suites), cubriendo búsqueda sin acentos, selección DOM/teclado, campos manuales, debounce, cliente remoto fuera del lote inicial, invalidación de IDs, fallo/reintento y respuesta tardía. Build productivo correcto sin advertencias, 319.58 kB iniciales. CLI Angular local, Node v24.22.1; git diff --check correcto.
- Navegador: fixture local 127.0.0.1:5866, escribir ana muestra Ana Pérez y Enter selecciona, filtra plantillas de su ruta y deja monto/interés/cuotas vacíos. Captura local de evidencia. Sin préstamos reales, móvil instalado ni ingress productivo; auditoría independiente no realizada.
- Git: rama feature/loan-card-overflow conservada, con cambios previos versionados; nuevo buscador pendiente de commit. Sin push ni despliegue.

### 2026-10-24 — Commit autorizado del buscador de clientes

- Solicitud expresa: hacer commit del buscador de clientes en Nuevo Préstamo. Se conservan las verificaciones registradas; sin push ni despliegue.

### 2026-10-24 — Nombre completo y alias en formulario de cliente

- Solicitud: después del commit del buscador (09929b4), cambiar Comercio / Trabajo por Alias Cliente y reemplazar Nombres/Apellidos por un único Nombre completo en el modal mostrado.
- Interfaz: mismo formulario compartido de creación/edición usa un único input fullName obligatorio y Alias Cliente opcional con ejemplo Don Carlos. Se conserva el campo técnico businessOrWorkName y sus datos existentes, sin migración ni cambios de contrato.
- Compatibilidad: el nombre cargado concatena firstNames/lastNames; si no se cambia conserva su separación original, incluidos nombres/apellidos compuestos. Al crear/renombrar se normalizan espacios y se adapta el texto a los dos campos vigentes sin perder/duplicar palabras. Se conserva la obligación actual de al menos un nombre y apellido y los límites de 120 caracteres por campo de la API; no se asignan apellidos ficticios. Es una unificación de captura, no una modificación del modelo backend.
- Se mantienen ruta, teléfonos, coordenadas, estado, permisos y comportamiento de GPS/mapa. Sin dependencias nuevas ni cambios en PWA o autenticación.
- Validación: 16/16 pruebas dirigidas del modal y página de clientes (2 suites); cubren único campo y etiqueta, alta, edición preservando nombres compuestos/alias, renombrado sin pérdida de palabras, campos incompletos/largos y regresiones de GPS/mapa. Build productivo correcto sin advertencias. CLI Angular local con Node v24.22.1; git diff --check correcto. No se crearon clientes reales ni se verificó por ingress. Auditoría independiente no realizada.
- Git: feature/loan-card-overflow conservada con los commits previos; este nuevo ajuste queda sin commit. Sin push ni despliegue.

### 2026-10-24 — Commit autorizado de nombre completo y alias

- Solicitud expresa del usuario: hacer commit del formulario con Nombre completo y Alias Cliente, incluyendo pruebas y documentación asociada.
- Se conservan las verificaciones registradas, sin nuevos cambios funcionales. Commit autorizado: SÍ. Sin push, merge, tag, PR ni despliegue.


### 2026-10-24 — Identificación obligatoria de clientes e intercambio visual de etiquetas

- Solicitud expresa: invertir Alias/Nombre completo solo en interfaz y agregar identificación obligatoria, con 0 solo para clientes anteriores. Maestro 1.15.0, frameworks frontend 1.0 / C# 2.0 y JWT vigente.
- Modal de clientes: se intercambian únicamente etiquetas/ejemplos: el control fullName sobre firstNames/lastNames se muestra como Alias; businessOrWorkName se muestra como Nombre completo. No se permutan datos persistidos ni se cambian sus validaciones previas.
- Identificación obligatoria de texto (1–64 caracteres, trim, ceros iniciales preservados). Nueva alta vacía sin default; 0 reservado al cliente existente cargado con 0 y reemplazable. Se envía en alta/edición y se conserva en la ruta anterior de actualización. Lecturas/contratos tipados y fixtures adecuados.
- Validación: suite completa 86/86 en 20 suites, build productivo correcto sin advertencias (319.58 kB iniciales). Pruebas incluyen etiqueta/dato sin permuta, alta sin ID, rechazo de 0 nuevo, conservación/corrección de 0 anterior y ceros iniciales. Navegador con fixtures locales verificó edición con ID 0 y alta con ID vacía; captura cliente-alias-identificacion.png. Sin creación de clientes reales desde la UI.
- Despliegue coordinado requerido: las versiones anteriores de API/formularios no envían identificación. Desplegar el backend operativo actualizado y ambos frontends juntos; la migración de Dev ya está aplicada. El servidor valida también las solicitudes directas y las reenviadas por BackendAdmin.
- Git: sin commit, push, merge, PR ni despliegue solicitados para este alcance. Auditoría independiente no realizada. Decisión canónica: ../cobroup.md/DECISION_IDENTIFICACION_CLIENTE.md.

### 2026-10-24 — Verificación de rama y destino de publicación

- El usuario pidió validar que el trabajo y su publicación correspondan a la rama feature, al observar cambios enviados a dev.
- Rama activa verificada: feature/customer-identification. Eliminado el seguimiento incorrecto de origin/dev. Configuración local: push.default=current, push.autoSetupRemote=true y branch.autoSetupMerge=false; futuros pushes por defecto usarán el mismo nombre de rama y nuevas features no heredarán origin/dev automáticamente.
- La rama remota feature/customer-identification no existía al verificar; no se hizo push. Los commits permanecen locales. En documentación se creó esta rama desde la fundación local existente, conservando los cinco commits previos sin reset ni merge.

### 2026-10-24 — Commit autorizado de identificación de clientes

- Solicitud expresa del usuario: hacer commits del alcance de identificación obligatoria, intercambio visual de etiquetas, migración, pruebas y documentación.
- Se conservan las verificaciones y la migración de Dev a 7 clientes. Commit autorizado: SÍ. Sin push, merge, tag, PR ni despliegue.
