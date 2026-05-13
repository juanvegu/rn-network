# 03 — Integración en una app nativa

Guía para equipos que tienen una app nativa Android/iOS que va a **hospedar** un runtime de React Native y necesita exponer su stack de red a la app RN vía `rn-network-contracts`.

## Qué te toca hacer

Como autor de la app nativa host:

1. Consumir `rn-network-contracts` desde tu app nativa.
2. Implementar la interfaz `NetworkProvider` (típicamente con OkHttp + pinning en Android, URLSession + pinning en iOS).
3. Registrar tu provider y un `appConfig` en `RNNetworkRegistry` **antes** de inicializar el runtime de React Native.

## Páginas de esta sección

### Android
- [Consumir contracts](01-android-consumir-contracts.md) — añadir la dependencia Maven/JitPack.
- [Registrar provider](02-android-registrar-provider.md) — implementar `NetworkProvider`, registrar en `Application.onCreate()`.

### iOS
- [Consumir contracts](03-ios-consumir-contracts.md) — añadir el pod / SPM package.
- [Registrar provider](04-ios-registrar-provider.md) — implementar `NetworkProvider`, registrar en `AppDelegate`.

### Comunes
- [Orden de inicialización](05-orden-de-inicializacion.md) — la regla crítica que rompe el 90% de las integraciones nuevas.
- [Publicación de artefactos](06-publicacion-de-artefactos.md) — cómo se publican nuevos tags de `contracts` (referencia para mantenedores).

## Prerrequisitos

- Android: Gradle 8+, Kotlin 1.9+, SDK 24+.
- iOS: CocoaPods 1.13+ o SPM, iOS 15.1+, Swift 5.9+.
- Acceso al repo `juanvegu/rn-network-contracts` (público a través de JitPack/scotia-podspecs).
