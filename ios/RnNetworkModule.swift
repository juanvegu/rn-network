import ExpoModulesCore
import NetworkContracts

public class RNNetworkModule: Module {
    public func definition() -> ModuleDefinition {
        Name("RNNetworkModule")

        Function("hasNativeProvider") {
            return RNNetworkRegistry.provider != nil
        }

        Function("getNativeAppConfig") {
            return RNNetworkRegistry.appConfig
        }

        Function("getBaseURLForDomain") { (domainKey: String) -> String? in
            guard let domains = RNNetworkRegistry.appConfig?["domains"] as? [[String: String]],
                  let match = domains.first(where: { $0["key"] == domainKey })
            else { return nil }
            return match["baseURL"]
        }

        AsyncFunction("setActiveDomain") { (domainKey: String) in
            guard var config = RNNetworkRegistry.appConfig,
                  let domains = config["domains"] as? [[String: String]],
                  let match = domains.first(where: { $0["key"] == domainKey }),
                  let baseURL = match["baseURL"]
            else { return }
            config["activeDomain"] = domainKey
            config["baseURL"] = baseURL
            RNNetworkRegistry.appConfig = config
        }

        AsyncFunction("request") { (url: String, method: String, headers: [String: String], body: [String: Any]?) async throws -> [String: Any] in
            guard let provider = RNNetworkRegistry.provider else {
                throw NetworkException(code: "PROVIDER_NOT_SET", retryable: false)
            }

            let data: Data
            do {
                data = try await provider.request(url: url, method: method, headers: headers, body: body)
            } catch {
                throw NetworkErrorMapper.map(error)
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw NetworkException(code: "UNKNOWN", retryable: false)
            }

            return json
        }
    }
}
