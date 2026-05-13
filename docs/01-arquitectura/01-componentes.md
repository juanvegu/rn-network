# Componentes

Mapa de archivos de las dos librerías y qué hace cada uno.

## `@scotia/rn-network`

Repo: `https://github.com/juanvegu/scotia-rn-network`

### Capa JS (TypeScript)

| Archivo | Rol |
|---|---|
| `src/index.ts` | API pública exportada al consumidor: `request`, `setProvider`, `hasProvider`, `isAvailable`, `setBaseURL`, `getBaseURL`, re-export de tipos y de `AppConfigProvider`, `useAppConfig`, `MockNetworkProvider`, `RNNetworkBridge`. |
| `src/RNNetworkBridge.ts` | Envuelve `requireNativeModule('RNNetworkModule')`. Expone `isAvailable()`, `getNativeAppConfig()`, `getNativeBaseURL()`, `setActiveDomain()`, `getBaseURLForDomain()`, `request()`. Detecta si el módulo nativo está linkeado y normaliza errores. |
| `src/RNNetworkRegistry.ts` | Registry **del lado JS** (no confundir con el singleton nativo). Guarda `jsProvider` (mock dev) y `baseURL` cuando no hay nativo. |
| `src/types.ts` | `HttpMethod`, `NetworkErrorCode`, `NetworkErrorPayload`, `NetworkProvider` (interfaz JS), `MockNetworkProviderConfig`. |
| `src/appConfig.ts` | Tipos: `AppEnvironment`, `DomainKey`, `CountryCode`, `DomainConfig`, `AppConfig`. |
| `src/AppConfigContext.tsx` | `AppConfigProvider` (React context) + hook `useAppConfig()` para leer/escribir `activeDomain` desde la app. |
| `src/MockNetworkProvider.ts` | Implementación de `NetworkProvider` usable en JS. Hace matching por substring contra `routes` y devuelve respuestas hardcodeadas. |

### Capa nativa

| Archivo | Rol |
|---|---|
| `ios/RnNetworkModule.swift` | Expo module iOS. Funciones: `hasNativeProvider`, `getNativeAppConfig`, `getBaseURLForDomain`, `setActiveDomain` (async), `request` (async). Lee `RNNetworkRegistry.provider` y `RNNetworkRegistry.appConfig` del singleton nativo (definido en `NetworkContracts` pod). Mapea errores con `NetworkErrorMapper`. |
| `android/src/main/java/expo/modules/rnnetwork/RnNetworkModule.kt` | Expo module Android. Funciones equivalentes a iOS. Convierte `ByteArray → JSONObject → Map<String, Any?>` con helpers internos `jsonToMap`, `jsonToList`, `jsonValueToKotlin`. Expone también `debugIdentity` para validar singleton. |

### Plugin Expo

| Archivo | Rol |
|---|---|
| `plugin/withNetworkContracts.ts` | Config plugin. Durante `npx expo prebuild` modifica el `Podfile` iOS: añade los sources `scotia-podspecs` y `cdn.cocoapods.org`, e inyecta un `pre_install` hook que fuerza el pod `NetworkContracts` como dynamic framework. Idempotente: revisa si ya están presentes antes de inyectar. |

### Manifiesto

| Archivo | Rol |
|---|---|
| `expo-module.config.json` | Declara los módulos nativos a Expo: `RNNetworkModule` (iOS) y `expo.modules.rnnetwork.RNNetworkModule` (Android). |
| `package.json` | `peerDependencies`: `expo`, `react`, `react-native`. Entry: `build/index.js`. Plugin: `build/plugin/withNetworkContracts`. |

## `rn-network-contracts`

Repo: `https://github.com/juanvegu/rn-network-contracts`

### Android (Kotlin)

| Archivo | Rol |
|---|---|
| `android/src/main/java/com/scotia/rnnetwork/contracts/NetworkProvider.kt` | Define `interface NetworkProvider` con `suspend fun request(url, method, headers, body): ByteArray`. También define `CancellableNetworkProvider : NetworkProvider` (capacidad opcional). |
| `android/src/main/java/com/scotia/rnnetwork/contracts/RNNetworkRegistry.kt` | Define `object RNNetworkRegistry` con `provider: NetworkProvider?` y `appConfig: Map<String, Any?>?`. |
| `android/build.gradle` | Library Gradle. Publica via `maven-publish` con coordenadas `com.github.juanvegu:rn-network-contracts:<version>`. Compatible JitPack. |

### iOS (Swift)

| Archivo | Rol |
|---|---|
| `ios/Sources/NetworkContracts/NetworkProvider.swift` | Define `protocol NetworkProvider` con `func request(url, method, headers, body) async throws -> Data`. Define `protocol CancellableNetworkProvider: NetworkProvider`. |
| `ios/Sources/NetworkContracts/RNNetworkRegistry.swift` | Define `final class RNNetworkRegistry` con propiedades estáticas `provider: NetworkProvider?` y `appConfig: [String: Any]?`. |
| `ios/NetworkContracts.podspec` | Especificación CocoaPods. `static_framework = false`. Configurado con `MACH_O_TYPE = mh_dylib` y library evolution habilitada. |

## Aclaración importante sobre el "registry"

Existen **dos** registries con nombres parecidos pero roles distintos:

| Nombre | Dónde vive | Rol |
|---|---|---|
| `RNNetworkRegistry` (Kotlin/Swift) | `rn-network-contracts` | Singleton nativo. Lo escribe la app host, lo lee el módulo nativo de `rn-network`. |
| `registry` (TS, en `src/RNNetworkRegistry.ts`) | `@scotia/rn-network` | Estado interno de la capa JS para el modo dev: guarda `jsProvider` (mock) y `baseURL`. |

Cuando esta documentación dice "el registry" sin más, se refiere al singleton **nativo** (Kotlin/Swift) — es el que importa para la integración real.
