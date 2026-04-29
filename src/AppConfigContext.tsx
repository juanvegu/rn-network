import React, { createContext, useCallback, useContext, useState } from 'react'
import type { AppConfig, DomainKey } from './appConfig'
import { RNNetworkBridge } from './RNNetworkBridge'

interface AppConfigContextValue {
  config: AppConfig
  setActiveDomain: (key: DomainKey) => void
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null)

interface AppConfigProviderProps {
  initialConfig: AppConfig
  children: React.ReactNode
}

export function AppConfigProvider({ initialConfig, children }: AppConfigProviderProps) {
  const [config, setConfig] = useState<AppConfig>(initialConfig)

  const setActiveDomain = useCallback((key: DomainKey) => {
    RNNetworkBridge.setActiveDomain(key)
    setConfig((prev) => ({ ...prev, activeDomain: key }))
  }, [])

  return (
    <AppConfigContext.Provider value={{ config, setActiveDomain }}>
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used inside AppConfigProvider')
  return ctx
}
