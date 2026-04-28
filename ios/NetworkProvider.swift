import Foundation

public protocol NetworkProvider {
    func request(url: String, method: String, headers: [String: String], body: [String: Any]?) async throws -> Data
}

public protocol CancellableNetworkProvider: NetworkProvider {
    func cancel(requestId: String)
}
