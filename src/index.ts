import { RNNetworkBridge } from './RNNetworkBridge'
import { registry } from './RNNetworkRegistry'
import type { HttpMethod, NetworkErrorPayload, NetworkProvider } from './types'

export type {
  NetworkErrorCode,
  StandardNetworkErrorCode,
  NetworkErrorPayload,
  NetworkProvider,
  HttpMethod,
  MockNetworkProviderConfig,
} from './types'
export type { AppConfig, CountryCode, DomainConfig, DomainKey } from './appConfig'
export { parseAppConfig } from './appConfig'
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

/** Cancel an in-flight request by ID (no-op if the provider doesn't override cancel). */
export function cancelRequest(requestId: string): Promise<void> {
  return RNNetworkBridge.cancel(requestId)
}

/**
 * Subscribe to session-expired events emitted by the native host.
 * Returns an unsubscribe function.
 */
export function onSessionExpired(handler: () => void): () => void {
  return RNNetworkBridge.onSessionExpired(handler)
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

  // If the host registered a native provider, that wins.
  if (RNNetworkBridge.isAvailable()) {
    return RNNetworkBridge.request(resolvedURL, method, headers, body)
  }

  // Otherwise fall back to whatever JS provider the app registered (typically a mock).
  // The app is responsible for not registering a mock in production builds.
  const jsProvider = registry.jsProvider
  if (jsProvider) {
    return jsProvider.request(resolvedURL, method, headers, body)
  }

  throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
}
