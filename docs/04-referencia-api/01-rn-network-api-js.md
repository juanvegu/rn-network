# API JS de `@scotia/rn-network`

Exportaciones de `src/index.ts`.

## Requests

### `request<T>(url, method?, headers?, body?, options?)`

```typescript
function request<T = Record<string, unknown>>(
  url: string,
  method?: HttpMethod = 'GET',
  headers?: Record<string, string> = {},
  body?: Record<string, unknown>,
  options?: RequestOptions = {}
): Promise<NetworkResponse<T>>
```

- `url`: absoluta o relativa al base URL activo.
- `method`: `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`.
- `headers`: opcional, merged con los que aplique el host nativo.
- `body`: opcional, serializado como JSON por el host.
- `options.timeoutMs`: override del timeout global. `0` desactiva.
- `options.requestId`: override del UUID autogenerado.

Resuelve con `{ body, statusCode, headers }`. Rechaza con `NetworkErrorPayload`.

### `cancelRequest(requestId)`

```typescript
function cancelRequest(requestId: string): Promise<void>
```

Best-effort. Si el provider no implementa `cancel`, no-op silencioso.

### `setRequestTimeout(ms)` / `getRequestTimeout()`

```typescript
function setRequestTimeout(ms: number): void
function getRequestTimeout(): number
```

Default `30_000`. `0` desactiva el timeout cliente.

## Configuración

### `setProvider(provider)`

```typescript
function setProvider(provider: NetworkProvider): void
```

Registra un `NetworkProvider` JS (típicamente un `MockNetworkProvider`). Solo se usa si `isAvailable() === false`.

### `hasProvider()`

```typescript
function hasProvider(): boolean
```

True si registraste un provider JS via `setProvider`.

### `isAvailable()`

```typescript
function isAvailable(): boolean
```

True si el módulo nativo está linkeado **y** el host registró un `RNNetworkRegistry.provider`.

### `setBaseURL(url)` / `getBaseURL()`

```typescript
function setBaseURL(url: string): void
function getBaseURL(): string | null
```

- `setBaseURL` solo aplica en modo JS (sin host). Sin trailing slash.
- `getBaseURL` deriva primero del host (`activeDomain` → `domains[].baseURL`) y cae al JS-side si no hay.

## Eventos

### `onSessionExpired(handler)`

```typescript
function onSessionExpired(handler: () => void): () => void
```

Subscribe al evento push emitido cuando el host invoca `RNNetworkRegistry.onSessionExpired?()`. Retorna unsubscribe.

## React

### `AppConfigProvider`

```typescript
interface AppConfigProviderProps {
  initialConfig: AppConfig
  initialActiveDomain?: DomainKey
  children: React.ReactNode
}
```

### `useAppConfig()`

```typescript
function useAppConfig(): {
  config: AppConfig
  activeDomain: DomainKey | undefined
  setActiveDomain: (key: DomainKey) => void
}
```

Throws si se usa fuera del provider.

## Bridge directo

`RNNetworkBridge` se exporta como escape-hatch para casos avanzados:

- `RNNetworkBridge.isAvailable()`
- `RNNetworkBridge.getNativeAppConfig(): AppConfig | null`
- `RNNetworkBridge.getNativeActiveDomain(): string | null`
- `RNNetworkBridge.getNativeBaseURL(): string | null`
- `RNNetworkBridge.setActiveDomain(key)`
- `RNNetworkBridge.getBaseURLForDomain(key)`
- `RNNetworkBridge.cancel(requestId)`
- `RNNetworkBridge.onSessionExpired(handler)`
- `RNNetworkBridge.request(requestId, url, method, headers, body)`

En código normal preferir las funciones de top-level (`request`, `cancelRequest`, etc.) que añaden timeout y generación de `requestId`.

## Helpers

### `parseAppConfig(raw)`

```typescript
function parseAppConfig(raw: unknown): AppConfig | null
```

Valida estructura manualmente (sin Zod). Retorna `null` si el payload no cumple. Ya se aplica internamente en `RNNetworkBridge.getNativeAppConfig()`.

### `MockNetworkProvider`

```typescript
class MockNetworkProvider implements NetworkProvider {
  constructor(config: { routes: Record<string, Record<string, unknown>> })
}
```

Ver [02 · Uso básico — Mock](../02-integracion-app-rn/05-modo-desarrollo.md).
