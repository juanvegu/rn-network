import ExpoModulesCore

public class RNNetworkModule: Module {
    public func definition() -> ModuleDefinition {
        Name("RNNetworkModule")

        Function("hasNativeProvider") {
            return RNNetworkRegistry.provider != nil
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
