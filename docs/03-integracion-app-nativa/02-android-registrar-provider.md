# Android — Registrar el provider

Cómo implementar `NetworkProvider` y registrarlo en `RNNetworkRegistry`.

## 1. Implementar `NetworkProvider`

La interfaz (definida en `rn-network-contracts`) es:

```kotlin
interface NetworkProvider {
    suspend fun request(
        url: String,
        method: String,
        headers: Map<String, String>,
        body: Map<String, Any?>?
    ): ByteArray
}
```

Implementación típica con OkHttp + certificate pinning:

```kotlin
package com.example.app.network

import com.scotia.rnnetwork.contracts.NetworkProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.CertificatePinner
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class AppNetworkProvider : NetworkProvider {

    private val client = OkHttpClient.Builder()
        .certificatePinner(
            CertificatePinner.Builder()
                .add("api.bank.cl", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
                .build()
        )
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    override suspend fun request(
        url: String,
        method: String,
        headers: Map<String, String>,
        body: Map<String, Any?>?
    ): ByteArray = withContext(Dispatchers.IO) {
        val requestBody = body?.let {
            JSONObject(it).toString().toRequestBody("application/json".toMediaType())
        }

        val httpRequest = Request.Builder()
            .url(url)
            .apply { headers.forEach { (k, v) -> header(k, v) } }
            .method(method.uppercase(), requestBody)
            .build()

        client.newCall(httpRequest).execute().use { response ->
            val bytes = response.body?.bytes() ?: ByteArray(0)
            if (!response.isSuccessful) {
                // Convención: la primera parte del mensaje permite al módulo RN
                // mapear el código HTTP a NetworkErrorCode.
                throw IOException("com.scotia.rnnetwork.http:${response.code}")
            }
            bytes
        }
    }
}
```

> **Pin format:** `sha256/<base64-de-SPKI>`. Cómo calcularlo:
>
> ```bash
> openssl x509 -in cert.pem -pubkey -noout | \
>   openssl pkey -pubin -outform DER | \
>   openssl dgst -sha256 -binary | \
>   openssl base64
> ```

## 2. Registrar antes de inicializar RN

En tu `Application` subclass:

```kotlin
package com.example.app

import android.app.Application
import android.util.Log
import com.example.app.network.AppNetworkProvider
import com.scotia.rnnetwork.contracts.RNNetworkRegistry

class MainApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // 1) Registrar el provider
        RNNetworkRegistry.provider = AppNetworkProvider()

        // 2) Registrar appConfig
        RNNetworkRegistry.appConfig = mapOf(
            "country" to "CL",
            "environment" to "prod",
            "domains" to listOf(
                mapOf("key" to "prod",    "baseURL" to "https://api.bank.cl"),
                mapOf("key" to "staging", "baseURL" to "https://staging.bank.cl"),
            ),
            "activeDomain" to "prod",
        )

        // 3) Validación opcional: confirmar que el registry es el mismo singleton
        Log.d(
            "Net",
            "host registryId=${System.identityHashCode(RNNetworkRegistry)} " +
                "classloader=${RNNetworkRegistry::class.java.classLoader}"
        )

        // 4) SOLO AHORA inicializar React Native
        // ReactNativeHostManager.initialize(this)  // o equivalente
    }
}
```

Declarar la clase en `AndroidManifest.xml`:

```xml
<application
    android:name=".MainApplication"
    ... >
</application>
```

## 3. Verificar la identidad del singleton

Después de que la app RN cargue, desde JS:

```typescript
import { RNNetworkBridge } from '@scotia/rn-network'

const id = (RNNetworkBridge as any).debugIdentity?.()
console.log(id)
// "registryId=12345678 classloader=dalvik.system.PathClassLoader[...]"
```

Compara `registryId` con el `Log.d` del host. Si son iguales ⇒ singleton compartido, integración OK. Si difieren ⇒ contracts está duplicado en classpath (revisar `dependencyInsight`).

## 4. `CancellableNetworkProvider` (opcional)

Si tu app quiere soportar cancelación de requests, implementa la interfaz extendida:

```kotlin
import com.scotia.rnnetwork.contracts.CancellableNetworkProvider

class AppNetworkProvider : CancellableNetworkProvider {
    // request(...) como antes
    override fun cancel(requestId: String) {
        // lógica de cancelación
    }
}
```

El módulo RN detecta `is CancellableNetworkProvider` en runtime. Si no lo implementas, no pasa nada — degrada elegantemente.

> **Nota:** la API JS para invocar `cancel(requestId)` aún no está expuesta en `@scotia/rn-network` (a la fecha de esta doc, v0.1.33). La interfaz existe como reserva para una expansión futura.

## Pitfalls comunes

| Síntoma | Causa | Fix |
|---|---|---|
| `isAvailable()` retorna `false` desde JS | `RNNetworkRegistry.provider` quedó null | Verificar que `onCreate` se ejecuta antes del primer `request()` |
| `PROVIDER_NOT_SET` aunque registraste | Orden: registraste **después** de inicializar RN | Mover el `RNNetworkRegistry.provider = ...` **antes** de la init de RN |
| Funciona en debug pero falla en release | ProGuard/R8 eliminó las clases | Añadir reglas keep: `-keep class com.scotia.rnnetwork.contracts.** { *; }` |
| Pinning falla en `staging` pero funciona en `prod` | Pin solo cubre el host de prod | Añadir hosts adicionales al `CertificatePinner` o usar pinning condicional por `activeDomain` |

## Siguiente paso

[iOS — consumir contracts →](03-ios-consumir-contracts.md)
