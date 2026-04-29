import ExpoModulesCore

public class RNNetworkModule: Module {
    public func definition() -> ModuleDefinition {
        Name("RNNetworkModule")

        Function("hasNativeProvider") {
            return RNNetworkRegistry.provider != nil
        }

        Function("getNativeBaseURL") {
            return RNNetworkRegistry.baseURL
        }

        AsyncFunction("request") { (url: String, method: String, headers: [String: String], body: [String: Any]?) async throws -> [String: Any] in
            guard let provider = RNNetworkRegistry.provider else {
                throw NetworkException(code: "PROVIDER_NOT_SET", retryable: false)
            }

            let data: Data = try await withCheckedThrowingContinuation { continuation in
                provider.request(
                    url: url,
                    method: method,
                    headers: headers,
                    body: body ?? [:]
                ) { data, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let data = data {
                        continuation.resume(returning: data)
                    } else {
                        continuation.resume(throwing: NetworkException(code: "UNKNOWN", retryable: false))
                    }
                }
            }

            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw NetworkException(code: "UNKNOWN", retryable: false)
            }

            return json
        }
    }
}
