# Troubleshooting

Catálogo de problemas comunes con diagnóstico.

## `isAvailable() === false` aunque el host registró el provider

### Causa A — iOS: dos copias del contrato (versiones distintas)

Síntoma: el módulo Expo y el host tienen dos `RNNetworkRegistry`, o crash con `Symbol not found: ...request...` en runtime.

Diagnóstico:

```swift
print("registry:", ObjectIdentifier(RNNetworkRegistry.self))
```

Si el `ObjectIdentifier` desde el host y desde el módulo Expo difieren, hay duplicación.

Causa raíz típica: **la app nativa usa una versión del `iOSNetworkContract.xcframework` y el módulo Expo bundlea otra.** Las firmas no coinciden.

Solución:

1. Confirmar que ambos usan la **misma versión** del xcframework.
2. En dev local: `cd rn-network-contracts && ./scripts/build-and-sync.sh` para regenerar y sincronizar.
3. Re-instalar el módulo en la app (`npm install ../rn-network …`) y rebuild de ScotiaBrownfield.

### Causa A.2 — iOS: `Undefined symbols ... NetworkError.httpStatus` al LINKEAR

Síntoma: compila pero falla el link del app target.

Causa: pod estático (`RnNetwork`) que vendoriza framework dynamic — CocoaPods no propaga el `-framework` al app target.

Solución: el `user_target_xcconfig` del podspec lo resuelve (ver [03 · Distribución del contrato](../02-integracion-app-rn/03-config-plugin.md)). Reinstalar pods.

### Causa B — Android: distinto `ClassLoader`

Síntoma: dos artefactos diferentes del contrato en el classpath.

Diagnóstico:

```kotlin
Log.d("Net", "host=${System.identityHashCode(RNNetworkRegistry)} cl=${RNNetworkRegistry::class.java.classLoader}")
// y desde JS:
RnNetworkModule.debugIdentity()
```

Los IDs deben coincidir.

Solución: unificar la fuente del AAR a una sola coordenada Maven. No mezclar JitPack con Maven interno ni con composite build.

### Causa C — Orden de inicialización

Síntoma: el código JS pregunta `isAvailable()` antes de que el host haya seteado `provider`.

Solución: setear `RNNetworkRegistry.provider` **antes** de inicializar React Native. Ver [orden de inicialización](../03-integracion-app-nativa/05-orden-de-inicializacion.md).

## `PROVIDER_NOT_SET` desde `request()`

Sin host nativo y sin `setProvider` JS.

Solución: en dev, agregar `setProvider(new MockNetworkProvider({routes: ...}))` en `networkConfig.ts`. En prod, asegurar que el host registra antes de inicializar RN.

## `TIMEOUT` reiteradamente en endpoints específicos

### Causa A — Timeout cliente muy bajo

El default es 30 s. Si tu endpoint legítimamente tarda más:

```typescript
await request('/slow', 'GET', {}, undefined, { timeoutMs: 60_000 })
```

### Causa B — El host nativo no implementó timeout

Si el nativo no devuelve nunca, el cliente eventualmente dispara `TIMEOUT`. Verificar que el `URLSession`/`OkHttpClient` del host tenga timeouts configurados (típico 30 s).

## `SSL_PINNING_FAILED`

Cert rotado o pin mal calculado.

Recalcular:

```bash
openssl x509 -in cert.pem -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl base64
```

## `INVALID_RESPONSE_BODY`

2xx pero body no es JSON. Causas comunes:

- El BFF devuelve XML/HTML en éxito por error de routing.
- Encoding distinto a UTF-8.
- Response trailer corrupto (rare).

Diagnóstico: capturar el response en el provider antes de retornar:

```swift
print("body:", String(data: data, encoding: .utf8) ?? "<non-utf8>")
```

## El evento `sessionExpired` nunca llega al JS

- ¿El host está invocando `RNNetworkRegistry.onSessionExpired?()` cuando detecta la expiración?
- ¿El JS está suscripto **antes** de que se dispare el evento? Si la app no termina de montar antes del evento, el handler se pierde.

Patrón seguro:

```typescript
useEffect(() => onSessionExpired(handler), [])  // en _layout.tsx, lo más arriba posible
```

## `setActiveDomain` no cambia el `baseURL`

- ¿La `key` que pasaste existe en `config.domains`? Si no, `setActiveDomain` es no-op.
- ¿Estás leyendo `getBaseURL()` después del cambio? Es síncrono pero requiere que el bridge haya propagado al nativo. Para garantizarlo en tests, `await` el call:

```typescript
await RNNetworkBridge.setActiveDomain('INSURANCE')
console.log(getBaseURL())   // ahora sí
```

## `Could not resolve …contracts:1.x.x` (Android)

Verificar:

1. Que el repo Maven interno está agregado en `settings.gradle.kts`.
2. Que las credenciales (`scotiaNexusUser`/`scotiaNexusPass`) están en `~/.gradle/gradle.properties` o variables de entorno.
3. Que la versión existe en el Nexus (`./gradlew :app:dependencyInsight --dependency contracts`).

## Versiones inconsistentes entre host y expo-module

Si el host usa contracts `1.1.0` y el expo-module está pineado a `1.0.x`, la JVM/Swift resuelve una sola — generalmente la más alta — y rompe los símbolos que estaban en la versión más baja.

Diagnóstico:

```bash
# Android
./gradlew :app:dependencyInsight --dependency contracts

# iOS
pod outdated
```

Solución: actualizar `rn-network` para que pinee a la misma versión que el host.

## Metro: `Unable to resolve module @scotia/rn-network` (dev local con symlink)

Síntoma: el build nativo pasa pero Metro no encuentra el módulo.

Causa: el módulo está linkeado por symlink a una carpeta **fuera del project root**, y Metro no la observa.

Solución: agregar `metro.config.js` con `watchFolders` + `blockList` (ver [Modo desarrollo](../02-integracion-app-rn/05-modo-desarrollo.md)). O usar `file:` (copia) en vez de symlink.

## Metro: `Unable to resolve @react-native/virtualized-lists`

Síntoma: aparece tras agregar el `metro.config.js`.

Causa: `disableHierarchicalLookup: true` rompe la resolución interna de react-native.

Solución: NO usar `disableHierarchicalLookup`. Usar `blockList` sobre `rn-network/node_modules` + `nodeModulesPaths` apuntando al node_modules de la app (deja el lookup jerárquico ON).
