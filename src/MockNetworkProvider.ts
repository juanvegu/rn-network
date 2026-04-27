import type { HttpMethod, MockNetworkProviderConfig, NetworkErrorPayload, NetworkProvider } from './types'

export class MockNetworkProvider implements NetworkProvider {
  private routes: Map<string, Record<string, unknown>>

  constructor(config: MockNetworkProviderConfig) {
    this.routes = new Map(Object.entries(config.routes))
  }

  async request(
    url: string,
    _method: HttpMethod,
    _headers: Record<string, string>,
    _body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    let bestMatch: string | null = null

    for (const pattern of this.routes.keys()) {
      if (url.includes(pattern)) {
        if (bestMatch === null || pattern.length > bestMatch.length) {
          bestMatch = pattern
        }
      }
    }

    if (bestMatch === null) {
      throw { code: 'UNKNOWN', retryable: false } satisfies NetworkErrorPayload
    }

    return this.routes.get(bestMatch)!
  }
}
