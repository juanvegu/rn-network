import { RNNetworkBridge } from './RNNetworkBridge'
import { registry } from './RNNetworkRegistry'
import type { NetworkErrorPayload, NetworkProvider } from './types'

export type {
  NetworkErrorCode,
  NetworkErrorPayload,
  NetworkProvider,
  MockNetworkProviderConfig,
} from './types'
export { RNNetworkBridge }

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
  headers: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  if (RNNetworkBridge.isAvailable()) {
    return RNNetworkBridge.request(url, headers)
  }

  const mock = registry.jsProvider
  if (__DEV__ && mock) {
    return mock.request(url, headers)
  }

  throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
}
