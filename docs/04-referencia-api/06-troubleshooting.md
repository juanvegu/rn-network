# Troubleshooting

Catálogo de problemas comunes y cómo diagnosticarlos.

## Síntomas en runtime

### `request()` lanza `PROVIDER_NOT_SET`

**Causas posibles:**

1. La app nativa host no ejecutó `RNNetworkRegistry.provider = ...` antes de inicializar RN. Ver [Orden de inicialización](../03-integracion-app-nativa/05-orden-de-inicializacion.md).
2. La app no está embebida en un host nativo (ej. estás corriendo `expo start` sin hosts), no estás en `__DEV__`, y no llamaste a `setProvider()`. En desarrollo, usar `MockNetworkProvider` o un provider JS custom. Ver [Modo desarrollo](../02-integracion-app-rn/05-modo-desarrollo.md).
3. (iOS) `NetworkContracts` quedó como static framework y el símbolo `RNNetworkRegistry` está duplicado — la app host escribió en una instancia y el módulo RN lee de la otra. Aplicar el `pre_install` hook (debería hacerlo el config plugin automáticamente).
4. (Android) `RNNetworkRegistry` se cargó con dos `ClassLoader` distintos (raro, solo en escenarios con plugins/feature delivery). Verificar con `debugIdentity` desde JS y `System.identityHashCode(RNNetworkRegistry)` desde el host.

### `isAvailable()` retorna `false` en producción

Mismas causas que `PROVIDER_NOT_SET`. Verificar:

- (Android) Logs del host en `onCreate`: ¿se ejecutó el código de registro?
- (iOS) Breakpoint en `AppDelegate.application(_:didFinishLaunchingWithOptions:)`: ¿se llegó a la línea de registro?
- ¿La línea de `RNNetworkRegistry.provider = ...` está **antes** de la inicialización de RN?

### Las requests funcionan en debug pero fallan en release

**Android — posibles causas:**

1. ProGuard/R8 eliminó símbolos de `contracts`. Añadir:
   ```proguard
   -keep class com.scotia.rnnetwork.contracts.** { *; }
   ```
2. Resolution distinta de Gradle entre `debug` y `release` (raro pero posible). Verificar con `./gradlew :app:dependencyInsight --dependency rn-network-contracts --configuration releaseRuntimeClasspath`.

**iOS — posibles causas:**

1. App Transport Security bloquea HTTP en release (en debug, `NSAllowsArbitraryLoads = true` lo permite). Verificar que todos los `baseURL` en `appConfig.domains` sean HTTPS.
2. Pinning configurado solo para un host específico que no es el de producción.

### `SSL_PINNING_FAILED` solo en algunos entornos

- El pin solo cubre un dominio. Añadir todos los dominios que el `activeDomain` pueda alcanzar al `CertificatePinner` (Android) o al `pinnedSPKIs` (iOS).
- El certificado rotó. Recalcular el SPKI:
  ```bash
  openssl s_client -connect api.bank.cl:443 -servername api.bank.cl | \
    openssl x509 -pubkey -noout | \
    openssl pkey -pubin -outform DER | \
    openssl dgst -sha256 -binary | \
    openssl base64
  ```

### `UNKNOWN` con respuestas que parecen JSON válido

Probablemente la respuesta es un **array** raíz (`[...]`) o un primitivo (`"texto"`, `42`). El módulo nativo solo acepta **objetos** raíz (`{...}`). Si el endpoint devuelve un array, envolverlo en el servidor:

```json
{ "items": [ ... ] }
```

O, si no puedes cambiar el servidor, escribir un provider JS custom que adapte la respuesta.

## Síntomas en build / compilación

### Android: `Could not resolve com.github.juanvegu:rn-network-contracts:X`

1. Falta el repo JitPack en `settings.gradle(.kts)`:
   ```kotlin
   maven { url = uri("https://jitpack.io") }
   ```
2. El tag `X` no existe en GitHub o no está construido. Navegar a `https://jitpack.io/com/github/juanvegu/rn-network-contracts/X/` — JitPack lo construye on-demand, revisar el log si falla.
3. (Raro) El proxy corporativo bloquea JitPack. Configurar credenciales o mirror.

