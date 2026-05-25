package expo.modules.rnnetwork

import com.scotia.rnnetwork.contracts.RNNetworkRegistry
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class RNNetworkModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("RNNetworkModule")

        Events("sessionExpired")

        OnCreate {
            // Bridge the native session-expired hook to a JS event. The host invokes
            // RNNetworkRegistry.onSessionExpired?.invoke() when it detects the session is gone.
            RNNetworkRegistry.onSessionExpired = {
                this@RNNetworkModule.sendEvent("sessionExpired", emptyMap<String, Any?>())
            }
        }

        OnDestroy {
            RNNetworkRegistry.onSessionExpired = null
        }

        Function("hasNativeProvider") {
            RNNetworkRegistry.provider != null
        }

        Function("debugIdentity") {
            "registryId=${System.identityHashCode(RNNetworkRegistry)} " +
                "classloader=${RNNetworkRegistry::class.java.classLoader}"
        }

        Function("getNativeAppConfig") {
            RNNetworkRegistry.appConfig?.let { c ->
                mapOf(
                    "country" to c.country,
                    "environment" to c.environment,
                    "domains" to c.domains.map { mapOf("key" to it.key, "baseURL" to it.baseURL) },
                )
            }
        }

        Function("getNativeActiveDomain") {
            RNNetworkRegistry.activeDomain
        }

        Function("getBaseURLForDomain") { domainKey: String ->
            RNNetworkRegistry.appConfig?.domains?.firstOrNull { it.key == domainKey }?.baseURL
        }

        AsyncFunction("setActiveDomain") { domainKey: String ->
            val domains = RNNetworkRegistry.appConfig?.domains ?: return@AsyncFunction
            if (domains.none { it.key == domainKey }) return@AsyncFunction
            RNNetworkRegistry.activeDomain = domainKey
        }

        AsyncFunction("cancel") { requestId: String ->
            RNNetworkRegistry.provider?.cancel(requestId)
        }

        AsyncFunction("request") Coroutine { requestId: String, url: String, method: String, headers: Map<String, String>, body: Map<String, Any?>? ->
            val provider = RNNetworkRegistry.provider
                ?: throw NetworkException("PROVIDER_NOT_SET", retryable = false)

            val response = try {
                provider.request(requestId, url, method, headers, body)
            } catch (e: Throwable) {
                throw NetworkErrorMapper.map(e)
            }

            // Central rule: only 2xx is success. The host can't "forget" to throw anymore.
            if (response.statusCode !in 200..299) {
                val retryable = response.statusCode >= 500
                val code = if (response.statusCode < 500) "HTTP_CLIENT_ERROR" else "HTTP_SERVER_ERROR"
                throw NetworkException(code, retryable = retryable, httpStatus = response.statusCode)
            }

            val data = response.data
            val bodyMap: Map<String, Any?> = if (data == null || data.isEmpty()) {
                emptyMap()
            } else {
                try {
                    jsonToMap(JSONObject(String(data, Charsets.UTF_8)))
                } catch (e: Exception) {
                    throw NetworkException("INVALID_RESPONSE_BODY", retryable = false)
                }
            }

            mapOf(
                "body" to bodyMap,
                "statusCode" to response.statusCode,
                "headers" to response.headers,
            )
        }
    }
}

private fun jsonToMap(obj: JSONObject): Map<String, Any?> =
    obj.keys().asSequence().associateWith { key -> jsonValueToKotlin(obj.get(key)) }

private fun jsonToList(arr: JSONArray): List<Any?> =
    (0 until arr.length()).map { jsonValueToKotlin(arr.get(it)) }

private fun jsonValueToKotlin(value: Any): Any? = when (value) {
    JSONObject.NULL -> null
    is JSONObject   -> jsonToMap(value)
    is JSONArray    -> jsonToList(value)
    else            -> value
}
