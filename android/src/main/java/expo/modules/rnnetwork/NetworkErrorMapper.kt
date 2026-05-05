package expo.modules.rnnetwork

import expo.modules.kotlin.exception.CodedException
import org.json.JSONObject
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

// Función privada de paquete para construir el código JSON — se llama desde el constructor de NetworkException.
private fun buildCode(code: String, retryable: Boolean, httpStatus: Int?): String =
    try {
        val obj = JSONObject()
        obj.put("code", code)
        obj.put("retryable", retryable)
        httpStatus?.let { obj.put("httpStatus", it) }
        obj.toString()
    } catch (e: Exception) {
        code
    }

// El campo code lleva el NetworkErrorPayload completo como JSON.
// El lado JS parsea e.code para reconstruir { code, retryable, httpStatus? }.
class NetworkException(
    networkCode: String,
    retryable: Boolean,
    httpStatus: Int? = null
) : CodedException(
    buildCode(networkCode, retryable, httpStatus),
    "Network error: $networkCode",
    null
)

object NetworkErrorMapper {
    fun map(error: Throwable): NetworkException {
        if (error is NetworkException) return error
        return when (error) {
            is SSLException ->
                NetworkException("SSL_PINNING_FAILED", retryable = false)
            is SocketTimeoutException ->
                NetworkException("TIMEOUT", retryable = true)
            is UnknownHostException ->
                NetworkException("NO_CONNECTIVITY", retryable = true)
            is java.io.IOException -> {
                val message = error.message.orEmpty()
                val httpDomainStatus = message
                    .substringAfter("com.scotia.rnnetwork.http:", "")
                    .toIntOrNull()
                when {
                    httpDomainStatus != null -> when (httpDomainStatus) {
                        in 400..499 -> NetworkException("HTTP_CLIENT_ERROR", retryable = false, httpStatus = httpDomainStatus)
                        in 500..599 -> NetworkException("HTTP_SERVER_ERROR", retryable = true, httpStatus = httpDomainStatus)
                        else -> NetworkException("HTTP_ERROR", retryable = false, httpStatus = httpDomainStatus)
                    }
                    message.contains("timeout", ignoreCase = true) ->
                        NetworkException("TIMEOUT", retryable = true)
                    message.contains("unable to resolve", ignoreCase = true) ||
                    message.contains("no route to host", ignoreCase = true) ->
                        NetworkException("NO_CONNECTIVITY", retryable = true)
                    else ->
                        NetworkException("UNKNOWN", retryable = false)
                }
            }
            else -> NetworkException("UNKNOWN", retryable = false)
        }
    }
}
