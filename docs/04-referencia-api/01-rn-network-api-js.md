# API JS de `@scotia/rn-network`

Todas las exportaciones del módulo (`src/index.ts`).

## Funciones

### `request(url, method?, headers?, body?)`

```typescript
function request(
  url: string,
  method: HttpMethod = 'GET',
  headers: Record<string, string> = {},
  body?: Record<string, unknown>
): Promise<Record<string, unknown>>
```

Hace una request HTTP delegando al provider activo.

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `url` | `string` | — | Absoluto (`http(s)://...`) o relativo (se prepende el `baseURL`). |
| `method` | `HttpMethod` | `'GET'` | Método HTTP. |
| `headers` | `Record<string, string>` | `{}` | Headers planos. |
| `body` | `Record<string, unknown>` | `undefined` | Body JSON-serializable. |

**Retorna**: `Promise<Record<string, unknown>>` — la respuesta JSON parseada (siempre objeto raíz).

**Lanza**: `NetworkErrorPayload` cuando falla. Ver [Manejo de errores](05-manejo-de-errores.md).

### `setProvider(provider)`

```typescript
function setProvider(provider: NetworkProvider): void
```

Registra un provider JS. **Solo se usa en `__DEV__`** — en release builds el valor se ignora.

### `hasProvider()`

```typescript
function hasProvider(): boolean
```

Retorna `true` si hay un provider JS registrado (independiente del nativo).

### `isAvailable()`

```typescript
function isAvailable(): boolean
```

Retorna `true` si:

1. El módulo nativo `RNNetworkModule` está linkeado en el binario, **y**
2. El módulo nativo confirma que `RNNetworkRegistry.provider != null` (la app host registró su provider).

Si retorna `false`, `request()` caerá al `MockNetworkProvider` JS (si está en `__DEV__`) o lanzará `PROVIDER_NOT_SET`.

### `setBaseURL(url)`

```typescript
function setBaseURL(url: string): void
```

Establece el `baseURL` del lado JS. Se aplica solo cuando no hay `baseURL` derivado del nativo. Recorta automáticamente el `/` final.

### `getBaseURL()`

```typescript
function getBaseURL(): string | null
```

Retorna el `baseURL` activo:

1. **Modo nativo**: deriva de `RNNetworkRegistry.appConfig.activeDomain` → entrada en `domains`.
2. **Modo JS**: el valor seteado con `setBaseURL()`.
3. Si ninguno aplica, retorna `null`.

## Components y hooks

### `AppConfigProvider`

```typescript
function AppConfigProvider(props: {
  initialConfig: AppConfig
  children: React.ReactNode
}): JSX.Element
```

React context provider que expone `config` y `setActiveDomain` a través de `useAppConfig()`.

### `useAppConfig()`

```typescript
function useAppConfig(): {
  config: AppConfig
  setActiveDomain: (key: DomainKey) => void
}
```

Hook para leer la config y cambiar el dominio activo. **Lanza** si se usa fuera de un `AppConfigProvider`:

```
Error: useAppConfig must be used inside AppConfigProvider
```

### `MockNetworkProvider`

```typescript
class MockNetworkProvider implements NetworkProvider {
  constructor(config: MockNetworkProviderConfig)
  request(url, method, headers, body?): Promise<Record<string, unknown>>
}
```

Implementación de `NetworkProvider` para desarrollo. Matchea URLs por substring; la ruta más larga gana. Lanza `{ code: 'UNKNOWN', retryable: false }` si no hay match.

## Objeto utilitario

### `RNNetworkBridge`

```typescript
const RNNetworkBridge: {
  isAvailable(): boolean
  getNativeAppConfig(): Record<string, unknown> | null
  getNativeBaseURL(): string | null
  setActiveDomain(key: string): Promise<void>
  getBaseURLForDomain(key: string): string | null
  request(url, method, headers, body?): Promise<Record<string, unknown>>
}
```

Acceso de bajo nivel al módulo nativo. Útil para:

- Inicializar `AppConfigProvider` con el config del nativo: `RNNetworkBridge.getNativeAppConfig()`.
- Cambiar el dominio activo desde fuera del context: `RNNetworkBridge.setActiveDomain('staging')`.
- Debug Android: `(RNNetworkBridge as any).debugIdentity?.()`.

> Para uso cotidiano prefiere `request`, `useAppConfig`, etc. `RNNetworkBridge` es un escape hatch.

## Tipos re-exportados

```typescript
export type {
  NetworkErrorCode,
  NetworkErrorPayload,
  NetworkProvider,
  HttpMethod,
  MockNetworkProviderConfig,
  AppConfig,
  AppEnvironment,
  CountryCode,
  DomainConfig,
  DomainKey,
}
```

Definiciones detalladas en [Tipos](02-rn-network-tipos.md).
