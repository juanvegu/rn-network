import { RNNetworkBridge } from './RNNetworkBridge'
import { registry } from './RNNetworkRegistry'
import type {
  HttpMethod,
  NetworkErrorPayload,
  NetworkProvider,
  NetworkResponse,
  RequestOptions,
} from './types'

export type {
  NetworkErrorCode,
  StandardNetworkErrorCode,
  NetworkErrorPayload,
  NetworkProvider,
  NetworkResponse,
  HttpMethod,
  MockNetworkProviderConfig,
  RequestOptions,
} from './types'
export type { AppConfig, CountryCode, DomainConfig, DomainKey } from './appConfig'
export { parseAppConfig } from './appConfig'
export { AppConfigProvider, useAppConfig } from './AppConfigContext'
export { RNNetworkBridge }
export { MockNetworkProvider } from './MockNetworkProvider'

/** Default timeout applied to all requests. 0 disables the client-side timeout. */
const DEFAULT_TIMEOUT_MS = 30_000

let globalTimeoutMs: number = DEFAULT_TIMEOUT_MS

/** Override the default per-request timeout in milliseconds. Pass 0 to disable. */
export function setRequestTimeout(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return
  globalTimeoutMs = ms
}

export function getRequestTimeout(): number {
  return globalTimeoutMs
}

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
 * - In native mode: derives from `RNNetworkRegistry.activeDomain` → domain's baseURL
 * - Otherwise: returns the JS-side value set by `setBaseURL()`
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

/**
 * Generates an opaque request ID used only to correlate a `request()` call
 * with a later `cancel(requestId)`. Not cryptographic.
 *
 * Uses `crypto.randomUUID()` when available (RN 0.74+ / Expo SDK 51+, all
 * modern browsers). Falls back to a timestamp + random suffix on older
 * runtimes — uniqueness is only required within a single JS session.
 */
function generateRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )
}

/**
 * Wrap a promise with a timeout that throws `TIMEOUT` and best-effort cancels
 * the underlying native request. Returns the original promise unchanged when
 * `timeoutMs <= 0`.
 */
function withTimeout<T>(p: Promise<T>, timeoutMs: number, requestId: string): Promise<T> {
  if (timeoutMs <= 0) return p
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      // Best effort: ask the provider to cancel; ignore failures.
      void cancelRequest(requestId)
      reject({ code: 'TIMEOUT', retryable: true } satisfies NetworkErrorPayload)
    }, timeoutMs)

    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

export async function request<T = Record<string, unknown>>(
  url: string,
  method: HttpMethod = 'GET',
  headers: Record<string, string> = {},
  body?: Record<string, unknown>,
  options: RequestOptions = {}
): Promise<NetworkResponse<T>> {
  const resolvedURL = resolveURL(url)
  const requestId = options.requestId ?? generateRequestId()
  const timeoutMs = options.timeoutMs ?? globalTimeoutMs

  // If the host registered a native provider, that wins.
  if (RNNetworkBridge.isAvailable()) {
    return withTimeout(
      RNNetworkBridge.request(requestId, resolvedURL, method, headers, body),
      timeoutMs,
      requestId
    ) as Promise<NetworkResponse<T>>
  }

  // Otherwise fall back to whatever JS provider the app registered (typically a mock).
  // The app is responsible for not registering a mock in production builds where it
  // would shadow a missing native provider.
  const jsProvider = registry.jsProvider
  if (jsProvider) {
    return withTimeout(
      jsProvider.request(resolvedURL, method, headers, body),
      timeoutMs,
      requestId
    ) as Promise<NetworkResponse<T>>
  }

  throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
}
