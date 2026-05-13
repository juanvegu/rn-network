# iOS — Registrar el provider

Cómo implementar `NetworkProvider` y asignarlo a `RNNetworkRegistry.provider`.

## 1. Implementar `NetworkProvider`

La interfaz (definida en `NetworkContracts`):

```swift
public protocol NetworkProvider {
    func request(
        url: String,
        method: String,
        headers: [String: String],
        body: [String: Any]?
    ) async throws -> Data
}
```

Implementación típica con URLSession + pinning. Para SSL pinning en iOS, lo usual es un `URLSessionDelegate` que valida el `serverTrust` contra una SPKI conocida:

```swift
import Foundation
import NetworkContracts

final class AppNetworkProvider: NSObject, NetworkProvider {

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    private let pinnedSPKIs: [String: String] = [
        "api.bank.cl": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    ]

    func request(
        url: String,
        method: String,
        headers: [String: String],
        body: [String: Any]?
    ) async throws -> Data {
        guard let u = URL(string: url) else {
            throw NSError(domain: "AppNetworkProvider", code: -1)
        }
        var req = URLRequest(url: u)
        req.httpMethod = method.uppercased()
        headers.forEach { req.setValue($1, forHTTPHeaderField: $0) }
        if let body = body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            if req.value(forHTTPHeaderField: "Content-Type") == nil {
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            }
        }

        let (data, response) = try await session.data(for: req)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            // El módulo RN mapea este formato a NetworkErrorCode (HTTP_CLIENT_ERROR / HTTP_SERVER_ERROR)
            throw NSError(
                domain: "com.scotia.rnnetwork.http",
                code: http.statusCode
            )
        }
        return data
    }
}

extension AppNetworkProvider: URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard
            challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
            let serverTrust = challenge.protectionSpace.serverTrust
        else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        let host = challenge.protectionSpace.host
        guard let expectedSPKI = pinnedSPKIs[host] else {
            // Host no pinneado — política a definir: aceptar o rechazar
            completionHandler(.performDefaultHandling, nil)
            return
        }

        // Cálculo simplificado: extraer SPKI del leaf y comparar base64 con expectedSPKI
        // (omitir en este snippet por brevedad — usar TrustKit u otra librería en prod)
        let pinValid = validateSPKI(serverTrust: serverTrust, expected: expectedSPKI)
        if pinValid {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }

    private func validateSPKI(serverTrust: SecTrust, expected: String) -> Bool {
        // Implementación real: extraer la SPKI del certificado leaf,
        // hashear con SHA-256, comparar base64 con `expected`.
        // En producción: usar TrustKit, Alamofire ServerTrustManager, etc.
        return true
    }
}
```

> **Nota:** la validación de pinning de arriba está simplificada. En producción usa una librería probada (TrustKit, Alamofire) o sigue la [guía OWASP](https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning).

## 2. Registrar antes de inicializar React Native

### Caso A — `UIApplicationDelegate` (UIKit)

```swift
import UIKit
import NetworkContracts

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // 1) Registrar el provider
        RNNetworkRegistry.provider = AppNetworkProvider()

        // 2) Registrar appConfig
        RNNetworkRegistry.appConfig = [
            "country": "CL",
            "environment": "prod",
            "domains": [
                ["key": "prod",    "baseURL": "https://api.bank.cl"],
                ["key": "staging", "baseURL": "https://staging.bank.cl"],
            ],
            "activeDomain": "prod"
        ]

        // 3) SOLO AHORA inicializar React Native
        // ReactNativeHostManager.shared.initialize()  // o equivalente

        return true
    }
}
```

### Caso B — SwiftUI app lifecycle (`@main` struct)

```swift
import SwiftUI
import NetworkContracts

@main
struct AppNative: App {

    init() {
        RNNetworkRegistry.provider = AppNetworkProvider()
        RNNetworkRegistry.appConfig = [
            "country": "CL",
            "environment": "prod",
            "domains": [
                ["key": "prod",    "baseURL": "https://api.bank.cl"]
            ],
            "activeDomain": "prod"
        ]

        // Inicializar React Native después
        // ReactNativeHostManager.shared.initialize()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

## 3. `CancellableNetworkProvider` (opcional)

```swift
final class AppNetworkProvider: NSObject, CancellableNetworkProvider {
    // request(...) como antes

    func cancel(requestId: String) {
        // tu lógica de cancelación
    }
}
```

El módulo RN detecta en runtime si el provider conforma a `CancellableNetworkProvider` y degrada elegantemente si no.

## Pitfalls comunes

| Síntoma | Causa | Fix |
|---|---|---|
| `isAvailable()` retorna `false` | `RNNetworkRegistry.provider == nil` (orden o framework duplicado) | Verificar orden; ejecutar smoke test desde Swift |
| El host ve `provider != nil` pero JS ve `false` | `NetworkContracts` quedó estático ⇒ dos copias del símbolo | Aplicar el `pre_install` hook que fuerza dynamic framework |
| Pinning falla con "Cancelled" | Hash incorrecto / cert rotado | Recalcular SPKI; en debug, loggear el hash recibido para comparar |
| Funciona en simulador, falla en device | App Transport Security bloquea HTTP | Solo usar HTTPS en producción; HTTP solo en debug con `NSAllowsArbitraryLoads` |

## Siguiente paso

[Orden de inicialización →](05-orden-de-inicializacion.md)
