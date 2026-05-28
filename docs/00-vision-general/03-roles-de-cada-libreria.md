# Roles de cada librería

## `rn-network-contracts`

| Aspecto | Detalle |
|---|---|
| **Lenguajes** | Swift (iOS) + Kotlin (Android), un repo por plataforma en Scotia |
| **Distribución iOS** | Swift Package Manager **y** CocoaPods (mismo `Sources/`) |
| **Distribución Android** | AAR en el Maven interno de Scotia |
| **Deps externas** | Cero |
| **Define** | `NetworkProvider`, `NetworkResponse`, `NetworkError`, `AppConfig`, `DomainConfig`, `RNNetworkRegistry` |
| **Lo consume** | El host nativo del banco **y** `@scotia/rn-network` |
| **Cambios** | Cualquier modificación de las firmas se versiona y se sincroniza Swift ↔ Kotlin en el mismo `MAJOR.MINOR` |

## `@scotia/rn-network`

| Aspecto | Detalle |
|---|---|
| **Tipo** | Expo Module — TS + bindings Swift/Kotlin |
| **Distribución** | npm interno de Scotia (registro privado) |
| **Deps externas** | `expo-modules-core` (peer); cero deps runtime propias |
| **Expone (JS)** | `request()`, `setProvider()`, `setBaseURL()`, `cancelRequest()`, `onSessionExpired()`, `setRequestTimeout()`, `AppConfigProvider`, `useAppConfig()`, `MockNetworkProvider`, `parseAppConfig()` |
| **Depende de** | `rn-network-contracts` (Pod + AAR) |
| **Lo consume** | Las apps RN del banco (ej. `car-insurance-scotia-rn`) |
| **Hace** | Bridge JS↔nativo, fallback a mock cuando no hay provider, timeout cliente, evento `sessionExpired` |
| **NO hace** | Pinning, manejo de tokens, retries de red, cache HTTP — todo eso vive en el provider del host |

## App del banco (host nativo)

| Aspecto | Detalle |
|---|---|
| **Tipo** | App nativa iOS/Android con módulos RN embebidos |
| **Responsabilidades** | Implementar `NetworkProvider`, registrar en `RNNetworkRegistry` antes de iniciar RN, mantener la sesión, propagar `onSessionExpired` |
| **No depende** | Del módulo Expo. Solo de `rn-network-contracts`. |

## App RN consumidora

| Aspecto | Detalle |
|---|---|
| **Tipo** | App RN/Expo embebida vía expo-brownfield |
| **Responsabilidades** | Llamar a `request()`, montar `AppConfigProvider`, registrar `onSessionExpired` listener, opcionalmente registrar un `MockNetworkProvider` con fixtures para desarrollo |
| **No depende** | Del provider nativo. Solo conoce la API de `@scotia/rn-network`. |
