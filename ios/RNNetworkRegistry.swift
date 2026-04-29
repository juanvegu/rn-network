import Foundation

@objc public final class RNNetworkRegistry: NSObject {
    @objc public dynamic static var provider: NetworkProvider?
    @objc public dynamic static var baseURL: String?
}
