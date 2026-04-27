import Foundation

public protocol NetworkProvider {
    func request(url: String, method: String, headers: [String: String], body: [String: Any]?) async throws -> Data
}

public class RNNetworkRegistry {
    public static var provider: NetworkProvider?
}
