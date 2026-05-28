# Tipos TS

Definiciones exportadas por `@scotia/rn-network`.

## `AppConfig`

```typescript
interface DomainConfig {
  key: DomainKey
  baseURL: string
}

interface AppConfig {
  country: CountryCode
  environment: string
  domains: DomainConfig[]
}

type DomainKey = string
type CountryCode = string
```

`activeDomain` **NO** está dentro de `AppConfig`. Vive en el registry nativo y en el contexto React; se lee con `RNNetworkBridge.getNativeActiveDomain()` y se modifica con `setActiveDomain` del `useAppConfig`.

## `NetworkResponse<T>`

```typescript
interface NetworkResponse<T = Record<string, unknown>> {
  body: T
  statusCode: number
  headers: Record<string, string>
}
```

Lo que retorna `request<T>()` en éxito.

## `NetworkErrorPayload`

```typescript
interface NetworkErrorPayload {
  code: NetworkErrorCode
  retryable: boolean
  httpStatus?: number
  message?: string
  info?: Record<string, unknown>
}
```

Forma de los errores que rechaza `request()`. Ver [05 · Manejo de errores](05-manejo-de-errores.md) para la tabla de códigos.

## `NetworkErrorCode`

```typescript
type StandardNetworkErrorCode =
  | 'SSL_PINNING_FAILED'
  | 'TIMEOUT'
  | 'NO_CONNECTIVITY'
  | 'HTTP_CLIENT_ERROR'
  | 'HTTP_SERVER_ERROR'
  | 'PROVIDER_NOT_SET'
  | 'SESSION_EXPIRED'
  | 'SESSION_UNAUTHORIZED'
  | 'INVALID_RESPONSE_BODY'
  | 'CANCELLED'
  | 'UNKNOWN'

// Permite códigos host-específicos manteniendo autocomplete de los estándar.
type NetworkErrorCode = StandardNetworkErrorCode | (string & {})
```

## `HttpMethod`

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
```

## `RequestOptions`

```typescript
interface RequestOptions {
  timeoutMs?: number   // override del global; 0 desactiva
  requestId?: string   // override del UUID autogenerado
}
```

## `NetworkProvider` (interfaz JS)

```typescript
interface NetworkProvider {
  request(
    url: string,
    method: HttpMethod,
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): Promise<NetworkResponse>
}
```

Lo implementa `MockNetworkProvider` y cualquier provider JS custom que pases a `setProvider`.

> Nota: la interfaz JS NO tiene `requestId` en `request()` ni método `cancel`. El bridge nativo lo agrega antes de llegar al host. El mock JS, al ser solo para desarrollo, no necesita correlación de cancel.

## `MockNetworkProviderConfig`

```typescript
interface MockNetworkProviderConfig {
  routes: Record<string, Record<string, unknown>>
}
```

Las keys de `routes` aceptan `'/path'` o `'METHOD /path'`. Los valores son JSON; si tienen shape de `NetworkErrorPayload` (`{ code, retryable }`) el mock tira en vez de devolverlos.
