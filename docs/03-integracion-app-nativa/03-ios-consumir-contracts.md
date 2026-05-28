# iOS · Consumir `rn-network-contracts`

## Distribución dual: SPM + CocoaPods

El repo iOS de contracts ships **ambos** manifests apuntando al mismo `Sources/`. Cada consumidor elige:

| Consumidor | Manager | Por qué |
|---|---|---|
| `rn-network` (módulo Expo) | CocoaPods | Expo Modules todavía no soporta SPM nativo |
| App nativa Scotia migrando a SPM | SPM | Coherente con el roadmap interno |
| App nativa Scotia en Pods legacy | CocoaPods | Sin cambios |

## Opción A: Swift Package Manager

En Xcode → File → Add Package Dependencies → URL del repo interno:

```
https://github.scotiabank.com/<org>/rn-network-contracts-ios.git
```

Versión: `1.1.0` (regla "Up to Next Major" recomendada).

Producto a agregar al target: `NetworkContracts`.

## Opción B: CocoaPods

```ruby
# Podfile del proyecto host
pod 'NetworkContracts', '~> 1.1.0', :source => 'https://github.scotiabank.com/<org>/specs.git'
```

> En el repo legacy el podspec apuntaba a `https://github.com/juanvegu/rn-network-contracts`. La migración a Scotia cambió el host y el path.

Después de modificar el Podfile:

```bash
cd ios && pod install
```

## Verificación

```swift
import NetworkContracts

print("registry instance:", RNNetworkRegistry.self)
print("active base URL:", RNNetworkRegistry.activeBaseURL ?? "nil")
```

Si compilás iOS y obtenés `duplicate symbols for RNNetworkRegistry...`, significa que `NetworkContracts` se linkeó estático. El [config plugin del módulo Expo](../02-integracion-app-rn/03-config-plugin.md) lo fuerza a dynamic — corré `npx expo prebuild --clean` desde la app RN para regenerar el Podfile correcto.
