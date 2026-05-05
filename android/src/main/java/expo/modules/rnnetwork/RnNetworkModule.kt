package expo.modules.rnnetwork

import com.scotia.rnnetwork.contracts.NetworkProvider
import com.scotia.rnnetwork.contracts.RNNetworkRegistry
import com.scotia.rnnetwork.contracts.CancellableNetworkProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class RNNetworkModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("RNNetworkModule")

        Function("hasNativeProvider") {
            RNNetworkRegistry.provider != null
        }

        Function("debugIdentity") {
            "registryId=${System.identityHashCode(RNNetworkRegistry)} " +
                "classloader=${RNNetworkRegistry::class.java.classLoader}"
        }

        Function("getNativeAppConfig") {
            RNNetworkRegistry.appConfig
        }

        Function("getBaseURLForDomain") { domainKey: String ->
            @Suppress("UNCHECKED_CAST")
            val domains = RNNetworkRegistry.appConfig?.get("domains") as? List<Map<String, String>>
            domains?.firstOrNull { it["key"] == domainKey }?.get("baseURL")
        }

        AsyncFunction("setActiveDomain") { domainKey: String ->
            val config = RNNetworkRegistry.appConfig?.toMutableMap() ?: return@AsyncFunction
            @Suppress("UNCHECKED_CAST")
            val domains = config["domains"] as? List<Map<String, String>> ?: return@AsyncFunction
            val match = domains.firstOrNull { it["key"] == domainKey } ?: return@AsyncFunction
            val baseURL = match["baseURL"] ?: return@AsyncFunction
            config["activeDomain"] = domainKey
            config["baseURL"] = baseURL
            RNNetworkRegistry.appConfig = config
        }

        AsyncFunction("request") { url: String, method: String, headers: Map<String, String>, body: Map<String, Any?>? ->
            val provider = RNNetworkRegistry.provider
                ?: throw NetworkException("PROVIDER_NOT_SET", retryable = false)

            val bytes = try {
                provider.request(url, method, headers, body)
            } catch (e: Throwable) {
                throw NetworkErrorMapper.map(e)
            }

            val json = try {
                JSONObject(String(bytes, Charsets.UTF_8))
            } catch (e: Exception) {
                throw NetworkException("UNKNOWN", retryable = false)
            }

            jsonToMap(json)
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
