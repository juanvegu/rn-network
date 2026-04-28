package com.scotia.rnnetwork

interface NetworkProvider {
    suspend fun request(
        url: String,
        method: String,
        headers: Map<String, String>,
        body: Map<String, Any?>?
    ): ByteArray
}

object RNNetworkRegistry {
    var provider: NetworkProvider? = null
}
