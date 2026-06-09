import Foundation
import ExpoModulesCore
import iOSNetworkContract

final class NetworkException: Exception {
    private let networkCode: String
    private let retryable: Bool
    private let httpStatus: Int?
    private let networkMessage: String?
    private let info: [String: Any]?

    init(
        code: String,
        retryable: Bool,
        httpStatus: Int? = nil,
        message: String? = nil,
        info: [String: Any]? = nil
    ) {
        self.networkCode = code
        self.retryable = retryable
        self.httpStatus = httpStatus
        self.networkMessage = message
        self.info = info
        super.init()
    }

    // The code field carries the full NetworkErrorPayload serialized as JSON.
    // The JS side parses e.code to reconstruct { code, retryable, httpStatus?, message?, info? }.
    override var code: String {
        var dict: [String: Any] = ["code": networkCode, "retryable": retryable]
        if let s = httpStatus { dict["httpStatus"] = s }
        if let m = networkMessage { dict["message"] = m }
        if let i = info, JSONSerialization.isValidJSONObject(i) { dict["info"] = i }
        guard
            let data = try? JSONSerialization.data(withJSONObject: dict),
            let str = String(data: data, encoding: .utf8)
        else { return networkCode }
        return str
    }

    override var reason: String { networkMessage ?? "Network error: \(networkCode)" }
}

enum NetworkErrorMapper {
    static func map(_ error: Error) -> NetworkException {
        if let networkError = error as? NetworkException { return networkError }

        // Typed error coming from the host's provider — pass it through verbatim.
        if let typed = error as? NetworkError {
            return NetworkException(
                code: typed.code,
                retryable: typed.retryable,
                httpStatus: typed.httpStatus,
                message: typed.message,
                info: typed.info
            )
        }

        // Structured-concurrency cancellation flows here when the request is aborted.
        if error is CancellationError {
            return NetworkException(code: "CANCELLED", retryable: false)
        }

        if let urlError = error as? URLError {
            if urlError.code == .cancelled {
                return NetworkException(code: "CANCELLED", retryable: false)
            }
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
