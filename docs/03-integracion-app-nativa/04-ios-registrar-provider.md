# iOS · Registrar el provider

## Implementación de referencia (URLSession)

```swift
import iOSNetworkContract
import Foundation

final class AppNetworkProvider: NetworkProvider {
    private let session: URLSession

    // En producción: configurar URLSessionDelegate con pinning, certificados del banco, etc.
    init(session: URLSession = .shared) { self.session = session }

    func request(
        requestId: String,
        url: String,
        method: String,
        headers: [String: String],
        body: [String: Any]?
    ) async throws -> NetworkResponse {
        guard let parsed = URL(string: url) else {
            throw NetworkError(code: "UNKNOWN", retryable: false)
        }

        var req = URLRequest(url: parsed)
        req.httpMethod = method
        headers.forEach { req.setValue($1, forHTTPHeaderField: $0) }
        if let body = body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            if req.value(forHTTPHeaderField: "Content-Type") == nil {
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            }
        }

        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw NetworkError(code: "UNKNOWN", retryable: false)
        }

        // Caso de dominio: sesión expirada (header definido por el banco).
        if http.statusCode == 401,
           http.value(forHTTPHeaderField: "X-Session-Expired") == "true" {
            throw NetworkError(code: "SESSION_EXPIRED", retryable: false, httpStatus: 401)
        }

        let headers = (http.allHeaderFields as? [String: String]) ?? [:]

        // NO clasificamos 4xx/5xx — el módulo Expo lo hace por statusCode.
        return NetworkResponse(
            statusCode: http.statusCode,
            headers: headers,
            data: http.statusCode == 204 ? nil : data
        )
    }

    func cancel(requestId: String) {
        // Opcional. Buscar el URLSessionTask asociado al requestId y `.cancel()`.
    }
}
```

## Registro

En `AppDelegate.application(_:didFinishLaunchingWithOptions:)`, **antes** de inicializar el host de RN:

```swift
import iOSNetworkContract

// 1. AppConfig estático
RNNetworkRegistry.appConfig = AppConfig(
    country: "CL",
    environment: "prod",
    domains: [
        DomainConfig(key: "BFF", baseURL: "https://api.bank.cl"),
        DomainConfig(key: "INSURANCE", baseURL: "https://insurance.bank.cl"),
    ]
)

// 2. Dominio activo inicial
RNNetworkRegistry.activeDomain = "BFF"

// 3. Provider real (omitir si querés que la RN caiga al mock JS)
RNNetworkRegistry.provider = AppNetworkProvider()

// 4. Notificar a JS cuando la sesión se cae
RNNetworkRegistry.onSessionExpired = { [weak self] in
    self?.logger.warn("Session expired, notifying RN")
}

// 5. SIEMPRE al final
ReactNativeHostManager.shared.initialize()
```

## Errores a tirar como `NetworkError`

| Situación | `code` sugerido | `retryable` |
|---|---|---|
| 401 con header de sesión expirada | `SESSION_EXPIRED` | false |
| 401 por credenciales malas | `SESSION_UNAUTHORIZED` | false |
| 429 con `Retry-After` | `RATE_LIMITED` (con `info = ["retryAfter": N]`) | true |
| Cualquier código de dominio del banco | `SCOTIA_*` | según corresponda |

Para 4xx/5xx genéricos **no tires** — devolvé el `NetworkResponse` con el status y dejá que el módulo lo clasifique.

## Errores del sistema

`URLError` (timeout, no connectivity, SSL pinning), `CancellationError` — **dejá que se propaguen**. El `NetworkErrorMapper` del módulo Expo los traduce a códigos estándar.
