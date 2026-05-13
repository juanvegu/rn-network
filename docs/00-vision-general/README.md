# 00 — Visión general

## Qué son estas librerías

### `@scotia/rn-network`

Expo module instalable en cualquier app React Native. Expone una API de red en JS/TS (`request`, `setProvider`, `isAvailable`, `setBaseURL`, `getBaseURL`, `AppConfigProvider`) y, cuando la app RN está embebida en una app nativa que registró un `NetworkProvider`, delega cada request a la capa nativa del host.

Razón de existir: las apps del banco necesitan ejecutar las requests a través del stack de red nativo (SSL pinning, telemetría, sesión del host) en lugar de `fetch`/`axios`. Este módulo es el puente.

### `rn-network-contracts`

Librería **nativa** (Kotlin para Android, Swift para iOS) que define las interfaces compartidas:

- `NetworkProvider` — contrato que la app nativa host implementa.
- `RNNetworkRegistry` — singleton donde la app nativa registra su provider y la configuración.

**No depende de React Native ni de Expo.** Es Kotlin/Swift puro. Por eso una app nativa puede consumirla sin arrastrar el stack de RN.

## Cómo se relacionan

```
┌───────────────────────────────────────────────────────────┐
│ App React Native (cualquiera)                              │
│   ├─ import { request } from '@scotia/rn-network'          │
│   └─ request('/api/...')                                   │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────┐
│ @scotia/rn-network                                         │
│   ├─ Capa JS (src/index.ts)                                │
│   └─ Módulo nativo (iOS Swift / Android Kotlin)            │
└───────────────────────┬───────────────────────────────────┘
                        │  lee
                        ▼
┌───────────────────────────────────────────────────────────┐
│ rn-network-contracts                                       │
│   ├─ RNNetworkRegistry  (singleton)                        │
│   └─ NetworkProvider   (interfaz)                          │
└───────────────────────▲───────────────────────────────────┘
                        │  registra su provider
                        │
┌───────────────────────┴───────────────────────────────────┐
│ App nativa host (cualquiera — Android/iOS)                 │
│   ├─ class AppNetworkProvider : NetworkProvider            │
│   └─ RNNetworkRegistry.provider = AppNetworkProvider()     │
└───────────────────────────────────────────────────────────┘
```

## Páginas de esta sección

- [Diagrama de arquitectura](01-diagrama-arquitectura.md) — diagramas detallados (componentes y secuencia).
- [Glosario](02-glosario.md) — términos clave: provider, registry, contracts, pinning, dominio activo, brownfield.
- [Roles de cada librería](03-roles-de-cada-libreria.md) — tabla con responsabilidades, lenguaje, distribución y consumidor.

## Siguiente paso

- Si tienes una **app React Native** y quieres consumir `rn-network`: ve a [02 — Integración en una app RN](../02-integracion-app-rn/README.md).
- Si tienes una **app nativa** que va a hospedar RN: ve a [03 — Integración en una app nativa](../03-integracion-app-nativa/README.md).
- Si necesitas entender la arquitectura interna primero: ve a [01 — Arquitectura](../01-arquitectura/README.md).
