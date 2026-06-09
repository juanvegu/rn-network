# @scotia/rn-network

Bridge de red para React Native (Expo) embebido en las apps nativas de Scotia (expo-brownfield). El módulo **no hace HTTP** — delega cada request al stack nativo del banco (URLSession / OkHttp con pinning, sesión, telemetría) a través de un contrato compartido.

```
React  ──request()──►  RnNetworkModule (Swift/Kotlin)  ──►  NetworkProvider del host nativo
                              │
                       si no hay provider → MockNetworkProvider (JS, dev/stubbed)
```

## Qué resuelve

- La RN no reimplementa pinning/sesión/retries — usa el HTTP del banco.
- Contrato tipado compartido (`NetworkResponse`, `NetworkError`, `AppConfig`) entre el host nativo y el módulo.
- Fallback automático a mock JS cuando el host no registró provider (modo stubbed).
- Timeout cliente, cancelación, evento `sessionExpired`.

## Instalación

```bash
npm install @scotia/rn-network    # registro npm interno de Scotia
```

Peer deps: `expo`, `react`, `react-native`. **No** requiere config plugin en `app.json`.

## Configuración

Tres piezas de wiring en la app antes de usar `request()`:

### 1. Fallback dev (cuando no hay host nativo)

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

### 2. Init del provider (mock si no hay nativo)

```typescript
// src/networkConfig.ts
import { setProvider, setBaseURL, isAvailable, MockNetworkProvider, setRequestTimeout } from '@scotia/rn-network'

export function initNetworkConfig() {
  setRequestTimeout(20_000)                    // opcional — default 30s
  if (__DEV__) setBaseURL('http://localhost:8080')

  // Sin provider nativo → usar el mock JS (regla binaria, sin gate __DEV__).
  if (!isAvailable()) {
    setProvider(new MockNetworkProvider({
      routes: {
        'GET /v1/brands': require('./mocks/brands.json'),
      },
    }))
  }
}
```

### 3. Bootstrapping en el root layout

```typescript
// src/app/_layout.tsx
import { useEffect } from 'react'
import { AppConfigProvider, RNNetworkBridge, onSessionExpired } from '@scotia/rn-network'
import type { AppConfig } from '@scotia/rn-network'
import { router, Stack } from 'expo-router'
import { initNetworkConfig } from '../networkConfig'
import { fallbackDevConfig, fallbackDevActiveDomain } from '../config/devConfig'

initNetworkConfig()   // configurar el provider ANTES de cualquier request

// El config y el dominio activo vienen del host nativo (o del fallback en dev).
const initialConfig: AppConfig = RNNetworkBridge.getNativeAppConfig() ?? fallbackDevConfig
const initialActiveDomain = RNNetworkBridge.getNativeActiveDomain() ?? fallbackDevActiveDomain

export default function RootLayout() {
  // Sesión expirada (push desde el host nativo) → redirigir al login.
  useEffect(() => onSessionExpired(() => router.replace('/login')), [])

  return (
    <AppConfigProvider initialConfig={initialConfig} initialActiveDomain={initialActiveDomain}>
      <Stack />
    </AppConfigProvider>
  )
}
```

Con esto, los componentes pueden leer/cambiar el dominio activo con `useAppConfig()` y hacer `request()`.

## Uso

```typescript
import { request, onSessionExpired } from '@scotia/rn-network'

// request() retorna el envelope { body, statusCode, headers }
const res = await request<{ brands: Brand[] }>('/v1/brands', 'GET')
console.log(res.body.brands, res.statusCode)

// errores tipados
try { await request('/v1/quote', 'POST', {}, payload) }
catch (e) {
  if (e.code === 'SESSION_EXPIRED') router.replace('/login')
}

// sesión expirada (push desde nativo)
useEffect(() => onSessionExpired(() => router.replace('/login')), [])
```

### Mock para desarrollo

```typescript
import { isAvailable, setProvider, MockNetworkProvider } from '@scotia/rn-network'

if (!isAvailable()) {
  setProvider(new MockNetworkProvider({
    routes: { 'GET /v1/brands': require('./mocks/brands.json') },
  }))
}
```

## El contrato nativo

El módulo depende de `iOSNetworkContract` (iOS) y `cl.scotiabank.rnnetwork:contracts` (Android):

- **iOS** — bundlea `ios/iOSNetworkContract.xcframework` (vendored). Se sincroniza desde el repo del contrato con `build-and-sync.sh`.
- **Android** — dependencia Maven en `android/build.gradle`.

La **app nativa del banco** implementa `NetworkProvider` y lo registra en `RNNetworkRegistry` antes de iniciar RN. Ver el repo del contrato y los docs.

## Desarrollo local

```bash
npm run build       # compila TS (build/)
npm test            # jest
npm run lint
```

### Linkeo contra los repos locales

```bash
# En la app consumidora:
npm install ../rn-network --install-links=false   # symlink (live)
# requiere metro.config.js (ver docs · Modo desarrollo)

# Sincronizar el xcframework del contrato cuando cambia:
cd ../rn-network-contracts && ./scripts/build-and-sync.sh
```

> Con symlink, agregá `metro.config.js` con `watchFolders` + `blockList` (ver docs). O usá `npm install ../rn-network` (copia) sin config.

## Estructura

```
src/        TS: index, RNNetworkBridge, MockNetworkProvider, AppConfigContext, types
ios/        RnNetworkModule.swift, NetworkErrorMapper.swift, RnNetwork.podspec, iOSNetworkContract.xcframework
android/    RnNetworkModule.kt, NetworkErrorMapper.kt, build.gradle
example/    app mínima de referencia (cómo integrar)
docs/       documentación completa (Confluence)
```

## Documentación completa

Ver [`docs/`](docs/README.md) — arquitectura, decisiones técnicas, integración nativa, referencia API, troubleshooting.

## API pública

`request` · `cancelRequest` · `setRequestTimeout` · `setProvider` · `isAvailable` · `setBaseURL` · `getBaseURL` · `onSessionExpired` · `AppConfigProvider` · `useAppConfig` · `MockNetworkProvider` · `parseAppConfig`

Tipos: `NetworkResponse` · `NetworkErrorPayload` · `NetworkErrorCode` · `HttpMethod` · `RequestOptions` · `AppConfig`
