# Contracts iOS (Swift)

Referencia de los protocolos y singleton del módulo **`iOSNetworkContract`** (repo `rn-network-contracts-ios`). Importás con `import iOSNetworkContract`.

## `NetworkProvider`

```swift
public protocol NetworkProvider {
    func request(
        requestId: String,
        url: String,
        method: String,
        headers: [String: String],
        body: [String: Any]?
    ) async throws -> NetworkResponse

    func cancel(requestId: String)
}

public extension NetworkProvider {
    func cancel(requestId: String) { /* no-op default */ }
}
```

- **NO** clasificar 4xx/5xx — devolver el `NetworkResponse` con `statusCode`, el módulo Expo clasifica.
- Tirar `NetworkError` para casos de dominio.
- Dejar propagar `URLError`, `CancellationError` — el mapper los traduce.
- `cancel` opcional vía extension con default no-op.

## `NetworkResponse`

```swift
public struct NetworkResponse {
    public let statusCode: Int
    public let headers: [String: String]
    public let data: Data?

    public init(statusCode: Int, headers: [String: String] = [:], data: Data? = nil)
}
```

`data = nil` para 204 / sin body.

## `NetworkError`

```swift
public struct NetworkError: Error {
    public let code: String
    public let retryable: Bool
    public let httpStatus: Int?
    public let message: String?
    public let info: [String: Any]?

    public init(
        code: String,
        retryable: Bool = false,
        httpStatus: Int? = nil,
        message: String? = nil,
        info: [String: Any]? = nil
    )
}
```

## `AppConfig` y `DomainConfig`

```swift
public struct DomainConfig {
    public let key: String
    public let baseURL: String
    public init(key: String, baseURL: String)
}

public struct AppConfig {
    public let country: String
    public let environment: String
    public let domains: [DomainConfig]
    public init(country: String, environment: String, domains: [DomainConfig])
}
```

Inmutables. `activeDomain` vive en el registry, no acá.

## `RNNetworkRegistry`

```swift
public final class RNNetworkRegistry {
    public static var provider: NetworkProvider?
    public static var appConfig: AppConfig?
    public static var activeDomain: String?
    public static var onSessionExpired: (() -> Void)?

    public static var activeBaseURL: String? {
        guard let key = activeDomain else { return nil }
        return appConfig?.domains.first { $0.key == key }?.baseURL
    }
}
```

Singleton. Asignar antes de iniciar React Native.
