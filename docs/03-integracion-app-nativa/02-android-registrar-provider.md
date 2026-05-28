# Android · Registrar el provider

Cómo implementar `NetworkProvider` y registrarlo en `RNNetworkRegistry`.

## Implementación de referencia (OkHttp + pinning)

```kotlin
import com.scotia.rnnetwork.contracts.NetworkError
import com.scotia.rnnetwork.contracts.NetworkProvider
import com.scotia.rnnetwork.contracts.NetworkResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class AppNetworkProvider(
    private val client: OkHttpClient = buildClient(),
) : NetworkProvider {

    override suspend fun request(
        requestId: String,
        url: String,
        method: String,
        headers: Map<String, String>,
        body: Map<String, Any?>?,
    ): NetworkResponse = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url).apply {
            headers.forEach { (k, v) -> header(k, v) }
            val rb = body?.let {
                JSONObject(it).toString().toRequestBody("application/json".toMediaType())
            }
            method(method.uppercase(), rb)
            tag(requestId)             // ← clave para cancel(requestId)
        }.build()

        client.newCall(req).execute().use { resp ->
            // Caso de dominio: sesión expirada (header definido por el banco) → error tipado.
            if (resp.code == 401 && resp.header("X-Session-Expired") == "true") {
                throw NetworkError(
                    code = "SESSION_EXPIRED",
                    retryable = false,
                    httpStatus = 401,
                )
            }

            val bytes = resp.body?.bytes()?.takeIf { it.isNotEmpty() }
            val headerMap = resp.headers.toMultimap()
                .mapValues { it.value.joinToString(", ") }

            // OJO: NO clasificamos 4xx/5xx acá. El módulo Expo lo hace por statusCode.
            NetworkResponse(
                statusCode = resp.code,
                headers = headerMap,
                data = if (resp.code == 204) null else bytes,
            )
        }
    }

    override fun cancel(requestId: String) {
        client.dispatcher.queuedCalls().firstOrNull { it.request().tag() == requestId }?.cancel()
        client.dispatcher.runningCalls().firstOrNull { it.request().tag() == requestId }?.cancel()
    }

    companion object {
        private fun buildClient() = OkHttpClient.Builder()
            .certificatePinner(
                CertificatePinner.Builder()
                    .add("api.bank.cl", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
                    .build()
            )
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
```

> **Pin format:** `sha256/<base64-de-SPKI>`. Se calcula con:
> ```bash
> openssl x509 -in cert.pem -pubkey -noout | \
>   openssl pkey -pubin -outform DER | \
>   openssl dgst -sha256 -binary | \
>   openssl base64
> ```

## Registro

En `MainApplication.onCreate`, **antes** de inicializar el host de RN:

```kotlin
import com.scotia.rnnetwork.contracts.*

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 1. AppConfig estático
        RNNetworkRegistry.appConfig = AppConfig(
            country = "CL",
            environment = "prod",
            domains = listOf(
                DomainConfig(key = "BFF", baseURL = "https://api.bank.cl"),
                DomainConfig(key = "INSURANCE", baseURL = "https://insurance.bank.cl"),
            ),
        )

        // 2. Dominio activo inicial
        RNNetworkRegistry.activeDomain = "BFF"

        // 3. Provider real (omitir si querés que la RN caiga al mock JS)
        RNNetworkRegistry.provider = AppNetworkProvider()

        // 4. Notificar a JS cuando la sesión se cae
        RNNetworkRegistry.onSessionExpired = {
            // Por ejemplo, después de fallar el token refresh:
            Log.w("Net", "Session expired, notifying RN")
        }

        // 5. SIEMPRE al final
        ReactNativeHostManager.initialize(this)
    }
}
```

## Errores que vale la pena tirar como `NetworkError`

| Situación | `code` sugerido | `retryable` |
|---|---|---|
| 401 con header de sesión expirada | `SESSION_EXPIRED` | false |
| 401 por credenciales malas | `SESSION_UNAUTHORIZED` | false |
| 429 con `Retry-After` | `RATE_LIMITED` (con `info = { retryAfter: N }`) | true |
| 403 por geolocalización | `SCOTIA_GEO_BLOCKED` | false |
| Cualquier código de dominio del banco | `SCOTIA_*` | según corresponda |

Para 4xx/5xx genéricos **no tires** — devolvé el `NetworkResponse` con el status y dejá que el módulo lo clasifique como `HTTP_CLIENT_ERROR` o `HTTP_SERVER_ERROR`.

## Errores del sistema

`SocketTimeoutException`, `UnknownHostException`, `SSLException`, `CancellationException` — **dejá que se propaguen**. El `NetworkErrorMapper` del módulo Expo los traduce a códigos estándar (`TIMEOUT`, `NO_CONNECTIVITY`, `SSL_PINNING_FAILED`, `CANCELLED`).
