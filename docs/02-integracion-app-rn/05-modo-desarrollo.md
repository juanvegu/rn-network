# Modo desarrollo

Durante `expo start` (Metro dev server sin host nativo), `isAvailable()` retorna `false`. Para que `request()` funcione hay que registrar un `MockNetworkProvider` JS con fixtures locales.

## Regla de fallback

`request()` decide qué backend usar mirando la presencia del provider:

```
isAvailable() === true   → usa el provider NATIVO del host
isAvailable() === false  → si registraste un setProvider(...), lo usa
                           si no, throw PROVIDER_NOT_SET
```

**Sin gate `__DEV__`**. La app del banco puede arrancar en modo stubbed/mock incluso en builds de producción — el fallback se respeta siempre. Los mocks viajan en el bundle siempre.

## Setup mínimo

```typescript
// src/networkConfig.ts
import { setProvider, setBaseURL, isAvailable, MockNetworkProvider } from '@scotia/rn-network'

export function initNetworkConfig() {
  // En dev, baseURL apunta a localhost (para mock o un backend de prueba).
  if (__DEV__) setBaseURL('http://localhost:8080')

  if (!isAvailable()) {
    setProvider(new MockNetworkProvider({
      routes: {
        '/v1/brands': require('./mocks/brands.json'),
        '/v1/brands/2/models': require('./mocks/models.json'),
      },
    }))
  }
}
```

Llamar `initNetworkConfig()` desde `_layout.tsx` antes de renderizar la app.

## Routes del mock

Las keys soportan dos formas:

- `'/path'` — matchea cualquier método HTTP
- `'GET /path'`, `'POST /path'`, etc — solo el método indicado

Si varias rutas matchean, gana la más larga (longest-match).

## Simular errores

Si el valor de una ruta tiene shape `NetworkErrorPayload` (`{ code, retryable, ... }`), el mock tira en vez de devolverlo:

```typescript
new MockNetworkProvider({
  routes: {
    'POST /v1/login': { code: 'SESSION_EXPIRED', retryable: false, httpStatus: 401 },
    'GET /v1/slow':   { code: 'TIMEOUT', retryable: true },
  },
})
```

Sirve para probar los caminos de error sin necesitar un backend que devuelva 401/500.

## Cuándo NO registrar el mock

En producción contra el host real:

- El host registra su `provider` antes de iniciar RN → `isAvailable() === true` → el `if (!isAvailable())` no entra → el mock no se registra.
- Aunque el código del mock viaja en el bundle, nunca se invoca.

Si querés ser defensivo y excluirlo del bundle prod, podés envolver el `require('./mocks/...')` en un check `process.env.NODE_ENV !== 'production'` y dejar que Metro tree-shakee. No es obligatorio.
