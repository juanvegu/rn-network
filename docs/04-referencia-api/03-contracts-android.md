# Contracts Android (Kotlin)

Referencia de las interfaces y singletons en `rn-network-contracts-android`.

## `NetworkProvider`

```kotlin
interface NetworkProvider {
    suspend fun request(
        requestId: String,
        url: String,
        method: String,
        headers: Map<String, String>,
        body: Map<String, Any?>?
    ): NetworkResponse

    fun cancel(requestId: String) { /* no-op default */ }
}
```

- **NO** clasificar 4xx/5xx — devolver el `NetworkResponse` con `statusCode`, el módulo Expo clasifica.
- Tirar `NetworkError` para casos de dominio.
- Dejar propagar `IOException`, `SSLException`, `CancellationException` — el mapper los traduce.
- `cancel` opcional vía default no-op.

## `NetworkResponse`

```kotlin
data class NetworkResponse(
    val statusCode: Int,
    val headers: Map<String, String> = emptyMap(),
    val data: ByteArray?,
)
```

`data = null` para 204 / sin body.

## `NetworkError`

```kotlin
class NetworkError(
    val code: String,
    val retryable: Boolean = false,
    val httpStatus: Int? = null,
    message: String? = null,
    val info: Map<String, Any?>? = null,
) : Exception(message)
```

## `AppConfig` y `DomainConfig`

```kotlin
data class DomainConfig(val key: String, val baseURL: String)

data class AppConfig(
    val country: String,
    val environment: String,
    val domains: List<DomainConfig>,
)
```

Inmutables. `activeDomain` vive en el registry, no acá.

## `RNNetworkRegistry`

```kotlin
object RNNetworkRegistry {
    var provider: NetworkProvider? = null
    var appConfig: AppConfig? = null
    var activeDomain: String? = null
    var onSessionExpired: (() -> Unit)? = null

    val activeBaseURL: String?
        get() = activeDomain?.let { key ->
            appConfig?.domains?.firstOrNull { it.key == key }?.baseURL
        }
}
```

Singleton. Asignar antes de iniciar React Native.
