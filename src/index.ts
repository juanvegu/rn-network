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

/** Default client-side timeout applied to all requests when none is specified. */
const DEFAULT_TIMEOUT_MS = 30_000

let globalTimeoutMs: number = DEFAULT_TIMEOUT_MS

/**
 * Override the default per-request timeout, in milliseconds.
 *
 * - Applies to every subsequent `request()` call that does not pass an explicit
 *   `options.timeoutMs`.
 * - Pass `0` to disable the client-side timeout entirely (the request will
 *   only resolve when the native side responds).
 * - Values that are not finite numbers or are negative are silently ignored.
 *
 * @example
 * setRequestTimeout(15_000) // 15 seconds
 * setRequestTimeout(0)      // disable
 */
export function setRequestTimeout(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return
  globalTimeoutMs = ms
}

/** Returns the current global request timeout in milliseconds. */
export function getRequestTimeout(): number {
  return globalTimeoutMs
}

/**
 * Register a JS-side `NetworkProvider`. Used to install the
 * `MockNetworkProvider` when the host did not register a native provider.
 *
 * The JS provider is only consulted when `isAvailable()` returns `false`
 * — a native provider always wins.
 */
export function setProvider(provider: NetworkProvider): void {
  registry.jsProvider = provider
}

/** Returns true if a JS-side provider has been registered via `setProvider`. */
export function hasProvider(): boolean {
  return registry.hasProvider()
}

/**
 * Returns true if the host's native provider is available — i.e. the native
 * module is linked AND `RNNetworkRegistry.provider` has been assigned.
 */
export function isAvailable(): boolean {
  return RNNetworkBridge.isAvailable()
}

/**
 * Override the JS-side base URL used when no native provider is available.
 *
 * Has no effect in native mode — there the base URL is derived from
 * `RNNetworkRegistry.activeDomain` and the matching `domains[].baseURL` set
 * by the host. Trailing slashes are stripped.
 */
export function setBaseURL(url: string): void {
  registry.baseURL = url.replace(/\/$/, '')
}

/**
 * Returns the active base URL.
 *
 * - In native mode: derives from the native registry (`activeDomain` →
 *   `domains[].baseURL`).
 * - Otherwise: returns the JS-side value set by `setBaseURL()` or `null` if
 *   none was set.
 */
export function getBaseURL(): string | null {
  return RNNetworkBridge.getNativeBaseURL() ?? registry.baseURL
}

/**
 * Cancel an in-flight request by ID. The provider's `cancel` is best-effort
 * — if the host did not override it, this resolves without doing anything.
 *
 * The ID must be the same one used (or returned) when `request()` was called.
 */
export function cancelRequest(requestId: string): Promise<void> {
  return RNNetworkBridge.cancel(requestId)
}

/**
 * Subscribe to session-expired events emitted by the native host.
 *
 * The host calls `RNNetworkRegistry.onSessionExpired?()` when it detects the
 * user session is no longer valid (e.g. after returning from background and
 * the auth token has been invalidated). The RN module forwards that signal
 * to JS as a `sessionExpired` event.
 *
 * @returns an unsubscribe function. Always call it on cleanup to avoid
 *          double-invocation when the component remounts.
 *
 * @example
 * useEffect(() => onSessionExpired(() => router.replace('/logout')), [])
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
      void cancelRequest(requestId)
      reject({ code: 'TIMEOUT', retryable: true } satisfies NetworkErrorPayload)
    }, timeoutMs)

    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

/**
 * Perform an HTTP request through the host's native provider, or through the
 * JS-side `MockNetworkProvider` when no native provider is registered.
 *
 * **Resolution rules:**
 * - `2xx` → resolves with `{ body, statusCode, headers }`.
 * - `204` or empty body → `body` is `{}`.
 * - Non-`2xx` → rejects with `{ code: 'HTTP_CLIENT_ERROR' | 'HTTP_SERVER_ERROR', retryable, httpStatus }`.
 * - Host throws a typed `NetworkError` (e.g. `SESSION_EXPIRED`) → rejects with
 *   that exact payload, including any `message`/`info` the host attached.
 * - System-level failures (SSL, connectivity, timeout, cancellation) → rejects
 *   with a standard code (`SSL_PINNING_FAILED`, `NO_CONNECTIVITY`, `TIMEOUT`,
 *   `CANCELLED`).
 *
 * **Client timeout:** every call races against `options.timeoutMs ?? globalTimeoutMs`.
 * If the timeout wins, the JS side throws `TIMEOUT` and best-effort calls the
 * provider's `cancel(requestId)`.
 *
 * @typeParam T — shape of the JSON body returned by the BFF. Defaults to
 *                `Record<string, unknown>`.
 *
 * @example
 * const res = await request<{ brands: Brand[] }>('/v1/brands', 'GET')
 * console.log(res.body.brands, res.statusCode, res.headers['x-trace-id'])
 *
 * @example  // per-call timeout + manual request ID
 * const id = '...'
 * try {
 *   await request('/v1/slow', 'GET', {}, undefined, { timeoutMs: 5_000, requestId: id })
 * } catch (e) {
 *   if (e.code === 'TIMEOUT') { ... }
 * }
 */
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

  if (RNNetworkBridge.isAvailable()) {
    return withTimeout(
      RNNetworkBridge.request(requestId, resolvedURL, method, headers, body),
      timeoutMs,
      requestId
    ) as Promise<NetworkResponse<T>>
  }

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
