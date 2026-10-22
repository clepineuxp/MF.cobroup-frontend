# Roadmap vigente de revalidación

Actualizado: 2026-10-22.

1. **Fase 2 — reabierta y bloqueante:** adaptar la sesión al contrato JWT de `../../../cobroup.md/DECISION_AUTENTICACION_JWT.md`, sin tokens en almacenamiento accesible a JavaScript y con refresh exclusivo por cookie segura.
2. **Fases 3 a 9 — cierre histórico conservado:** su funcionalidad versionada no se elimina, pero los recorridos autenticados deben repetirse con JWT por rol y tenant.
3. **Cierre de identidad:** exige login, refresh, logout, expiración, cambio de organización, CSRF y recuperación ante `401`, incluyendo pruebas que demuestren ausencia de tokens en Web Storage, URL, caché y logs.

La planeación consolidada mantiene 8 fases cerradas y 1 reabierta. Este documento no aprueba la implementación actual ni autoriza despliegue. Ver `../../../cobroup.md/informe/avance.md`.
