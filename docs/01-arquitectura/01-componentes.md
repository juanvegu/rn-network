# Componentes

Mapa de archivos y responsabilidades.

## `rn-network-contracts` (iOS — Swift)

| Archivo | Tipo | Rol |
|---|---|---|
| `Sources/iOSNetworkContract/AppConfig.swift` | `struct AppConfig`, `struct DomainConfig` | Inmutables; describen país, environment y dominios disponibles |
| `Sources/iOSNetworkContract/NetworkProvider.swift` | `protocol NetworkProvider` | El contrato que implementa el host. Método `request(requestId:url:method:headers:body:)` y `cancel(requestId:)` opcional |
| `Sources/iOSNetworkContract/NetworkResponse.swift` | `struct NetworkResponse` | Envelope de éxito: `statusCode`, `headers`, `data?` |
| `Sources/iOSNetworkContract/NetworkError.swift` | `struct NetworkError: Error` | Error tipado del host: `code`, `retryable`, `httpStatus?`, `message?`, `info?` |
| `Sources/iOSNetworkContract/RNNetworkRegistry.swift` | `final class RNNetworkRegistry` | Singleton compartido. Campos `provider`, `appConfig`, `activeDomain`, `onSessionExpired` |

## `rn-network-contracts` (Android — Kotlin)

| Archivo | Tipo | Rol |
|---|---|---|
| `…/contracts/AppConfig.kt` | `data class AppConfig`, `data class DomainConfig` | Equivalentes Kotlin de los structs Swift |
| `…/contracts/NetworkProvider.kt` | `interface NetworkProvider` | Suspend `request(...)`, `cancel(requestId)` con default no-op |
| `…/contracts/NetworkResponse.kt` | `data class NetworkResponse` | `statusCode`, `headers`, `data: ByteArray?` |
| `…/contracts/NetworkError.kt` | `class NetworkError: Exception` | Equivalente del error tipado iOS |
| `…/contracts/RNNetworkRegistry.kt` | `object RNNetworkRegistry` | Singleton, mismos campos que iOS |

## `@scotia/rn-network` (TS)

| Archivo | Rol |
|---|---|
| `src/index.ts` | API pública: `request`, `setProvider`, `setBaseURL`, `cancelRequest`, `onSessionExpired`, `setRequestTimeout`. Aplica timeout cliente y `requestId`. |
| `src/RNNetworkBridge.ts` | Carga el módulo nativo, valida y tipa el payload (`parseAppConfig`), normaliza errores con JSON-in-`code`. |
| `src/types.ts` | `NetworkErrorCode`, `NetworkErrorPayload`, `NetworkResponse<T>`, `HttpMethod`, `RequestOptions`. |
| `src/appConfig.ts` | `AppConfig`, `DomainConfig`, `parseAppConfig()` con validación manual. |
| `src/AppConfigContext.tsx` | `AppConfigProvider` + `useAppConfig()` con `activeDomain` separado. |
| `src/MockNetworkProvider.ts` | Implementación JS de `NetworkProvider` para desarrollo y testing. |
| `src/RNNetworkRegistry.ts` | Registry JS interno (NO confundir con el nativo). Guarda `jsProvider` y `baseURL`. |

## `@scotia/rn-network` (módulos nativos)

| Archivo | Rol |
|---|---|
| `ios/RnNetworkModule.swift` | Definición del Expo Module iOS. Verifica 2xx, parsea body, emite evento `sessionExpired`. |
| `ios/NetworkErrorMapper.swift` | Convierte `URLError`, `CancellationError`, `NetworkError` → `NetworkException` (con payload JSON en `code`). |
| `android/.../RnNetworkModule.kt` | Equivalente Android del Expo Module. |
| `android/.../NetworkErrorMapper.kt` | Mapea `IOException`, `SSLException`, `CancellationException`, `NetworkError` → `NetworkException`. |
