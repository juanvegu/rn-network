# Distribución del contrato en el módulo Expo (vendored xcframework)

> **Nota histórica:** versiones anteriores usaban un **config plugin** de Expo que inyectaba un `post_install` en el Podfile para forzar `NetworkContracts` a dynamic framework. **Ese plugin se eliminó.** Con el xcframework binario ya no hace falta forzar nada — el binario ya es dynamic. Lo reemplaza el `vendored_frameworks` + `user_target_xcconfig` que se describe acá.

## Cómo el módulo Expo obtiene el contrato

`@scotia/rn-network` **bundlea** el `iOSNetworkContract.xcframework` dentro del paquete (`ios/iOSNetworkContract.xcframework`). El podspec lo declara como `vendored_frameworks`:

```ruby
# ios/RnNetwork.podspec
s.vendored_frameworks = 'iOSNetworkContract.xcframework'
s.exclude_files       = 'iOSNetworkContract.xcframework/**/*'
```

- En **dev local**: el xcframework se sincroniza con `rn-network-contracts/scripts/build-and-sync.sh`.
- En **producción**: el pipeline del módulo Expo baja el xcframework publicado de Artifactory y lo bundlea en el paquete npm.

## El `user_target_xcconfig` (crítico)

Con static linking (el default de Expo, `use_frameworks!` off), un pod estático (`RnNetwork`) que vendoriza un framework dynamic (`iOSNetworkContract`) tiene un problema conocido de CocoaPods:

- CocoaPods agrega el `FRAMEWORK_SEARCH_PATHS` del xcframework → **compila** bien (encuentra el `.swiftinterface`)
- Pero **no propaga** el `-framework iOSNetworkContract` al app target → **no linkea** (`Undefined symbols`)

Se fuerza con `user_target_xcconfig` (aplica al app target, no al pod):

```ruby
s.user_target_xcconfig = {
  'OTHER_LDFLAGS' => '-framework "iOSNetworkContract"',
  'FRAMEWORK_SEARCH_PATHS' => '"${PODS_XCFRAMEWORKS_BUILD_DIR}/RnNetwork"',
}
```

Esto viaja en el podspec, así que cualquier app que instale el módulo lo recibe — **sin** config plugin, sin tocar la app.

## Validación

Después de `pod install`, el app target debe tener el flag de link:

```bash
grep "iOSNetworkContract" "ios/Pods/Target Support Files/Pods-<app>/Pods-<app>.debug.xcconfig"
# Debe aparecer: -framework "iOSNetworkContract"
```

Y el framework debe embeberse en runtime:

```bash
grep "iOSNetworkContract" "ios/Pods/Target Support Files/Pods-<app>/Pods-<app>-frameworks.sh"
# Debe aparecer: install_framework ...iOSNetworkContract.framework
```

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `Undefined symbols ... iOSNetworkContract.NetworkError.httpStatus` al linkear | Falta `-framework` en el app target (pod estático + framework dynamic) | El `user_target_xcconfig` lo arregla; reinstalar pods |
| `Symbol not found: ...request...` en **runtime** | Versión del xcframework del módulo ≠ versión que usa la app nativa | Alinear versiones (rebuild del módulo + sync) |
| `cannot find type ... in scope` al compilar el módulo | El xcframework no tiene `Modules/swiftinterface` | Regenerar con `build-xcframework.sh` (maneja el gotcha de SwiftPM) |

## Sin config plugin

Como ya no hay config plugin:
- **No** hay entrada `"@scotia/rn-network"` en `plugins` del `app.json`
- **No** se inyecta nada al Podfile vía prebuild
- El módulo se autolinkea normal (vía `expo-module.config.json`) y trae el xcframework por vendored
