import ExpoModulesCore
import NetworkContracts

public class RNNetworkModule: Module {
    public func definition() -> ModuleDefinition {
        Name("RNNetworkModule")

        Events("sessionExpired")

        OnCreate {
            // Bridge the native session-expired hook to a JS event. The host invokes
            // RNNetworkRegistry.onSessionExpired?() when it detects the session is gone
            // (e.g. after the app returns from background and the token is no longer valid).
            RNNetworkRegistry.onSessionExpired = { [weak self] in
                self?.sendEvent("sessionExpired", [:])
            }
        }

        OnDestroy {
            RNNetworkRegistry.onSessionExpired = nil
        }

        Function("hasNativeProvider") {
            return RNNetworkRegistry.provider != nil
        }

        Function("getNativeAppConfig") { () -> [String: Any]? in
            guard let c = RNNetworkRegistry.appConfig else { return nil }
            return [
                "country": c.country,
                "environment": c.environment,
                "domains": c.domains.map { ["key": $0.key, "baseURL": $0.baseURL] }
            ]
        }

        Function("getNativeActiveDomain") { () -> String? in
            RNNetworkRegistry.activeDomain
        }

        Function("getBaseURLForDomain") { (domainKey: String) -> String? in
            RNNetworkRegistry.appConfig?.domains.first { $0.key == domainKey }?.baseURL
        }

        AsyncFunction("setActiveDomain") { (domainKey: String) in
            guard let domains = RNNetworkRegistry.appConfig?.domains,
                  domains.contains(where: { $0.key == domainKey })
            else { return }
            RNNetworkRegistry.activeDomain = domainKey
        }

        AsyncFunction("cancel") { (requestId: String) in
            RNNetworkRegistry.provider?.cancel(requestId: requestId)
        }

        AsyncFunction("request") { (url: String, method: String, headers: [String: String], body: [String: Any]?) async throws -> [String: Any] in
            guard let provider = RNNetworkRegistry.provider else {
                throw NetworkException(code: "PROVIDER_NOT_SET", retryable: false)
            }

            let response: NetworkResponse
            do {
                response = try await provider.request(url: url, method: method, headers: headers, body: body)
            } catch {
                throw NetworkErrorMapper.map(error)
            }

            // Central rule: only 2xx is success. The host can't "forget" to throw anymore.
            guard (200...299).contains(response.statusCode) else {
                let retryable = response.statusCode >= 500
                let code = response.statusCode < 500 ? "HTTP_CLIENT_ERROR" : "HTTP_SERVER_ERROR"
                throw NetworkException(code: code, retryable: retryable, httpStatus: response.statusCode)
            }

            // 204 / empty body → {}
            guard let data = response.data, !data.isEmpty else { return [:] }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw NetworkException(code: "INVALID_RESPONSE_BODY", retryable: false)
            }
            return json
        }
    }
}
