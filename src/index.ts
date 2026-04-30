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
export type { AppConfig, AppEnvironment, CountryCode, DomainConfig, DomainKey } from './appConfig'
export { AppConfigProvider, useAppConfig } from './AppConfigContext'
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

export function setBaseURL(url: string): void {
  // Strip trailing slash for consistent concatenation
  registry.baseURL = url.replace(/\/$/, '')
}

/**
 * Returns the active base URL:
 * - In native mode: derives from appConfig.activeDomain → domains[].baseURL
 * - Otherwise: returns the JS-side value set by setBaseURL()
 */
export function getBaseURL(): string | null {
  return RNNetworkBridge.getNativeBaseURL() ?? registry.baseURL
}

/** Prepend the active base URL if the given url is a relative path. */
function resolveURL(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = getBaseURL()
  if (!base) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

export async function request(
  url: string,
  method: HttpMethod = 'GET',
  headers: Record<string, string> = {},
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolvedURL = resolveURL(url)

  if (RNNetworkBridge.isAvailable()) {
    return RNNetworkBridge.request(resolvedURL, method, headers, body)
  }

  const mock = registry.jsProvider
  if (__DEV__ && mock) {
    return mock.request(resolvedURL, method, headers, body)
  }

  throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
}
