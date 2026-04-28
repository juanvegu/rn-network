package expo.modules.rnnetwork

import com.scotia.rnnetwork.NetworkProvider
import com.scotia.rnnetwork.RNNetworkRegistry
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
