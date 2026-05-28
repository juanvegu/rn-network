# Modelo de dominios

La app RN puede apuntar a varios entornos del BFF (`prod`, `staging`, `qa`, …) o a varios dominios funcionales (`BFF`, `INSURANCE`, `INVESTMENTS`). El modelo separa **dominios disponibles** (estático, declarativo) de **dominio activo** (mutable, estado).

## Diseño

### `AppConfig` — inmutable, en `appConfig`

```swift
public struct AppConfig {
    public let country: String           // "CL"
    public let environment: String       // "prod"
    public let domains: [DomainConfig]
}

public struct DomainConfig {
    public let key: String               // "BFF"
    public let baseURL: String           // "https://api.bank.cl"
}
```

Asignado una sola vez por el host al inicializar. Lista cerrada de dominios que la app RN puede usar.

### `activeDomain` — mutable, en el registry

```swift
public final class RNNetworkRegistry {
    public static var appConfig: AppConfig?
    public static var activeDomain: String?   // ← apunta a un key de domains
    …
}
```

El host setea el inicial. El JS puede cambiarlo en runtime sin reconstruir el `AppConfig`:

```typescript
const { setActiveDomain } = useAppConfig()
setActiveDomain('INSURANCE')   // valida que exista en domains
```

`setActiveDomain` solo aplica si la `key` existe en `appConfig.domains` — en caso contrario, no-op silencioso.

### `getBaseURL()` deriva al vuelo

```
getBaseURL() === domains.find(d => d.key === activeDomain)?.baseURL
```

Esto evita la denormalización de antes (cuando había un campo `baseURL` espejo en el registry).

## Por qué `activeDomain` vive en el registry y no en `AppConfig`

1. **Inmutabilidad**: si `activeDomain` estuviera dentro del struct, cambiar de dominio implicaría reconstruir `AppConfig`. Como struct value-type, eso es ruidoso e inconsistente con la naturaleza "qué dominios existen" del config.
2. **Single source of truth en runtime**: cuando el JS llama `setActiveDomain`, solo muta un campo. El nativo y el JS leen del mismo `RNNetworkRegistry.activeDomain`.
3. **Coherencia con el contrato**: tanto en Swift como en Kotlin, "el config es lo que el host declaró" y "el active es lo que está pasando ahora". Son dos preocupaciones distintas.

## Validación en el JS

`AppConfigContext` mantiene `activeDomain` en estado React separado del `config`. El setter valida que la `key` exista:

```typescript
const setActiveDomain = useCallback((key: DomainKey) => {
  if (!config.domains.some(d => d.key === key)) return    // ignora keys inválidas
  RNNetworkBridge.setActiveDomain(key)                     // propaga al nativo
  setActiveDomainState(key)                                // actualiza estado React
}, [config.domains])
```

## Flujo de cambio

```
React            AppConfigContext       RNNetworkBridge      RnNetworkModule       Registry
  │                    │                       │                    │                  │
  │ setActiveDomain    │                       │                    │                  │
  │  ('INSURANCE')     │                       │                    │                  │
  ├───────────────────►│                       │                    │                  │
  │                    │ valida vs domains     │                    │                  │
  │                    │ setNativeActive…      │                    │                  │
  │                    ├──────────────────────►│                    │                  │
  │                    │                       │ NativeFn call      │                  │
  │                    │                       ├───────────────────►│                  │
  │                    │                       │                    │ validateAndSet   │
  │                    │                       │                    ├─────────────────►│
  │                    │                       │                    │                  │ activeDomain =
  │                    │                       │                    │                  │  "INSURANCE"
  │                    │ setState              │                    │                  │
  │◄───────────────────┤                       │                    │                  │
  │   re-render        │                       │                    │                  │
  │ getBaseURL() → "https://insurance.bank.cl" │                    │                  │
```
