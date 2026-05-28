# 00 · Visión general

Esta sección responde **qué es** el sistema, **qué problema resuelve** y **cómo se divide** entre librerías.

| Archivo | Contenido |
|---|---|
| [01 · Diagrama de arquitectura](01-diagrama-arquitectura.md) | Vista en una imagen mental de quién habla con quién. |
| [02 · Glosario](02-glosario.md) | Términos recurrentes (`provider`, `registry`, `bridge`, `host`, etc.). |
| [03 · Roles de cada librería](03-roles-de-cada-libreria.md) | Qué hace cada repo, quién lo consume, cómo se distribuye. |

## El problema

La app móvil de Scotia es **nativa con módulos React Native embebidos** (expo-brownfield). El stack nativo tiene su HTTP client configurado con SSL pinning, certificados del banco, manejo de sesión y telemetría. La RN no puede reimplementar eso — necesita **delegar** los requests al nativo.

## La solución

Tres piezas:

1. **`rn-network-contracts`** (Swift + Kotlin) — define `NetworkProvider`, `NetworkResponse`, `NetworkError`, `AppConfig`, `RNNetworkRegistry`. Sin deps, binario-estable.
2. **`@scotia/rn-network`** (Expo Module) — expone `request()` en JS/TS. Internamente llama al `NetworkProvider` que registró el host vía el `RNNetworkRegistry` singleton.
3. **App nativa del banco** — implementa `NetworkProvider` con su HTTP client, registra antes de inicializar RN.

Si el host no registra un provider (por ejemplo en una build con backend stubbed), la RN cae a un `MockNetworkProvider` JS que devuelve fixtures locales.
