# Orden de inicialización

> **Regla crítica:** registra `RNNetworkRegistry.provider` y `RNNetworkRegistry.appConfig` **antes** de inicializar el runtime de React Native.

Este es el error que rompe la mayoría de integraciones nuevas, así que tiene página dedicada.

## Por qué importa

El módulo nativo de `@scotia/rn-network` lee `RNNetworkRegistry.provider` en el momento en que:

1. JS llama `isAvailable()` — lee `provider != null`.
2. JS llama `request(...)` — lee `provider` y la llama.

Si el RN runtime inicializa antes de que el provider esté seteado:

- Algunos códigos JS que corren temprano (ej. `setProvider` condicional, lectura de `appConfig` en un context provider) pueden ejecutarse con `provider == null`.
- El primer `request()` lanza `PROVIDER_NOT_SET`.
- Aun si después seteas el provider, el código JS ya cacheó el resultado de `isAvailable()` en algunas pantallas y no se entera.

## El orden correcto

### Android

```kotlin
class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 1) Registrar contracts
        RNNetworkRegistry.provider = AppNetworkProvider()
        RNNetworkRegistry.appConfig = mapOf(...)

        // 2) Inicializar React Native
        ReactNativeHostManager.initialize(this)
        // o el equivalente que use tu integración (RnLauncher.initialize(), SoLoader.init(), ...)
    }
}
```

### iOS

```swift
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ app: UIApplication, didFinishLaunchingWithOptions _: [...]?) -> Bool {
        // 1) Registrar contracts
        RNNetworkRegistry.provider = AppNetworkProvider()
        RNNetworkRegistry.appConfig = [...]

        // 2) Inicializar React Native
        // ReactNativeHostManager.shared.initialize()

        return true
    }
}
```

## El orden incorrecto (qué NO hacer)

```kotlin
// ❌ MAL
override fun onCreate() {
    super.onCreate()
    ReactNativeHostManager.initialize(this)         // RN arranca primero
    RNNetworkRegistry.provider = AppNetworkProvider() // demasiado tarde
}
```

```swift
// ❌ MAL
func application(...) -> Bool {
    ReactNativeHostManager.shared.initialize()
    RNNetworkRegistry.provider = AppNetworkProvider()
    return true
}
```

## Por qué `setProvider` no soluciona esto

`setProvider` del lado JS guarda un `MockNetworkProvider` para usar **solo en `__DEV__`**. En release builds no se considera.

```typescript
// src/index.ts
const mock = registry.jsProvider
if (__DEV__ && mock) {
  return mock.request(...)
}
throw { code: 'PROVIDER_NOT_SET', retryable: false }
```

Por lo tanto: en producción, registrar el provider del lado **nativo** antes de RN es la única opción.

## Caso especial: registrar dinámicamente

Si por alguna razón no puedes registrar en `onCreate` / `application(_:didFinishLaunchingWithOptions:)` (ej. necesitas un valor de configuración que se carga de forma asíncrona), tienes dos opciones:

1. **Bloquear la inicialización de RN**: cargar el config primero, luego setear el provider, luego inicializar RN. El usuario ve un splash más largo, pero la integración es consistente.
2. **Registrar después y manejar el primer error en JS**: hacer que la app RN tolere `PROVIDER_NOT_SET` para los primeros requests y reintente. Más complejo, no recomendado.

## Cómo verificar el orden

### Android

Añade un log explícito en `onCreate`:

```kotlin
RNNetworkRegistry.provider = AppNetworkProvider()
Log.d("Net", "[BEFORE_RN] provider set, registryId=${System.identityHashCode(RNNetworkRegistry)}")
ReactNativeHostManager.initialize(this)
Log.d("Net", "[AFTER_RN] RN initialized")
```

Debería verse en logcat:

```
Net: [BEFORE_RN] provider set, registryId=12345678
Net: [AFTER_RN] RN initialized
```

Y desde JS, al cargar la primera pantalla:

```typescript
import { isAvailable } from '@scotia/rn-network'
console.log('isAvailable:', isAvailable()) // debe ser true
```

### iOS

Análogo con `print` o `os_log`.

## Pitfall sutil: registrar en lazy init

Cuando se asigna a un singleton de Kotlin/Swift, los efectos secundarios solo ocurren si la propiedad se evalúa. Asegúrate de que el código que registra el provider no esté detrás de un `lazy { }` o `by lazy` que nunca se llame antes de que RN inicie.

```kotlin
// ❌ Si nadie llama a NetworkBootstrap antes de RN, el provider queda null
object NetworkBootstrap {
    init {
        RNNetworkRegistry.provider = AppNetworkProvider()
    }
}
```

Solución: invocarlo explícitamente desde `Application.onCreate()`:

```kotlin
override fun onCreate() {
    super.onCreate()
    NetworkBootstrap // fuerza la evaluación del init
    ReactNativeHostManager.initialize(this)
}
```

## Siguiente paso

[Publicación de artefactos →](06-publicacion-de-artefactos.md)
