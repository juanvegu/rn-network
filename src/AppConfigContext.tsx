import React, { createContext, useCallback, useContext, useState } from 'react'
import type { AppConfig, DomainKey } from './appConfig'
import { RNNetworkBridge } from './RNNetworkBridge'

/**
 * Value exposed by the AppConfig context.
 *
 * - `config`: the static description of available domains for the RN flow.
 *   Always defined; falls back to whatever the app passed as `initialConfig`.
 * - `activeDomain`: the domain key currently selected. May be `undefined` if
 *   the host did not declare one and the app didn't pass `initialActiveDomain`.
 * - `setActiveDomain`: switch domains at runtime. Validates that `key` exists
 *   in `config.domains` and propagates the change to the native registry.
 */
interface AppConfigContextValue {
  config: AppConfig
  activeDomain: DomainKey | undefined
  setActiveDomain: (key: DomainKey) => void
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null)

interface AppConfigProviderProps {
  initialConfig: AppConfig
  initialActiveDomain?: DomainKey
  children: React.ReactNode
}

/**
 * Wraps the React tree with the app config context.
 *
 * Typically used at the root layout. `initialConfig` and `initialActiveDomain`
 * are read once at startup from either the native registry (via
 * `RNNetworkBridge.getNativeAppConfig()` + `getNativeActiveDomain()`) or a
 * local fallback used in dev.
 *
 * @example
 * const config = RNNetworkBridge.getNativeAppConfig() ?? fallbackDevConfig
 * const active = RNNetworkBridge.getNativeActiveDomain() ?? 'BFF'
 * <AppConfigProvider initialConfig={config} initialActiveDomain={active}>...
 */
export function AppConfigProvider({ initialConfig, initialActiveDomain, children }: AppConfigProviderProps) {
  const [config] = useState<AppConfig>(initialConfig)
  const [activeDomain, setActiveDomainState] = useState<DomainKey | undefined>(initialActiveDomain)

  const setActiveDomain = useCallback((key: DomainKey) => {
    if (!config.domains.some((d) => d.key === key)) return
    RNNetworkBridge.setActiveDomain(key)
    setActiveDomainState(key)
  }, [config.domains])

  return (
    <AppConfigContext.Provider value={{ config, activeDomain, setActiveDomain }}>
      {children}
    </AppConfigContext.Provider>
  )
}

/**
 * Hook to read and mutate the app config from any component beneath
 * `<AppConfigProvider>`. Throws if used outside the provider.
 */
export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used inside AppConfigProvider')
  return ctx
}
