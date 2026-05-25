import React, { createContext, useCallback, useContext, useState } from 'react'
import type { AppConfig, DomainKey } from './appConfig'
import { RNNetworkBridge } from './RNNetworkBridge'

interface AppConfigContextValue {
  config: AppConfig
  /** Domain key currently selected for the RN flow. May be undefined if the host did not set one. */
  activeDomain: DomainKey | undefined
  setActiveDomain: (key: DomainKey) => void
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null)

interface AppConfigProviderProps {
  initialConfig: AppConfig
  initialActiveDomain?: DomainKey
  children: React.ReactNode
}

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

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used inside AppConfigProvider')
  return ctx
}
