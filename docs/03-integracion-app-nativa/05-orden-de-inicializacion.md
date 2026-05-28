# Orden de inicialización

> **Regla crítica:** asigná los campos de `RNNetworkRegistry` **antes** de inicializar el runtime de React Native. Si el orden se invierte, el módulo Expo va a leer `provider == nil` y caer al mock JS aunque hayas registrado un provider real.

## Secuencia correcta

```
1. App nativa arranca
2. AppDelegate / MainApplication setea:
   - RNNetworkRegistry.appConfig
   - RNNetworkRegistry.activeDomain
   - RNNetworkRegistry.provider          (opcional)
   - RNNetworkRegistry.onSessionExpired  (opcional)
3. Init del React Native host
4. RN levanta, ejecuta initNetworkConfig()
5. AppConfigProvider lee getNativeAppConfig() + getNativeActiveDomain()
6. JS hace su primer request() → llega al provider nativo
```

## Por qué importa

El módulo Expo evalúa `isAvailable()` en cada `request()`. Internamente eso es:

```swift
return RNNetworkRegistry.provider != nil
```

Si en el paso 4 ya hay código JS preguntando "¿hay provider?" y el host todavía no lo asignó, la respuesta es `false`. El JS entonces cae al `MockNetworkProvider` o tira `PROVIDER_NOT_SET`. No hay reintento — el módulo no "espera" a que el host se decida.

## Patrón para garantizar el orden

### iOS

`AppDelegate.application(_:didFinishLaunchingWithOptions:)` corre **antes** del primer JS. Setear todo ahí es seguro.

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions ...) -> Bool {
    setupNetworkRegistry()    // 1
    setupReactNative()        // 2
    return true
}
```

### Android

`MainApplication.onCreate()` corre **antes** del primer `Activity` y antes del init de RN. Setear todo ahí es seguro.

```kotlin
override fun onCreate() {
    super.onCreate()
    setupNetworkRegistry()    // 1
    setupReactNative()        // 2
}
```

## Cuándo NO setear `provider`

Si querés que la app RN use el `MockNetworkProvider` JS (por ejemplo en una build con backend stubbed), **no** asignes `RNNetworkRegistry.provider`. Igual seteá `appConfig` y `activeDomain` (la app RN los lee para mostrar el environment correctamente).

```swift
RNNetworkRegistry.appConfig    = AppConfig(...)
RNNetworkRegistry.activeDomain = "MOCK"
// RNNetworkRegistry.provider = nil  ← intencional
```

La app RN detectará `isAvailable() === false` y usará su `MockNetworkProvider` con fixtures locales.
