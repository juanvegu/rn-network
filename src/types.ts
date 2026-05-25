// Standard codes the library guarantees to emit or map.
// Hosts may add their own (prefix recommended, e.g. SCOTIA_KYC_PENDING) via NetworkError.
export type StandardNetworkErrorCode =
  | 'SSL_PINNING_FAILED'
  | 'TIMEOUT'
  | 'NO_CONNECTIVITY'
  | 'HTTP_CLIENT_ERROR'
  | 'HTTP_SERVER_ERROR'
  | 'PROVIDER_NOT_SET'
  | 'SESSION_EXPIRED'
  | 'SESSION_UNAUTHORIZED'
  | 'INVALID_RESPONSE_BODY'
  | 'CANCELLED'
  | 'UNKNOWN'

// Keep autocomplete on standard codes while allowing host-specific extensions.
export type NetworkErrorCode = StandardNetworkErrorCode | (string & {})

export interface NetworkErrorPayload {
  code: NetworkErrorCode
  retryable: boolean
  httpStatus?: number
  message?: string
  info?: Record<string, unknown>
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Envelope returned by `request()`. Consumers read the parsed body via
 * `response.body` and may inspect HTTP metadata via `statusCode`/`headers`
 * (e.g. for `Retry-After`, `X-Trace-Id`, etc.).
 */
export interface NetworkResponse<T = Record<string, unknown>> {
  body: T
  statusCode: number
  headers: Record<string, string>
}

export interface NetworkProvider {
  request(
    url: string,
    method: HttpMethod,
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): Promise<NetworkResponse>
}

export interface MockNetworkProviderConfig {
  routes: Record<string, Record<string, unknown>>
}

/** Options accepted by `request()` per-call. */
export interface RequestOptions {
  /** Override the global timeout (ms). 0 disables the timeout. */
  timeoutMs?: number
  /** Override the auto-generated request ID. */
  requestId?: string
}
