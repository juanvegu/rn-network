# Flujo de requests

Recorrido completo de un `request()` desde React hasta el HTTP del banco, incluyendo errores y cancelación.

## Camino feliz (HTTP 2xx con body JSON)

```
React           rn-network (TS)         RnNetworkModule           AppNetworkProvider
  │                  │                       │                          │
  │ request('/x')    │                       │                          │
  ├─────────────────►│                       │                          │
  │                  │ requestId = uuid()    │                          │
  │                  │ resolveURL → base/x   │                          │
  │                  │ Promise.race(         │                          │
  │                  │   bridge.request,     │                          │
  │                  │   setTimeout)         │                          │
  │                  ├──────────────────────►│                          │
  │                  │                       │ provider.request(...)    │
  │                  │                       ├─────────────────────────►│
  │                  │                       │                          │ URLSession / OkHttp
  │                  │                       │                          │ pinning, sesión, etc.
  │                  │                       │                          │
  │                  │                       │◄─────────────────────────┤
  │                  │                       │  NetworkResponse(        │
  │                  │                       │    statusCode: 200,      │
  │                  │                       │    headers: …,           │
  │                  │                       │    data: <bytes>)        │
  │                  │                       │                          │
  │                  │                       │ if 2xx: parse JSON       │
  │                  │                       │ else: throw HTTP_*       │
  │                  │◄──────────────────────┤                          │
  │                  │  { body, statusCode,  │                          │
  │                  │    headers }          │                          │
  │◄─────────────────┤                       │                          │
  │  NetworkResponse │                       │                          │
```

## Errores

### Non-2xx

El módulo clasifica centralmente — el host no lo hace:

- `400-499` → `NetworkException("HTTP_CLIENT_ERROR", retryable: false, httpStatus)`
- `500-599` → `NetworkException("HTTP_SERVER_ERROR", retryable: true, httpStatus)`

El JS recibe esto como `NetworkErrorPayload` reconstruido desde el JSON-in-`code` del error nativo.

### Error tipado del host

El host tira `NetworkError(code: "SESSION_EXPIRED", retryable: false, httpStatus: 401, message?, info?)`. El mapper lo pasa **verbatim** al JS sin re-clasificar. La app RN ramifica por `code`.

### Error del sistema

`URLError` (iOS), `IOException`/`SSLException` (Android), `CancellationError`/`CancellationException` → `NetworkErrorMapper.map(...)` los convierte a códigos estándar (`TIMEOUT`, `NO_CONNECTIVITY`, `SSL_PINNING_FAILED`, `CANCELLED`).

### Body no parseable

2xx pero el body no es JSON → `NetworkException("INVALID_RESPONSE_BODY", retryable: false)`.

### 204 / cuerpo vacío

`data == nil` o `data.isEmpty` → JS recibe `body: {}`. No es error.

## Timeout cliente

```
React              rn-network (TS)
  │                     │
  │ request('/x')       │
  ├────────────────────►│
  │                     │ Promise.race(
  │                     │   bridge.request,
  │                     │   setTimeout(30_000))
  │                     │
  │                     │ … 30 s sin respuesta del nativo …
  │                     │
  │                     │ cancelRequest(requestId)   ───► provider.cancel
  │                     │ throw { code: 'TIMEOUT', retryable: true }
  │◄────────────────────┤
```

Configuración:

- `setRequestTimeout(15_000)` global (default `30_000`, `0` desactiva).
- `request(url, method, headers, body, { timeoutMs: 5_000 })` per-call.
- `request(url, method, headers, body, { requestId: 'custom-id' })` per-call (sino se autogenera con `crypto.randomUUID()` o fallback).

## Sesión expirada (push desde nativo)

```
App nativa              rn-network-contracts            RnNetworkModule          React
  │                            │                              │                    │
  │ token refresh falla        │                              │                    │
  │ invoca onSessionExpired?() │                              │                    │
  ├───────────────────────────►│                              │                    │
  │                            │ callback                     │                    │
  │                            ├─────────────────────────────►│                    │
  │                            │                              │ sendEvent(         │
  │                            │                              │   'sessionExpired')│
  │                            │                              ├───────────────────►│
  │                            │                              │                    │ handler() del
  │                            │                              │                    │ onSessionExpired
```

La app RN debe registrar el listener en `_layout.tsx` con `useEffect(() => onSessionExpired(handler), [])`.
