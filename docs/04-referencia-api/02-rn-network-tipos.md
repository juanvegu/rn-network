# Tipos

Todas las definiciones de tipos exportadas por `@scotia/rn-network`.

## Red

### `HttpMethod`

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
```

Los únicos métodos soportados por `request()`. No incluye `HEAD`, `OPTIONS`, `TRACE`, `CONNECT`.

### `NetworkErrorCode`

```typescript
type NetworkErrorCode =
  | 'SSL_PINNING_FAILED'
  | 'TIMEOUT'
  | 'NO_CONNECTIVITY'
  | 'HTTP_CLIENT_ERROR'
  | 'HTTP_SERVER_ERROR'
  | 'PROVIDER_NOT_SET'
  | 'UNKNOWN'
```

Códigos posibles en `NetworkErrorPayload.code`. Ver [Manejo de errores](05-manejo-de-errores.md) para la tabla con causas y `retryable`.

### `NetworkErrorPayload`

```typescript
interface NetworkErrorPayload {
  code: NetworkErrorCode
  retryable: boolean
  httpStatus?: number
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `code` | `NetworkErrorCode` | Categoría del error. |
| `retryable` | `boolean` | Si el caller debería reintentar. La librería no reintenta sola. |
| `httpStatus` | `number?` | Solo presente para `HTTP_CLIENT_ERROR` (4xx) y `HTTP_SERVER_ERROR` (5xx). |

### `NetworkProvider`

```typescript
interface NetworkProvider {
  request(
    url: string,
    method: HttpMethod,
    headers: Record<string, string>,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>>
}
```

> **Cuidado:** este es el tipo JS de `NetworkProvider`, usado por `setProvider()`. Lo implementan mocks o providers JS para desarrollo. **No** es el mismo que el `NetworkProvider` nativo (Kotlin/Swift) — ese es un protocolo/interfaz separada que vive en `rn-network-contracts` y trabaja con bytes crudos.

### `MockNetworkProviderConfig`

```typescript
interface MockNetworkProviderConfig {
  routes: Record<string, Record<string, unknown>>
}
```

Diccionario de pattern → respuesta. El pattern matchea por **substring** contra la URL completa; el más largo gana.

## App config

### `AppConfig`

```typescript
interface AppConfig {
  country: CountryCode
  environment: AppEnvironment
  domains: DomainConfig[]
  activeDomain: DomainKey
}
```

Estructura tipada para usar con `AppConfigProvider`. En la práctica, `RNNetworkRegistry.appConfig` (nativo) es un `Map`/`Dictionary` libre — el lado JS hace la conversión.

### `DomainConfig`

```typescript
interface DomainConfig {
  key: DomainKey
  baseURL: string
}
```

### `DomainKey`

```typescript
type DomainKey = string
```

Alias para `string`. Por convención: `'prod'`, `'staging'`, `'qa'`, etc.

### `CountryCode`

```typescript
type CountryCode = string
```

Alias para `string`. Por convención: ISO 3166-1 alpha-2 (`'CL'`, `'PE'`, `'MX'`, ...).

### `AppEnvironment`

```typescript
type AppEnvironment = string
```

Alias para `string`. Por convención: `'prod'`, `'staging'`, `'qa'`, `'dev'`.

## Mapeo JS ↔ nativo

Cómo se serializan los tipos al cruzar el puente:

| TS (JS) | Kotlin | Swift |
|---|---|---|
| `string` | `String` | `String` |
| `number` | `Double` / `Int` | `Double` / `Int` |
| `boolean` | `Boolean` | `Bool` |
| `Record<string, unknown>` | `Map<String, Any?>` | `[String: Any]` |
| `unknown[]` | `List<Any?>` | `[Any]` |
| `null` / `undefined` | `null` | `nil` |

La conversión JSON↔Map del lado nativo respeta esta tabla. Si la respuesta del servidor contiene tipos exóticos (BigInt, fechas como strings ISO, etc.) llegan como `string`/`number` y deben parsearse en JS.
