# Documentación · `@scotia/rn-network`

Bridge React Native que delega los requests HTTP al stack nativo de la app del banco (URLSession / OkHttp con su pinning, sesión, telemetría). El módulo Expo es solo transporte; quien hace la petición es el host nativo, que implementa un contrato definido en `rn-network-contracts`.

## Índice

- **[00 · Visión general](00-vision-general/README.md)** — qué resuelve, glosario, roles de cada librería.
- **[01 · Arquitectura](01-arquitectura/README.md)** — componentes, flujo de un request end-to-end, decisiones técnicas, versionado.
- **[02 · Integración en la app RN](02-integracion-app-rn/README.md)** — instalar, configurar, usar `request`, escribir mocks.
- **[03 · Integración en la app nativa](03-integracion-app-nativa/README.md)** — implementar `NetworkProvider` en iOS y Android, registrar en `RNNetworkRegistry`.
- **[04 · Referencia API](04-referencia-api/README.md)** — API JS, tipos, contratos Swift/Kotlin, códigos de error, troubleshooting.

## Quickstart

| Si sos… | Empezá por… |
|---|---|
| Dev RN que va a hacer requests | [02 · Uso básico](02-integracion-app-rn/02-uso-basico.md) |
| Dev iOS que va a registrar un provider | [03 · iOS · Registrar provider](03-integracion-app-nativa/04-ios-registrar-provider.md) |
| Dev Android que va a registrar un provider | [03 · Android · Registrar provider](03-integracion-app-nativa/02-android-registrar-provider.md) |
| Tech lead validando el diseño | [01 · Decisiones técnicas](01-arquitectura/04-decisiones-tecnicas.md) |
| Devs revisando contrato/API | [04 · Referencia API](04-referencia-api/README.md) |

## Estado

Versión vigente: **1.1.x**. Los cambios respecto a 1.0 introdujeron:

- `NetworkResponse` envelope (`statusCode`, `headers`, `data?`) como retorno del provider.
- `NetworkError` tipado para errores de dominio (`SESSION_EXPIRED`, `RATE_LIMITED`, etc.).
- `AppConfig` y `activeDomain` separados en `RNNetworkRegistry`.
- `request()` con `requestId`, timeout cliente y cancelación.
- Evento `sessionExpired` push desde nativo.

Para detalles del breaking change ver [01 · Versionado](01-arquitectura/05-versionado-y-compatibilidad.md).
