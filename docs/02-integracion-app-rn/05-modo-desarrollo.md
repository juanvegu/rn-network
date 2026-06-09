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

## Dev local con el contrato + módulo linkeados (iOS)

Cuando trabajás contra los repos locales (`rn-network-contracts` + `rn-network`) en vez de las versiones publicadas, hay dos piezas extra:

### 1. Sincronizar el xcframework del contrato

El módulo Expo bundlea `ios/iOSNetworkContract.xcframework`. Cuando cambiás el contrato, regeneralo y sincronizalo con un comando:

```bash
cd rn-network-contracts
./scripts/build-and-sync.sh   # build del xcframework + copia a ../rn-network/ios/
```

### 2. `metro.config.js` para el módulo linkeado por symlink

Si instalaste el módulo por symlink (`npm install ../rn-network --install-links=false`), el módulo vive **fuera del project root** y tiene su propio `node_modules`. Metro necesita config:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const rnNetworkRoot = path.resolve(projectRoot, '../rn-network')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [rnNetworkRoot]                              // seguir el symlink
const escaped = rnNetworkRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
config.resolver.blockList = [new RegExp(`^${escaped}/node_modules/.*`)]  // sin react duplicado
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]

module.exports = config
```

> Este `metro.config.js` es **solo para dev local con symlink**. Con el paquete publicado (copiado en `node_modules` dentro del project root), Metro lo resuelve sin config — se puede eliminar.

### Alternativa: copia en vez de symlink

Si Metro te complica con el symlink, usá `file:` (copia) y no necesitás `metro.config.js`:

```bash
npm install ../rn-network    # sin --install-links=false → copia
```

El costo: re-instalar tras cada cambio del módulo. Pero replica exactamente el comportamiento del paquete publicado.
