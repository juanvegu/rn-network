package expo.modules.rnnetwork

import com.scotia.rnnetwork.contracts.NetworkError
import expo.modules.kotlin.exception.CodedException
import kotlinx.coroutines.CancellationException
import org.json.JSONObject
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

// Builds the JSON payload the JS side reconstructs from `e.code`.
private fun buildCode(
    code: String,
    retryable: Boolean,
    httpStatus: Int?,
    message: String?,
    info: Map<String, Any?>?,
): String =
    try {
        val obj = JSONObject()
        obj.put("code", code)
        obj.put("retryable", retryable)
        httpStatus?.let { obj.put("httpStatus", it) }
        message?.let { obj.put("message", it) }
        info?.let { obj.put("info", JSONObject(it)) }
        obj.toString()
    } catch (e: Exception) {
        code
    }

class NetworkException(
    networkCode: String,
    retryable: Boolean,
    httpStatus: Int? = null,
    networkMessage: String? = null,
    info: Map<String, Any?>? = null,
) : CodedException(
    buildCode(networkCode, retryable, httpStatus, networkMessage, info),
    networkMessage ?: "Network error: $networkCode",
    null,
)

object NetworkErrorMapper {
    fun map(error: Throwable): NetworkException {
        if (error is NetworkException) return error

        // Typed error coming from the host's provider — pass it through verbatim.
        if (error is NetworkError) {
            return NetworkException(
                networkCode = error.code,
                retryable = error.retryable,
                httpStatus = error.httpStatus,
                networkMessage = error.message,
                info = error.info,
            )
        }

        return when (error) {
            // Coroutine cooperative cancellation flows here when the request is aborted.
            is CancellationException ->
                NetworkException("CANCELLED", retryable = false)
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
