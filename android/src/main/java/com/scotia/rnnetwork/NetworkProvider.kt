package com.scotia.rnnetwork

interface NetworkProvider {
    suspend fun request(url: String, method: String, headers: Map<String, String>, body: Map<String, Any?>?): ByteArray
}

interface CancellableNetworkProvider : NetworkProvider {
    fun cancel(requestId: String)
}
