import { requireNativeModule } from 'expo-modules-core'
import type { HttpMethod, NetworkErrorPayload } from './types'

interface NativeBridge {
  hasNativeProvider(): boolean
  getNativeBaseURL(): string | null
  getNativeAppConfig(): Record<string, unknown> | null
  setActiveDomain(key: string): void
  getBaseURLForDomain(key: string): string | null
  request(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | null
  ): Promise<Record<string, unknown>>
}

let _native: NativeBridge | null | undefined = undefined

function load(): NativeBridge | null {
  if (_native !== undefined) return _native
  try {
    _native = requireNativeModule<NativeBridge>('RNNetworkModule')
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
  // placeholder (without hasNativeProvider): false → mock active in __DEV__
  isAvailable(): boolean {
    const mod = load()
    if (!mod) return false
    try {
      return typeof mod.hasNativeProvider === 'function' && mod.hasNativeProvider()
    } catch {
      return false
    }
  },

  getNativeBaseURL(): string | null {
    const mod = load()
    if (!mod) return null
    try {
      return typeof mod.getNativeBaseURL === 'function' ? mod.getNativeBaseURL() : null
    } catch {
      return null
    }
  },

  getNativeAppConfig(): Record<string, unknown> | null {
    const mod = load()
    if (!mod) return null
    try {
      return typeof mod.getNativeAppConfig === 'function' ? mod.getNativeAppConfig() : null
    } catch {
      return null
    }
  },

  setActiveDomain(key: string): void {
    const mod = load()
    if (!mod) return
    try {
      if (typeof mod.setActiveDomain === 'function') mod.setActiveDomain(key)
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
    } catch (e: any) {
      if (isPayload(e)) throw e

      if (typeof e?.code === 'string') {
        let parsed: unknown
        try { parsed = JSON.parse(e.code) } catch { /* invalid JSON in code */ }
        if (isPayload(parsed)) throw parsed
      }

      throw { code: 'UNKNOWN', retryable: false } satisfies NetworkErrorPayload
    }
  },
}
