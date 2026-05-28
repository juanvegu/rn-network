# Ejemplo completo

Walkthrough end-to-end de una app RN con `@scotia/rn-network`: setup, layout root, service layer, pantalla que consume.

## `src/networkConfig.ts`

```typescript
import { setProvider, setBaseURL, isAvailable, MockNetworkProvider, setRequestTimeout } from '@scotia/rn-network'

export function initNetworkConfig() {
  setRequestTimeout(20_000)
  if (__DEV__) setBaseURL('http://localhost:8080')

  if (!isAvailable()) {
    setProvider(new MockNetworkProvider({
      routes: {
        'GET /v1/brands':            require('./mocks/brands.json'),
        'GET /v1/brands/2/models':   require('./mocks/models.json'),
      },
    }))
  }
}
```

## `src/config/devConfig.ts`

```typescript
import type { AppConfig } from '@scotia/rn-network'

export const fallbackDevConfig: AppConfig = {
  country: 'CL',
  environment: 'debug',
  domains: [{ key: 'BFF', baseURL: 'http://localhost:8080' }],
}

export const fallbackDevActiveDomain = 'BFF'
```

## `src/app/_layout.tsx`

```typescript
import { useEffect } from 'react'
import { Alert } from 'react-native'
import { AppConfigProvider, RNNetworkBridge, onSessionExpired } from '@scotia/rn-network'
import type { AppConfig } from '@scotia/rn-network'
import { router, Stack } from 'expo-router'
import { initNetworkConfig } from '../networkConfig'
import { fallbackDevConfig, fallbackDevActiveDomain } from '../config/devConfig'

initNetworkConfig()

const initialConfig: AppConfig = RNNetworkBridge.getNativeAppConfig() ?? fallbackDevConfig
const initialActiveDomain = RNNetworkBridge.getNativeActiveDomain() ?? fallbackDevActiveDomain

export default function RootLayout() {
  useEffect(() => onSessionExpired(() => {
    Alert.alert('Sesión expirada', 'Volvé a iniciar sesión', [
      { text: 'OK', onPress: () => router.replace('/') },
    ])
  }), [])

  return (
    <AppConfigProvider initialConfig={initialConfig} initialActiveDomain={initialActiveDomain}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Seguros' }} />
      </Stack>
    </AppConfigProvider>
  )
}
```

## `src/services/vehicleApi.ts` (service layer recomendada)

```typescript
import { request } from '@scotia/rn-network'

export interface Brand { id: string; description: string }
export interface Model { id: string; description: string }

interface BrandsResponse { brands: Brand[]; years: { id: string; description: string }[] }
interface ModelsResponse { models: Model[] }

export async function getBrands() {
  const res = await request<BrandsResponse>('/v1/brands', 'GET')
  return res.body
}

export async function getModels(brandId: string) {
  const res = await request<ModelsResponse>(`/v1/brands/${brandId}/models`, 'GET')
  return res.body.models
}
```

## `src/app/index.tsx` (pantalla consumiendo)

```typescript
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import type { NetworkErrorPayload } from '@scotia/rn-network'
import { getBrands, type Brand } from '../services/vehicleApi'

type State =
  | { kind: 'loading' }
  | { kind: 'success'; brands: Brand[] }
  | { kind: 'error'; error: NetworkErrorPayload }

export default function BrandsScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const ctrl = new AbortController()
    getBrands()
      .then(({ brands }) => {
        if (!ctrl.signal.aborted) setState({ kind: 'success', brands })
      })
      .catch(err => {
        if (!ctrl.signal.aborted) setState({ kind: 'error', error: err })
      })
    return () => ctrl.abort()
  }, [])

  if (state.kind === 'loading') return <ActivityIndicator />
  if (state.kind === 'error') return <Text>Error: {state.error.code}</Text>
  return (
    <View>
      {state.brands.map(b => <Text key={b.id}>{b.description}</Text>)}
    </View>
  )
}
```

## Patrones recomendados

- **Service layer** entre la API y los componentes — desacopla rutas/shapes del BFF de la UI.
- **Estado discriminado** (`'loading' | 'success' | 'error'`) en vez de booleans sueltos.
- **AbortController** para cancelar effects al desmontar componentes y evitar `setState on unmounted`.
- **Validación runtime con Zod** (opcional) para validar `res.body` antes de usarlo.
- **`useEffect` cleanup que llama `cancelRequest`** si pasaste un `requestId` explícito.
