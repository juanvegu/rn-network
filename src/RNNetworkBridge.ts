import { requireNativeModule } from 'expo-modules-core'
import type { EventSubscription } from 'expo-modules-core'
import { parseAppConfig, type AppConfig } from './appConfig'
import type { HttpMethod, NetworkErrorPayload } from './types'

interface NativeBridge {
  hasNativeProvider(): boolean
  getNativeAppConfig(): Record<string, unknown> | null
  getNativeActiveDomain(): string | null
  setActiveDomain(key: string): Promise<void>
  getBaseURLForDomain(key: string): string | null
  cancel(requestId: string): Promise<void>
  addListener(eventName: string): void
  removeListeners(count: number): void
  request(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | null
  ): Promise<Record<string, unknown>>
}

interface NativeEventEmitter {
  addListener(eventName: string, listener: (...args: unknown[]) => void): EventSubscription
}

let _native: (NativeBridge & Partial<NativeEventEmitter>) | null | undefined = undefined

function load(): (NativeBridge & Partial<NativeEventEmitter>) | null {
  if (_native !== undefined) return _native
  try {
    _native = requireNativeModule<NativeBridge & Partial<NativeEventEmitter>>('RNNetworkModule')
  } catch {
    _native = null
  }
  return _native
}

// Requires retryable: boolean to distinguish real payloads from Expo errors
// (Expo exceptions only have .code, not .retryable).
function isPayload(e: unknown): e is NetworkErrorPayload {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as NetworkErrorPayload).code === 'string' &&
    typeof (e as NetworkErrorPayload).retryable === 'boolean'
  )
}

export const RNNetworkBridge = {
  // "available" = the module is linked AND the native side has a registered provider.
  isAvailable(): boolean {
    const mod = load()
    if (!mod) return false
    try {
      return typeof mod.hasNativeProvider === 'function' && mod.hasNativeProvider()
    } catch {
      return false
    }
  },

  getNativeAppConfig(): AppConfig | null {
    const mod = load()
    if (!mod) return null
    try {
      const raw = typeof mod.getNativeAppConfig === 'function' ? mod.getNativeAppConfig() : null
      return parseAppConfig(raw)
    } catch {
      return null
    }
  },

  getNativeActiveDomain(): string | null {
    const mod = load()
    if (!mod) return null
    try {
      return typeof mod.getNativeActiveDomain === 'function' ? mod.getNativeActiveDomain() : null
    } catch {
      return null
    }
  },

  getNativeBaseURL(): string | null {
    const config = this.getNativeAppConfig()
    const activeDomain = this.getNativeActiveDomain()
    if (!config || !activeDomain) return null
    return config.domains.find((d) => d.key === activeDomain)?.baseURL ?? null
  },

  async setActiveDomain(key: string): Promise<void> {
    const mod = load()
    if (!mod) return
    try {
      if (typeof mod.setActiveDomain === 'function') await mod.setActiveDomain(key)
    } catch { /* no-op in dev/mock mode */ }
  },

  getBaseURLForDomain(key: string): string | null {
    const mod = load()
    if (!mod) return null
    try {
      return typeof mod.getBaseURLForDomain === 'function' ? mod.getBaseURLForDomain(key) : null
    } catch {
      return null
    }
  },

  async cancel(requestId: string): Promise<void> {
    const mod = load()
    if (!mod) return
    try {
      if (typeof mod.cancel === 'function') await mod.cancel(requestId)
    } catch { /* no-op */ }
  },

  onSessionExpired(handler: () => void): () => void {
    const mod = load()
    if (!mod || typeof mod.addListener !== 'function') {
      return () => {}
    }
    const subscription = mod.addListener('sessionExpired', () => handler())
    return () => subscription.remove()
  },

  async request(
    url: string,
    method: HttpMethod,
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const mod = load()
    if (!mod) {
      throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
    }
    try {
      return await mod.request(url, method, headers, body ?? null)
    } catch (e: unknown) {
      if (isPayload(e)) throw e

      const err = e as { code?: unknown }
      if (typeof err?.code === 'string') {
        let parsed: unknown
        try { parsed = JSON.parse(err.code) } catch { /* invalid JSON in code */ }
        if (isPayload(parsed)) throw parsed
      }

      throw { code: 'UNKNOWN', retryable: false } satisfies NetworkErrorPayload
    }
  },
}
