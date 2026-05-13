# Modelo de dominios

`@scotia/rn-network` soporta múltiples entornos (prod, staging, QA, …) en runtime sin necesidad de rebuild. Esto se logra con la estructura `appConfig` que la app nativa publica en `RNNetworkRegistry.appConfig`.

## Estructura de `appConfig`

`appConfig` es un diccionario libre (`Map<String, Any?>` en Kotlin, `[String: Any]` en Swift). La librería solo lee tres claves específicas:

| Clave | Tipo | Uso |
|---|---|---|
| `country` | `String` | Solo informativa para el código RN (vía `useAppConfig()`). |
| `domains` | `List<Map<String, String>>` | Lista de pares `{ key, baseURL }` disponibles. |
| `activeDomain` | `String` | Clave de uno de los `domains`; define cuál se usa para resolver rutas relativas. |

Cualquier otra clave es libre — la app puede añadir lo que necesite y leerlo desde JS con `useAppConfig().config`.

### Ejemplo (Android, Kotlin)

```kotlin
RNNetworkRegistry.appConfig = mapOf(
    "country" to "CL",
    "domains" to listOf(
        mapOf("key" to "prod",    "baseURL" to "https://api.bank.cl"),
        mapOf("key" to "staging", "baseURL" to "https://staging.bank.cl"),
        mapOf("key" to "qa",      "baseURL" to "https://qa.bank.cl"),
    ),
    "activeDomain" to "prod"
)
```

### Ejemplo (iOS, Swift)

```swift
RNNetworkRegistry.appConfig = [
    "country": "CL",
    "domains": [
        ["key": "prod",    "baseURL": "https://api.bank.cl"],
        ["key": "staging", "baseURL": "https://staging.bank.cl"],
        ["key": "qa",      "baseURL": "https://qa.bank.cl"],
    ],
    "activeDomain": "prod"
]
```

## Cómo lo consume la capa JS

### Tipos correspondientes (`src/appConfig.ts`)

```typescript
export interface DomainConfig {
  key: DomainKey
  baseURL: string
}

export interface AppConfig {
  country: CountryCode
  environment: AppEnvironment
  domains: DomainConfig[]
  activeDomain: DomainKey
}
```

> Nota: la capa nativa actualmente no impone que el `appConfig` cumpla `AppConfig` (es un mapa libre). El consumidor RN debe validar la forma o tiparla manualmente al envolverla en `AppConfigProvider`.

### `getBaseURL()`

```typescript
function getBaseURL(): string | null {
  return RNNetworkBridge.getNativeBaseURL() ?? registry.baseURL
}
```

`getNativeBaseURL()` busca dentro de `appConfig`:

```typescript
const activeDomain = config.activeDomain as string | undefined
const domains = config.domains as Array<{ key: string; baseURL: string }> | undefined
return domains?.find(d => d.key === activeDomain)?.baseURL ?? null
```

## Cambiar el dominio activo desde JS

```tsx
import { AppConfigProvider, useAppConfig } from '@scotia/rn-network'

function EnvSelector() {
  const { config, setActiveDomain } = useAppConfig()
  return (
    <View>
      {config.domains.map(d => (
        <Button
          key={d.key}
          title={d.key}
          onPress={() => setActiveDomain(d.key)}
        />
      ))}
    </View>
  )
}
```

`setActiveDomain(key)`:

1. Llama al nativo: `RNNetworkBridge.setActiveDomain(key)` → módulo nativo busca el `baseURL` correspondiente en `appConfig.domains`, actualiza `appConfig.activeDomain` y añade `appConfig.baseURL` como conveniencia.
2. Actualiza el estado de React (`setConfig(prev => ({ ...prev, activeDomain: key }))`) para que la UI se vuelva a renderizar.

## Comportamiento si no hay `appConfig` nativo

- `getBaseURL()` cae al valor de la capa JS (seteado con `setBaseURL('...')`).
- Si tampoco hay valor JS, `getBaseURL()` retorna `null` y las rutas relativas se envían **tal cual** al provider (lo que típicamente falla con `NO_CONNECTIVITY` o un error HTTP).
- En desarrollo es común hacer:
  ```typescript
  if (__DEV__) setBaseURL('http://localhost:8080')
  ```
