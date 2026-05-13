# Roles de cada librería

Vista rápida de qué hace cada componente, quién lo consume y cómo se distribuye.

## Tabla resumen

| Librería | Lenguaje | Distribución | Quién la consume | Responsabilidad |
|---|---|---|---|---|
| `@scotia/rn-network` | TypeScript + Swift + Kotlin | npm (GitHub: `juanvegu/scotia-rn-network`) | Una app React Native | Exponer API JS (`request`, `setProvider`, ...) y delegar al stack nativo via Expo module |
| `rn-network-contracts` (Android) | Kotlin | JitPack: `com.github.juanvegu:rn-network-contracts:<tag>` | El módulo Android de `rn-network` + la app nativa Android | Declarar `NetworkProvider` y `RNNetworkRegistry` |
| `rn-network-contracts` (iOS) | Swift | CocoaPods (vía `scotia-podspecs`) — pod `NetworkContracts` | El módulo iOS de `rn-network` + la app nativa iOS | Declarar `NetworkProvider` y `RNNetworkRegistry` |

## Quién implementa, quién consume

### `NetworkProvider` (interfaz)
- **Define:** `rn-network-contracts`.
- **Implementa:** la app nativa host (típicamente con OkHttp/URLSession + pinning).
- **Llama:** el módulo nativo de `@scotia/rn-network`.

### `RNNetworkRegistry` (singleton)
- **Define:** `rn-network-contracts`.
- **Escribe:** la app nativa host (en `onCreate` / `AppDelegate`).
- **Lee:** el módulo nativo de `@scotia/rn-network`.

### `request(url, method, headers, body)` (función JS)
- **Define:** `@scotia/rn-network`.
- **Llama:** el código JS de la app RN.
- **Delega a:**
  - el módulo nativo si `isAvailable()` (que a su vez llama al `provider` del host), o
  - el `MockNetworkProvider` JS si está en `__DEV__` y se registró con `setProvider()`.

## Por qué hay dos librerías separadas

`rn-network-contracts` se mantiene como un proyecto **independiente** de `@scotia/rn-network` por dos razones:

1. **No arrastra React Native ni Expo.** Una app nativa puede consumir solo `contracts` sin depender del stack de RN. Importar Expo en una app nativa pura sería excesivo.
2. **Versionado independiente.** Las apps nativas y la app RN pueden estar en cadencias de release distintas. Mientras el contrato núcleo (`NetworkProvider.request`) no cambie, distintas versiones del host y del módulo RN pueden coexistir.

El contrato núcleo está marcado en el código como "must never change between versions" — nuevas capacidades (ej. `CancellableNetworkProvider`) se añaden como protocolos/interfaces opcionales que el módulo RN detecta en runtime con degradación elegante.

## ¿Y dónde encaja `expo-brownfield`?

`expo-brownfield` es un mecanismo de Expo (independiente de estas librerías) que permite empaquetar una app Expo/RN como un AAR (Android) o framework (iOS) que una app nativa preexistente puede embeber. Es el contexto típico en el que vive `rn-network`, pero **no es un requisito**: cualquier integración RN ↔ host puede usar `rn-network` mientras la capa nativa tenga acceso a `RNNetworkRegistry`.

Esta documentación no cubre `expo-brownfield`; consultar la [documentación oficial de Expo](https://docs.expo.dev/) para esa parte.
