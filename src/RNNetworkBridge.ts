import { requireNativeModule } from 'expo-modules-core'
import type { NetworkErrorPayload } from './types'

interface NativeBridge {
  request(
    url: string,
    headers: Record<string, string>
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

function isPayload(e: unknown): e is NetworkErrorPayload {
  return typeof e === 'object' && e !== null && typeof (e as NetworkErrorPayload).code === 'string'
}

export const RNNetworkBridge = {
  // The native module must be registered AND have request() implemented.
  // The placeholder from Step 1 registers the module without request() → false.
  // After Step 4 (request() implemented) → true.
  isAvailable(): boolean {
    const mod = load()
    return mod !== null && typeof mod.request === 'function'
  },

  async request(
    url: string,
    headers: Record<string, string>
  ): Promise<Record<string, unknown>> {
    const mod = load()
    if (!mod) {
      throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
    }
    try {
      return await mod.request(url, headers)
    } catch (e) {
      // Errors already formatted by NetworkErrorMapper (Step 4+) pass through directly.
      // Any other unexpected error is mapped to UNKNOWN.
      if (isPayload(e)) throw e
      throw { code: 'UNKNOWN', retryable: false } satisfies NetworkErrorPayload
    }
  },
}
