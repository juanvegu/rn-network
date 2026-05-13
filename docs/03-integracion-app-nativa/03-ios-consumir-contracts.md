# iOS — Consumir `rn-network-contracts`

Cómo añadir el contracts a una app nativa iOS. Soporta dos vías: **CocoaPods** (recomendado si convives con la app RN brownfield) y **Swift Package Manager** (más simple si la app es 100% nativa).

## Vía 1 — CocoaPods (recomendado para hosts brownfield)

### 1. Añadir el source al `Podfile`

Al inicio del `Podfile`:

```ruby
source 'https://github.com/juanvegu/scotia-podspecs.git'
source 'https://cdn.cocoapods.org/'

platform :ios, '15.1'
use_frameworks!  # o use_frameworks! :linkage => :static
```

### 2. Declarar el pod

Dentro del target principal:

```ruby
target 'AppNativa' do
  pod 'NetworkContracts'  # toma la última versión disponible
  # o pinear:
  # pod 'NetworkContracts', '1.0.3'
end
```

### 3. (Solo si convives con la app RN brownfield) Forzar `NetworkContracts` como dynamic

Si tu Podfile usa `use_frameworks! :linkage => :static`, debes forzar `NetworkContracts` a dinámico para que sea un único símbolo compartido con el módulo RN. Añade antes del primer `target`:

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

> Si la app RN ya corre este plugin (`withNetworkContracts`) durante su prebuild, el hook ya está inyectado en el Podfile generado. Solo necesitas duplicarlo si tu Podfile **no** es generado por la app RN.

### 4. `pod install`

```bash
cd ios && pod install
```

Esperado en la salida:

```
Installing NetworkContracts (1.0.3)
```

Verifica el `Podfile.lock`:

```
PODS:
  - NetworkContracts (1.0.3)
```

## Vía 2 — Swift Package Manager (apps nativas puras)

Si tu app iOS es 100% nativa y no convive con un módulo RN brownfield en el mismo binario, SPM es más simple.

### 1. Añadir el package en Xcode

`File → Add Package Dependencies...`

URL del paquete:

```
https://github.com/juanvegu/rn-network-contracts
```

Producto a añadir al target: `ScotiaRNNetworkContracts` (nombre lógico del package; el módulo Swift se sigue importando como `NetworkContracts`).

> **Nota:** SPM y CocoaPods conviviendo para el **mismo** símbolo `NetworkContracts` en el mismo binario es problemático. Si tu app brownfield ya consume el pod, no añadas SPM también. Elige una vía.

### 2. Importar

En cualquier archivo Swift:

```swift
import NetworkContracts
```

## Verificar que está disponible

Crea un archivo de prueba:

```swift
import NetworkContracts

func smokeTest() {
    print("Provider está registrado:", RNNetworkRegistry.provider != nil)
    print("AppConfig:", RNNetworkRegistry.appConfig ?? "nil")
}
```

Si compila sin errores, el contracts está correctamente vinculado.

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `Unable to find a specification for 'NetworkContracts'` | Falta el source `scotia-podspecs` en el Podfile | Añadir `source 'https://github.com/juanvegu/scotia-podspecs.git'` al inicio |
| `pod install` falla con "no podspec found" | El podspec aún no se publicó para ese tag | Verificar `https://github.com/juanvegu/scotia-podspecs` — el podspec se commitea ahí |
| Linker error: duplicate symbol `_$s16NetworkContracts...` | El pod está enlazado dos veces (estático en dos targets distintos) | Forzar dynamic framework con el `pre_install` hook |
| `No such module 'NetworkContracts'` después de `pod install` | Workspace no abierto / target sin la dep | Abrir el `.xcworkspace`, no el `.xcodeproj`. Verificar Build Phases → Link Binary |

## Siguiente paso

[iOS — registrar provider →](04-ios-registrar-provider.md)
