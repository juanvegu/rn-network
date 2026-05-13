# Contracts Android (Kotlin)

Referencia de las interfaces y singletons definidos en `rn-network-contracts` para Android.

Paquete: `com.scotia.rnnetwork.contracts`

## `NetworkProvider`

```kotlin
package com.scotia.rnnetwork.contracts

/**
 * Core contract — must never change between versions.
 * New capabilities are added as optional interfaces
 * that extend this core.
 */
interface NetworkProvider {
    suspend fun request(
        url: String,
        method: String,
        headers: Map<String, String>,
        body: Map<String, Any?>?
    ): ByteArray
}
```

### Contrato

| Parámetro | Tipo | Descripción |
|---|---|---|
| `url` | `String` | URL absoluta. El módulo RN ya resolvió `baseURL` + path relativo antes de llamarte. |
| `method` | `String` | Uno de `"GET" | "POST" | "PUT" | "PATCH" | "DELETE"`. Verbatim del JS, sin normalización. |
| `headers` | `Map<String, String>` | Headers como llegaron desde JS. No incluye `Content-Type` automático — añadirlo manualmente si serializas un body JSON. |
| `body` | `Map<String, Any?>?` | Body decodificado desde JSON (no string raw). `null` para GET/DELETE sin body. |

**Retorna**: `ByteArray` — los bytes del response body. El módulo RN los interpretará como JSON.

**Lanza**: `Throwable` cualquiera. El módulo RN llama a `NetworkErrorMapper.map(e)` internamente para convertirlo a `NetworkException` con `code` y `retryable`.

### Convenciones para señalar errores HTTP

Si el response tiene status no-2xx, el patrón sugerido (visto en `ScotiaNetworkProvider.kt`) es:

```kotlin
if (!response.isSuccessful) {
    throw IOException("com.scotia.rnnetwork.http:${response.code}")
}
```

El módulo RN parsea el mensaje para extraer `httpStatus` y clasificar entre `HTTP_CLIENT_ERROR` (4xx) y `HTTP_SERVER_ERROR` (5xx).

> Esta convención es informal — la implementación de `NetworkErrorMapper` puede ajustarse. Si quieres control fino del error code, puedes lanzar una excepción con un payload JSON serializado, pero requiere coordinación con el equipo del módulo RN.

## `RNNetworkRegistry`

```kotlin
package com.scotia.rnnetwork.contracts

/**
 * Shared singleton between the RN App AAB and the bank's native app.
 * The bank must assign the provider BEFORE initializing React Native.
 */
object RNNetworkRegistry {
    var provider: NetworkProvider? = null
    var appConfig: Map<String, Any?>? = null
}
```

| Propiedad | Tipo | Quién la escribe | Quién la lee |
|---|---|---|---|
| `provider` | `NetworkProvider?` | App host (en `Application.onCreate`) | Módulo nativo de `rn-network` |
| `appConfig` | `Map<String, Any?>?` | App host | Módulo nativo de `rn-network` |

`object` en Kotlin garantiza una única instancia por `ClassLoader`. Como en Android hay un solo `ClassLoader` por proceso (excepto edge cases), `RNNetworkRegistry` es de facto un singleton global.

### Convenciones del `appConfig`

Aunque el tipo es `Map<String, Any?>?` (libre), el módulo nativo lee tres claves específicas:

| Clave | Tipo esperado | Uso |
|---|---|---|
| `"country"` | `String` | Informativo (expuesto en JS via `useAppConfig`). |
| `"domains"` | `List<Map<String, String>>` donde cada entrada tiene `"key"` y `"baseURL"` | Lista de dominios disponibles. |
| `"activeDomain"` | `String` | Clave del dominio activo. |
| `"baseURL"` | `String` (opcional, autocompletado) | El módulo nativo lo escribe automáticamente al llamar `setActiveDomain`. |

Cualquier otra clave es libre y accesible desde JS via `useAppConfig().config`.

## `CancellableNetworkProvider`

```kotlin
package com.scotia.rnnetwork.contracts

/**
 * Optional extension for countries that support cancellation.
 * The RN module detects this capability at runtime with graceful
 * degradation if the country has not implemented it.
 */
interface CancellableNetworkProvider : NetworkProvider {
    fun cancel(requestId: String)
}
```

Capacidad opcional. Si tu provider la implementa, el módulo RN puede invocar cancelación de requests.

> **Estado actual:** la API JS para invocar `cancel` aún no está expuesta en `@scotia/rn-network` v0.1.33. La interfaz existe como reserva.

## Cómo se detecta en runtime desde el módulo RN

```kotlin
val provider = RNNetworkRegistry.provider
if (provider is CancellableNetworkProvider) {
    provider.cancel(requestId)
} else {
    // Degrada elegantemente: no-op
}
```

Por eso es seguro implementar `CancellableNetworkProvider` aunque hosts viejos no la conozcan.

## Dependencias

`rn-network-contracts` Android **no tiene dependencias externas** (excepto Kotlin stdlib). No arrastra OkHttp, no arrastra RN, no arrastra Expo.

```groovy
// android/build.gradle
plugins {
    id 'com.android.library' version '8.5.2'
    id 'org.jetbrains.kotlin.android' version '1.9.25'
    id 'maven-publish'
}

android {
    namespace 'com.scotia.rnnetwork.contracts'
    compileSdk 34
    defaultConfig { minSdk 24 }
    // ...
}
```

## ProGuard / R8

Si tu app aplica ProGuard/R8, añade reglas keep para los símbolos del contrato:

```proguard
-keep class com.scotia.rnnetwork.contracts.** { *; }
-keepclassmembers class com.scotia.rnnetwork.contracts.RNNetworkRegistry {
    public static *;
}
```

Razón: el módulo nativo de `rn-network` lee `RNNetworkRegistry` por nombre vía reflexión limitada de Kotlin, y la interfaz `NetworkProvider` se invoca dinámicamente.
