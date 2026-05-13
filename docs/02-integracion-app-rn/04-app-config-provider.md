# AppConfigProvider y dominios

`@scotia/rn-network` expone un React context (`AppConfigProvider`) y un hook (`useAppConfig`) para que la app RN lea y modifique la configuración de dominios en runtime.

## Cuándo lo necesitas

Lo necesitas si tu app:

- Soporta múltiples entornos (prod, staging, QA) accesibles desde la UI.
- Permite al usuario o al equipo de QA cambiar el dominio activo sin reiniciar.
- Necesita exponer el `country` u otros valores de `appConfig` en pantallas o lógica de negocio.

Si tu app siempre apunta a producción y `setBaseURL` te basta, **no necesitas** este provider.

## Setup

Envuelve el árbol React con `AppConfigProvider` cerca de la raíz:

```tsx
import { AppConfigProvider } from '@scotia/rn-network'
import type { AppConfig } from '@scotia/rn-network'

const initialConfig: AppConfig = {
  country: 'CL',
  environment: 'prod',
  domains: [
    { key: 'prod',    baseURL: 'https://api.bank.cl' },
    { key: 'staging', baseURL: 'https://staging.bank.cl' },
  ],
  activeDomain: 'prod',
}

export function App() {
  return (
    <AppConfigProvider initialConfig={initialConfig}>
      {/* resto de la app */}
    </AppConfigProvider>
  )
}
```

`initialConfig` es el estado inicial visible desde JS. En modo nativo, lo ideal es derivarlo de `RNNetworkBridge.getNativeAppConfig()` para que ambos lados estén sincronizados:

```tsx
import { RNNetworkBridge } from '@scotia/rn-network'

const native = RNNetworkBridge.getNativeAppConfig()
const initialConfig: AppConfig = native
  ? (native as unknown as AppConfig)
  : initialConfigFallback
```

## Uso del hook

```tsx
import { useAppConfig } from '@scotia/rn-network'

function EnvSwitcher() {
  const { config, setActiveDomain } = useAppConfig()

  return (
    <View>
      <Text>País: {config.country}</Text>
      <Text>Dominio activo: {config.activeDomain}</Text>

      {config.domains.map(d => (
        <TouchableOpacity
          key={d.key}
          onPress={() => setActiveDomain(d.key)}
        >
          <Text>{d.key} — {d.baseURL}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
```

`useAppConfig()` lanza una excepción si se usa fuera de un `AppConfigProvider`:

```
Error: useAppConfig must be used inside AppConfigProvider
```

## Qué hace `setActiveDomain(key)`

1. **Lado nativo**: llama `RNNetworkBridge.setActiveDomain(key)`. El módulo nativo busca `key` en `appConfig.domains`, actualiza `appConfig.activeDomain` y añade `appConfig.baseURL` como conveniencia. Si la clave no existe, no hace nada (no lanza).
2. **Lado JS**: actualiza el estado de React con el nuevo `activeDomain`, lo que provoca re-render de los componentes que usan `useAppConfig()`.

A partir de ese momento, las nuevas llamadas a `request()` con rutas relativas resuelven al nuevo `baseURL`.

## API expuesta por `useAppConfig()`

```typescript
interface AppConfigContextValue {
  config: AppConfig
  setActiveDomain: (key: DomainKey) => void
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `config` | `AppConfig` | Configuración actual (incluye `country`, `domains`, `activeDomain`, `environment`). |
| `setActiveDomain` | `(key) => void` | Cambia el dominio activo en nativo y JS. |

Si necesitas modificar otros campos (ej. añadir un dominio en runtime), el context **no** lo soporta hoy. Para eso, la app nativa debe actualizar `RNNetworkRegistry.appConfig` directamente y la app RN debe re-leerlo.

## Buena práctica: ocultar la UI de cambio de entorno en producción

```tsx
{__DEV__ && <EnvSwitcher />}
```

O detrás de un gesto secreto / pantalla de QA. Permitir cambiar de entorno en producción puede ser un riesgo de seguridad y soporte.

## Siguiente paso

[Modo desarrollo →](05-modo-desarrollo.md)
