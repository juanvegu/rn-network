# 01 · Arquitectura

Detalle interno del sistema: componentes, flujo, decisiones técnicas y política de versionado.

| Archivo | Contenido |
|---|---|
| [01 · Componentes](01-componentes.md) | Cada pieza, qué hace, dónde vive en el filesystem. |
| [02 · Flujo de requests](02-flujo-de-requests.md) | Trayecto de un `request()` end-to-end incluyendo errores, timeout y cancelación. |
| [03 · Modelo de dominios](03-modelo-de-dominios.md) | `AppConfig`, `activeDomain` y cambio de entorno en runtime. |
| [04 · Decisiones técnicas](04-decisiones-tecnicas.md) | Por qué cada decisión: envelope, throws, registry, sin static framework, etc. |
| [05 · Versionado y compatibilidad](05-versionado-y-compatibilidad.md) | Política de semver para cambios en el contrato y proceso de PRs sincronizados. |
