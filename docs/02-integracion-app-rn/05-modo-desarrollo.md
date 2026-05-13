# Modo desarrollo

Durante `expo start` (Metro dev server, sin host nativo), `isAvailable()` retorna `false` y cualquier `request()` lanzaría `PROVIDER_NOT_SET`. Para desarrollar la app sin depender del host, hay tres opciones:

1. **`MockNetworkProvider`** — respuestas hardcodeadas en JS.
2. **Provider JS custom** con `fetch`/`axios` — para pegarle a un backend real desde el simulador.
3. **Backend local** con `setBaseURL('http://localhost:8080')`.

## Opción 1 — `MockNetworkProvider`

Útil cuando no quieres depender de un backend (o cuando estás trabajando offline).

```typescript
import { setProvider, MockNetworkProvider, isAvailable } from '@scotia/rn-network'

if (__DEV__ && !isAvailable()) {
  setProvider(
    new MockNetworkProvider({
      routes: {
        '/api/users/me': { id: 1, name: 'Test User' },
        '/api/accounts/list': { accounts: [{ id: 'A1' }, { id: 'A2' }] },
      },
    })
  )
}
```

### Cómo hace el matching

`MockNetworkProvider` compara la URL **completa** (con `baseURL` prependido) contra cada `key` de `routes`. Si la URL **contiene** la key como substring, hay match. Si varios patterns matchean, gana el **más largo** (mejor especificidad).

Ejemplo:
- URL: `https://api.bank.cl/api/users/me`
- Patterns: `/api/users` (match), `/api/users/me` (match, más largo) → gana `/api/users/me`.

Si ninguna ruta matchea, lanza:

```typescript
{ code: 'UNKNOWN', retryable: false }
```

### Limitaciones

- No distingue por método HTTP (un mismo path siempre devuelve lo mismo).
- No considera headers ni body.
- Las respuestas son síncronas (no hay latencia simulada).

Para casos más sofisticados, escribe tu propio provider (opción 2).

## Opción 2 — Provider JS custom con `fetch`

Si quieres pegarle a un backend real (local o de staging) desde el simulador sin pasar por el stack nativo:

```typescript
import { setProvider, isAvailable } from '@scotia/rn-network'
import type { NetworkProvider } from '@scotia/rn-network'

class FetchProvider implements NetworkProvider {
  async request(url, method, headers, body) {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      throw {
        code: response.status >= 500 ? 'HTTP_SERVER_ERROR' : 'HTTP_CLIENT_ERROR',
        retryable: response.status >= 500,
        httpStatus: response.status,
      }
    }
    return await response.json()
  }
}

if (__DEV__ && !isAvailable()) {
  setProvider(new FetchProvider())
}
```

> **Importante:** `setProvider` solo tiene efecto en `__DEV__`. En release build el `jsProvider` se ignora y se cae a `PROVIDER_NOT_SET`. Esto es deliberado — previene que un mock se cuele a producción.

## Opción 3 — Backend local

Si tu backend corre en `localhost:8080` y quieres apuntar a él (incluso desde el simulador):

```typescript
import { setBaseURL } from '@scotia/rn-network'

if (__DEV__) {
  setBaseURL('http://localhost:8080')
}
```

Combínalo con un provider JS (opción 2) para resolver el resto. Solo con `setBaseURL` no basta porque el provider sigue siendo necesario para ejecutar la request.

### Notas sobre `localhost` en simuladores

- **iOS Simulator**: `http://localhost:8080` funciona porque comparte la red del host.
- **Android Emulator**: usar `http://10.0.2.2:8080` en lugar de `localhost` (el emulador ve al host en `10.0.2.2`).
- **Dispositivos físicos**: necesitas la IP de tu máquina en la LAN, ej. `http://192.168.1.42:8080`.
- **HTTP en iOS**: añadir `NSAppTransportSecurity → NSAllowsArbitraryLoads = true` en `Info.plist` (solo en debug).

## Patrón sugerido — un archivo de bootstrap

Centraliza la configuración de red en un módulo y carga al inicio:

```typescript
// src/networkConfig.ts
import {
  setProvider, setBaseURL, isAvailable, MockNetworkProvider
} from '@scotia/rn-network'

export function initNetworkConfig() {
  if (__DEV__) {
    setBaseURL('http://localhost:8080')
  }

  if (__DEV__ && !isAvailable()) {
    setProvider(
      new MockNetworkProvider({
        routes: {
          '/api/users/me': require('./mocks/user.json'),
        },
      })
    )
  }
}
```

```typescript
// App.tsx (o entry)
import './src/networkConfig' // ejecuta side-effects al import
// o explícito:
import { initNetworkConfig } from './src/networkConfig'
initNetworkConfig()
```

## Siguiente paso

[Ejemplo completo →](06-ejemplo-completo.md)
