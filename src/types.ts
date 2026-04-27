export type NetworkErrorCode =
  | 'SSL_PINNING_FAILED'
  | 'TIMEOUT'
  | 'NO_CONNECTIVITY'
  | 'HTTP_CLIENT_ERROR'
  | 'HTTP_SERVER_ERROR'
  | 'PROVIDER_NOT_SET'
  | 'UNKNOWN'

export interface NetworkErrorPayload {
  code: NetworkErrorCode
  retryable: boolean
  httpStatus?: number
}

export interface NetworkProvider {
  request(
    url: string,
    headers: Record<string, string>
  ): Promise<Record<string, unknown>>
}

export interface MockNetworkProviderConfig {
  routes: Record<string, Record<string, unknown>>
}
