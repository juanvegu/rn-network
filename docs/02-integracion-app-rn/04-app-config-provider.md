# AppConfigProvider y dominios

`@scotia/rn-network` expone un React context (`AppConfigProvider`) y un hook (`useAppConfig`) para que la app RN lea y modifique la configuración de dominios en runtime.

## Setup en `_layout.tsx`

```typescript
import { AppConfigProvider, RNNetworkBridge } from '@scotia/rn-network'
import type { AppConfig } from '@scotia/rn-network'

// Una sola vez al inicio.
const config: AppConfig = RNNetworkBridge.getNativeAppConfig() ?? fallbackDevConfig
const initialActiveDomain = RNNetworkBridge.getNativeActiveDomain() ?? 'BFF'

export default function RootLayout() {
  return (
    <AppConfigProvider initialConfig={config} initialActiveDomain={initialActiveDomain}>
      <Stack>…</Stack>
    </AppConfigProvider>
  )
}
```

`RNNetworkBridge.getNativeAppConfig()` y `getNativeActiveDomain()` retornan los valores que el host nativo asignó en `RNNetworkRegistry`. Si la app corre sin host (dev), retornan `null` y se cae al `fallbackDevConfig` local.

## Leer config en componentes

```typescript
import { useAppConfig } from '@scotia/rn-network'

function DomainBadge() {
  const { config, activeDomain } = useAppConfig()
  return (
    <Text>
      {config.country} · {config.environment} · {activeDomain ?? '—'}
    </Text>
  )
}
```

## Cambiar el dominio activo

```typescript
function DomainPicker() {
  const { config, activeDomain, setActiveDomain } = useAppConfig()

  return config.domains.map(d => (
    <Pressable key={d.key} onPress={() => setActiveDomain(d.key)}>
      <Text>
        {d.key === activeDomain ? '✓ ' : ''}{d.key} — {d.baseURL}
      </Text>
    </Pressable>
  ))
}
```

`setActiveDomain(key)`:

1. Valida que `key` exista en `config.domains` — si no, no-op silencioso.
2. Llama `RNNetworkBridge.setActiveDomain(key)` que propaga al `RNNetworkRegistry.activeDomain` nativo.
3. Actualiza el estado React local.

Después de esto, `getBaseURL()` y futuros `request('/relative-path')` usan el nuevo dominio.

## Fallback dev

Cuando no hay host nativo, definir un fallback local que cumpla la interfaz:

```typescript
// src/config/devConfig.ts
import type { AppConfig } from '@scotia/rn-network'

export const fallbackDevConfig: AppConfig = {
  country: 'CL',
  environment: 'debug',
  domains: [{ key: 'BFF', baseURL: 'http://localhost:8080' }],
}

export const fallbackDevActiveDomain = 'BFF'
```

## Por qué `activeDomain` es separado

Ver [01 · Modelo de dominios](../01-arquitectura/03-modelo-de-dominios.md) para el razonamiento completo: `AppConfig` es declarativo e inmutable; `activeDomain` es estado mutable que vive aparte.
