import { requireNativeModule } from 'expo-modules-core'
import type { HttpMethod, NetworkErrorPayload } from './types'

interface NativeBridge {
  hasNativeProvider(): boolean
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
