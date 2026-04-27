import { RNNetworkBridge } from './RNNetworkBridge'
import { registry } from './RNNetworkRegistry'
import type { HttpMethod, NetworkErrorPayload, NetworkProvider } from './types'

export type {
  NetworkErrorCode,
  NetworkErrorPayload,
  NetworkProvider,
  HttpMethod,
  MockNetworkProviderConfig,
} from './types'
export { RNNetworkBridge }
export { MockNetworkProvider } from './MockNetworkProvider'

export function setProvider(provider: NetworkProvider): void {
  registry.jsProvider = provider
}

export function hasProvider(): boolean {
  return registry.hasProvider()
}

export function isAvailable(): boolean {
  return RNNetworkBridge.isAvailable()
}

export async function request(
  url: string,
  method: HttpMethod = 'GET',
  headers: Record<string, string> = {},
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (RNNetworkBridge.isAvailable()) {
    return RNNetworkBridge.request(url, method, headers, body)
  }

  const mock = registry.jsProvider
  if (__DEV__ && mock) {
    return mock.request(url, method, headers, body)
  }

  throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
}
