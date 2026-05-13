# Contracts iOS (Swift)

Referencia de los protocolos y singleton definidos en `rn-network-contracts` para iOS.

Módulo Swift: `NetworkContracts`

## `NetworkProvider`

```swift
import Foundation

/// Core contract — must never change between versions.
/// New capabilities are added as optional protocols that extend this core.
public protocol NetworkProvider {
    func request(
        url: String,
        method: String,
        headers: [String: String],
        body: [String: Any]?
    ) async throws -> Data
}
```

### Contrato

| Parámetro | Tipo | Descripción |
|---|---|---|
| `url` | `String` | URL absoluta. El módulo RN ya resolvió `baseURL` + path relativo. |
| `method` | `String` | Uno de `"GET" | "POST" | "PUT" | "PATCH" | "DELETE"`. Verbatim del JS. |
| `headers` | `[String: String]` | Headers como llegaron desde JS. Sin `Content-Type` automático. |
| `body` | `[String: Any]?` | Body decodificado desde JSON. `nil` para GET/DELETE sin body. |

**Retorna**: `Data` — bytes del response body. El módulo RN los interpretará como JSON.

**Lanza**: cualquier `Error`. El módulo RN llama a `NetworkErrorMapper.map(error)` internamente para convertirlo a `NetworkException` con `code` y `retryable`.

### Convenciones para señalar errores HTTP

Similar a Android: lanzar un `NSError` con `domain = "com.scotia.rnnetwork.http"` y `code = httpStatus` permite al `NetworkErrorMapper` clasificar entre `HTTP_CLIENT_ERROR` y `HTTP_SERVER_ERROR`:

```swift
if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
    throw NSError(
        domain: "com.scotia.rnnetwork.http",
        code: http.statusCode
    )
}
```

## `RNNetworkRegistry`

```swift
import Foundation

/// Shared singleton between the RN App xcframework and the bank's native app.
/// The bank must assign the provider BEFORE initializing React Native.
public final class RNNetworkRegistry {
    public static var provider: NetworkProvider?
    public static var appConfig: [String: Any]?
}
```

| Propiedad | Tipo | Quién la escribe | Quién la lee |
|---|---|---|---|
| `provider` | `NetworkProvider?` | App host (en `AppDelegate` / `@main` struct) | Módulo nativo de `rn-network` |
| `appConfig` | `[String: Any]?` | App host | Módulo nativo de `rn-network` |

> **Crítico:** para que el singleton sea único en runtime, `NetworkContracts` debe ser un **dynamic framework**. Si quedara estático en un Podfile con `use_frameworks! :linkage => :static`, terminarían existiendo **dos copias** del símbolo `RNNetworkRegistry` (una en el binario de la app host y otra en el del módulo RN). Por eso el config plugin de `rn-network` inyecta un `pre_install` hook que fuerza dynamic. Ver [Config plugin](../02-integracion-app-rn/03-config-plugin.md).

### Convenciones del `appConfig`

Las mismas que Android. Claves que el módulo nativo lee:

| Clave | Tipo esperado |
|---|---|
| `"country"` | `String` |
| `"domains"` | `[[String: String]]` con `"key"` y `"baseURL"` |
| `"activeDomain"` | `String` |
| `"baseURL"` | `String` (autocompletado al llamar `setActiveDomain`) |

## `CancellableNetworkProvider`

```swift
public protocol CancellableNetworkProvider: NetworkProvider {
    func cancel(requestId: String)
}
```

Capacidad opcional. El módulo RN detecta `provider is CancellableNetworkProvider` (`provider as? CancellableNetworkProvider`) en runtime.

> Como en Android, la API JS para invocar `cancel` no está expuesta aún en v0.1.33.

## Detalles del podspec

```ruby
Pod::Spec.new do |s|
  s.name             = 'NetworkContracts'
  s.version          = '1.0.3'
  s.platforms        = { :ios => '15.1' }
  s.swift_version    = '5.9'
  s.source_files     = 'ios/Sources/NetworkContracts/**/*.swift'

  s.static_framework = false

  s.pod_target_xcconfig = {
    'MACH_O_TYPE' => 'mh_dylib',
    'DEFINES_MODULE' => 'YES',
    'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -enable-library-evolution'
  }
end
```

Configuraciones relevantes:

- `static_framework = false` — coherente con el `pre_install` hook que fuerza dynamic.
- `BUILD_LIBRARY_FOR_DISTRIBUTION` + `library-evolution` — permite que el framework binario sea ABI-stable entre versiones de Swift.
- `MACH_O_TYPE = mh_dylib` — fuerza la generación como dylib aunque el resto del proyecto sea estático.

## Distribución

Dos vías:

| Vía | Coordenadas | Para quién |
|---|---|---|
| CocoaPods | `pod 'NetworkContracts'` (vía `source 'https://github.com/juanvegu/scotia-podspecs.git'`) | Apps brownfield que conviven con el Podfile generado por la app RN |
| SwiftPM | Package: `https://github.com/juanvegu/rn-network-contracts` — Producto: `ScotiaRNNetworkContracts` | Apps nativas puras |

Ver [iOS — consumir contracts](../03-integracion-app-nativa/03-ios-consumir-contracts.md).

## Dependencias

`NetworkContracts` **no tiene dependencias externas**. Solo Foundation (`Data`, async/await). No arrastra RN ni Expo.
