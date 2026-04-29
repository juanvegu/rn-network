import Foundation

@objc public protocol NetworkProvider: NSObjectProtocol {
    func request(
        url: String,
        method: String,
        headers: [String: String],
        body: [String: Any],
        completion: @escaping (Data?, Error?) -> Void
    )
}
