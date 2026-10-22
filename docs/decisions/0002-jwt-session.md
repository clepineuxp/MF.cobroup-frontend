# ADR-002 — Sesión JWT de la PWA operativa

Estado: revisada y aceptada el 2026-10-22. Implementación pendiente de conformidad.

La aplicación autentica usuario y contraseña contra `MS.Cobroup.BackendAdmin`, única autoridad JWT. Conserva el access token exclusivamente en memoria y lo envía como bearer al backend operativo. Nunca persiste access o refresh tokens en Web Storage, IndexedDB, URL, service worker, caché o logs.

El refresh token se recibe y envía únicamente mediante cookie `HttpOnly`, `Secure` y `SameSite`, inaccesible para JavaScript. Las operaciones basadas en esa cookie usan protección CSRF. Ante `401` se realiza como máximo un intento de refresh; si falla, se limpia el estado local y se exige autenticación nueva.

El cambio de organización invoca la autoridad, revoca la familia de refresh anterior y reemplaza el access token en memoria por otro con el tenant elegido. La PWA no confía en un tenant suministrado por formularios para autorizar operaciones. El contrato completo y sus criterios auditables están en `cobroup.md/DECISION_AUTENTICACION_JWT.md`.
