# iOS · Consumir `iOSNetworkContract`

## El contrato es dual-capable: source (SPM) o binario (xcframework)

El contrato `iOSNetworkContract` **puede distribuirse de las dos formas** — no son excluyentes:

- **Source vía SPM**: el `Package.swift` (modo source) compila los `.swift` directamente. Funciona para un consumidor SPM aislado.
- **Binario vía xcframework**: un `.xcframework` precompilado, consumible por SPM (`.binaryTarget`) **y** por CocoaPods (`vendored_frameworks`).

> **Por qué usamos el binario (xcframework) y no source:** NO es porque SPM falle. Es por una **limitación del ecosistema Expo/React Native**: el módulo Expo (`@scotia/rn-network`) está atado a CocoaPods (ExpoModulesCore, autolinking y brownfield son CocoaPods; no hay soporte SPM nativo en Expo todavía, y el plugin `cocoapods-spm` está vetado por seguridad del banco).
>
> Para que el contrato se comparta como **una sola instancia** de `RNNetworkRegistry` entre la **app nativa (SPM)** y el **módulo Expo (CocoaPods)**, ambos tienen que apuntar al **mismo binario**. Si cada lado compilara source por su cuenta (SPM source + CocoaPods source), habría **dos compilaciones → dos singletons → contrato roto**. El xcframework garantiza una sola copia.
>
> **Cuándo volver a source:** cuando Expo/RN soporten SPM first-class (RN 0.84+ roadmap, hoy experimental — ver [issue expo#37813](https://github.com/expo/expo/issues/37813)), la app nativa y el módulo Expo podrían consumir el mismo `Package.swift` source y el xcframework dejaría de ser necesario.

| Escenario | Qué alcanza |
|---|---|
| Consumidor **SPM puro** (solo app nativa, sin Expo) | Source SPM funciona — una compilación, un singleton |
| **Compartido** (app nativa SPM + módulo Expo CocoaPods) | **xcframework binario** requerido — para una sola instancia compartida |

## Consumir el xcframework en la app nativa (SPM)

### Producción — `.binaryTarget` con URL + checksum

El pipeline publica el xcframework a Artifactory y genera `DISTRIBUTION.md` con el snippet exacto:

```swift
// Package.swift de la app nativa
.binaryTarget(
    name: "iOSNetworkContract",
    url: "https://artifactory.scotiabank.cl/ios/iOSNetworkContract/1.1.0/iOSNetworkContract.xcframework.zip",
    checksum: "<sha256 del DISTRIBUTION.md>"
)
```

El `checksum` cambia en cada build — siempre tomalo del `DISTRIBUTION.md` de la versión publicada.

### Dev local — `.binaryTarget(path:)` o arrastrar a Xcode

```swift
.binaryTarget(
    name: "iOSNetworkContract",
    path: "../rn-network-contracts/build/iOSNetworkContract.xcframework"
)
```

O en Xcode: arrastrar `build/iOSNetworkContract.xcframework` al proyecto → "Frameworks, Libraries, and Embedded Content" → **Embed & Sign**.

## Verificación

```swift
import iOSNetworkContract

print("active base URL:", RNNetworkRegistry.activeBaseURL ?? "nil")
```

Si compila e importa, el xcframework tiene el `Modules/swiftinterface` correcto.

## Nota sobre el singleton compartido

El objetivo es que la app nativa y el módulo Expo terminen con **un solo** `RNNetworkRegistry` en runtime. Con xcframework:

- Ambos referencian el **mismo binario** (misma versión, mismo install name `@rpath/iOSNetworkContract.framework/...`).
- dyld carga una sola copia por install name → un solo singleton.

**Regla de oro:** la app nativa y el módulo Expo deben usar **la misma versión** del xcframework. Si divergen, vuelve el error `Symbol not found` en runtime. Por eso el contrato y el módulo se versionan de forma coordinada.

## Verás esto en troubleshooting

| Síntoma | Causa probable |
|---|---|
| `Symbol not found: ...request...` en runtime | App nativa y módulo Expo usan versiones distintas del xcframework |
| `cannot find type ... in scope` al compilar | Falta el `Modules/swiftinterface` en el xcframework (regenerar con `build-xcframework.sh`) |
| `Undefined symbols ... NetworkError.httpStatus` al linkear | Es el lado del **módulo Expo** (ver [vendored + user_target_xcconfig](../02-integracion-app-rn/03-config-plugin.md)) |
