import type { HttpMethod, MockNetworkProviderConfig, NetworkErrorPayload, NetworkProvider } from './types'

/**
 * Lightweight in-memory mock used when the native provider is not registered.
 *
 * Route keys may be:
 * - `'/path'` — matches any HTTP method (legacy form)
 * - `'GET /path'` — matches only the specified method
 *
 * Route values may be:
 * - a JSON object — returned as the response body
 * - a `NetworkErrorPayload` (object with `code` and `retryable`) — thrown as an error
 *   (useful to exercise SESSION_EXPIRED / TIMEOUT paths in tests)
 */
export class MockNetworkProvider implements NetworkProvider {
  private routes: Map<string, Record<string, unknown>>

  constructor(config: MockNetworkProviderConfig) {
    this.routes = new Map(Object.entries(config.routes))
  }

  async request(
    url: string,
    method: HttpMethod,
    _headers: Record<string, string>,
    _body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const match = this.findRoute(method, url)

    if (match === null) {
      throw { code: 'UNKNOWN', retryable: false } satisfies NetworkErrorPayload
    }

    const response = this.routes.get(match)!
    if (isErrorPayload(response)) throw response as unknown as NetworkErrorPayload
    return response
  }

  private findRoute(method: HttpMethod, url: string): string | null {
    let bestMatch: string | null = null
    let bestLength = -1

    for (const pattern of this.routes.keys()) {
      const { method: patternMethod, path } = splitPattern(pattern)
      if (patternMethod && patternMethod !== method) continue
      if (!url.includes(path)) continue
      if (path.length > bestLength) {
        bestMatch = pattern
        bestLength = path.length
      }
    }
    return bestMatch
  }
}

function splitPattern(pattern: string): { method: HttpMethod | null; path: string } {
  const space = pattern.indexOf(' ')
  if (space === -1) return { method: null, path: pattern }
  const head = pattern.slice(0, space).toUpperCase()
  const rest = pattern.slice(space + 1)
  if (head === 'GET' || head === 'POST' || head === 'PUT' || head === 'PATCH' || head === 'DELETE') {
    return { method: head, path: rest }
  }
  return { method: null, path: pattern }
}

function isErrorPayload(v: Record<string, unknown>): boolean {
  return typeof v.code === 'string' && typeof v.retryable === 'boolean'
}
