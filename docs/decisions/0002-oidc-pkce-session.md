# ADR-002 — Sesión OIDC de la PWA operativa

Estado: aceptada para fase 2.

La aplicación usa el cliente público `cobroup-operational-spa` con Authorization Code + PKCE. Los tokens permanecen en memoria, el refresh se rota y el logout lo revoca. El backend operativo valida el token y devuelve el contexto de organización; la PWA no confía en un tenant suministrado por formularios para autorizar operaciones.
