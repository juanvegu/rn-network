import type { NetworkProvider } from './types'

class RNNetworkRegistryClass {
  jsProvider: NetworkProvider | null = null
  baseURL: string | null = null

  hasProvider(): boolean {
    return this.jsProvider !== null
  }
}

export const registry = new RNNetworkRegistryClass()