### Android: `Type ... is defined multiple times`

`rn-network-contracts` entró por dos rutas distintas (típicamente composite build + Maven, o dos versiones distintas). Unificar:

```bash
./gradlew :app:dependencyInsight --dependency rn-network-contracts
```

Debe mostrar una sola entrada. Si muestra dos, identificar el origen y forzar una sola versión:

```kotlin
configurations.all {
    resolutionStrategy.force("com.github.juanvegu:rn-network-contracts:1.0.8")
}
```

### iOS: `Unable to find a specification for 'NetworkContracts'`

Falta el source de `scotia-podspecs` en el Podfile. Añadir al inicio:

```ruby
source 'https://github.com/juanvegu/scotia-podspecs.git'
source 'https://cdn.cocoapods.org/'
```

Si después de añadirlo sigue fallando: `pod repo update`, luego `pod install`.

### iOS: `pod install` exitoso pero `No such module 'NetworkContracts'` en código

1. Abrir el `.xcworkspace`, no el `.xcodeproj`.
2. Verificar que el target consumidor tenga `NetworkContracts` en Build Phases → Link Binary With Libraries.
3. Limpiar build folder (`Cmd+Shift+K`) y derivar datos.

### iOS: Linker error `duplicate symbol _$s16NetworkContracts...`

`NetworkContracts` quedó enlazado estáticamente dos veces. Aplicar el `pre_install` hook que fuerza dynamic framework:

```ruby
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name == 'NetworkContracts'
      def pod.build_type
        Pod::BuildType.dynamic_framework
      end
    end
  end
end
```

Después: `cd ios && pod deintegrate && pod install`.

## Síntomas en TypeScript

### `Module '@scotia/rn-network' has no exported member ...`

1. Limpiar `node_modules` y reinstalar:
   ```bash
   rm -rf node_modules && npm install
   ```
2. Verificar que el `package.json` resuelva a un commit que tenga el export que buscas:
   ```bash
   cat node_modules/@scotia/rn-network/build/index.d.ts
   ```
3. Si pegaste un tag específico que no incluye el feature, bump a una versión más nueva.

### El editor no resuelve los tipos pero compila

Probablemente el editor está cacheando una versión vieja del index. Reiniciar el server de TypeScript (en VS Code: `Cmd+Shift+P → Restart TS Server`).

## Diagnóstico de identidad del singleton

### Android

```typescript
// JS
import { RNNetworkBridge } from '@scotia/rn-network'
console.log((RNNetworkBridge as any).debugIdentity?.())
// "registryId=12345678 classloader=..."
```

```kotlin
// Host
Log.d("Net", "host id=${System.identityHashCode(RNNetworkRegistry)} cl=${RNNetworkRegistry::class.java.classLoader}")
```

`registryId` y `classloader` deben coincidir.

### iOS

No hay `debugIdentity` expuesto. Validación indirecta:

1. Desde el host, asignar `RNNetworkRegistry.provider` y loggear:
   ```swift
   print("host: provider set:", RNNetworkRegistry.provider != nil)
   ```
2. Desde JS, después de RN init:
   ```typescript
   console.log('JS isAvailable:', isAvailable())
   ```

Si el host dice `true` y JS dice `false`, el framework está duplicado (típicamente `NetworkContracts` quedó estático).

## Cuándo escalar

Si después de los pasos anteriores el problema persiste:

1. Capturar:
   - Versión exacta de `@scotia/rn-network` (`npm ls @scotia/rn-network`).
   - Versión de `rn-network-contracts` resuelta en Android (`./gradlew dependencyInsight`) e iOS (`Podfile.lock`).
   - Snippet del código de registro del host.
   - `debugIdentity` desde JS si es Android.
   - Logs de la inicialización (`onCreate` / `AppDelegate`).
2. Abrir issue en `https://github.com/juanvegu/scotia-rn-network/issues` o `https://github.com/juanvegu/rn-network-contracts/issues` según corresponda.
