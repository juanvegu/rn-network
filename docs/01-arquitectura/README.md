# 01 — Arquitectura

Vista interna de las dos librerías y de cómo se ensamblan en runtime.

## Páginas

- [Componentes](01-componentes.md) — desglose de cada parte de `@scotia/rn-network` y `rn-network-contracts`, archivo por archivo.
- [Flujo de requests](02-flujo-de-requests.md) — qué pasa paso a paso cuando JS llama a `request()`.
- [Modelo de dominios](03-modelo-de-dominios.md) — `appConfig`, `activeDomain`, `baseURL` y cómo se resuelve una ruta relativa.
- [Decisiones técnicas](04-decisiones-tecnicas.md) — por qué cada decisión de diseño (SSL pinning nativo, contracts separados, dynamic framework, etc.).
- [Versionado y compatibilidad](05-versionado-y-compatibilidad.md) — cómo sincronizar versiones entre las dos librerías y el host.

## Antes de empezar

Si no conoces aún la separación entre las dos librerías y sus roles, lee primero [00 — Visión general](../00-vision-general/README.md).
