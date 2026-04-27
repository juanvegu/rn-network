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

export const RNNetworkBridge = {
  isAvailable(): boolean {
    return load() !== null
  },

  async request(
    url: string,
    headers: Record<string, string>
  ): Promise<Record<string, unknown>> {
    const mod = load()
    if (!mod) {
      throw { code: 'PROVIDER_NOT_SET', retryable: false } satisfies NetworkErrorPayload
    }
    return mod.request(url, headers)
  },
}
