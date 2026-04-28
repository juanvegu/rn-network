import Foundation
import ExpoModulesCore

final class NetworkException: Exception {
    private let networkCode: String
    private let retryable: Bool
    private let httpStatus: Int?

    init(code: String, retryable: Bool, httpStatus: Int? = nil) {
        self.networkCode = code
        self.retryable = retryable
        self.httpStatus = httpStatus
        super.init()
    }

    // The code field carries the full NetworkErrorPayload serialized as JSON.
    // The JS side parses e.code to reconstruct { code, retryable, httpStatus? }.
    override var code: String {
        var dict: [String: Any] = ["code": networkCode, "retryable": retryable]
        if let s = httpStatus { dict["httpStatus"] = s }
        guard
            let data = try? JSONSerialization.data(withJSONObject: dict),
            let str = String(data: data, encoding: .utf8)
        else { return networkCode }
        return str
    }

    override var reason: String { "Network error: \(networkCode)" }
}

enum NetworkErrorMapper {
    static func map(_ error: Error) -> NetworkException {
        if let networkError = error as? NetworkException { return networkError }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut:
                return NetworkException(code: "TIMEOUT", retryable: true)
            case .notConnectedToInternet, .networkConnectionLost, .dataNotAllowed:
                return NetworkException(code: "NO_CONNECTIVITY", retryable: true)
            case .serverCertificateUntrusted,
                 .clientCertificateRejected,
                 .serverCertificateHasUnknownRoot,
                 .serverCertificateNotYetValid,
                 .serverCertificateHasBadDate:
                return NetworkException(code: "SSL_PINNING_FAILED", retryable: false)
            default:
                break
            }
        }

        let nsError = error as NSError
        if nsError.domain == "com.scotia.rnnetwork.http" {
            let status = nsError.code
            if (400...499).contains(status) {
                return NetworkException(code: "HTTP_CLIENT_ERROR", retryable: false, httpStatus: status)
            } else if (500...599).contains(status) {
                return NetworkException(code: "HTTP_SERVER_ERROR", retryable: true, httpStatus: status)
            }
        }

        return NetworkException(code: "UNKNOWN", retryable: false)
    }
}
