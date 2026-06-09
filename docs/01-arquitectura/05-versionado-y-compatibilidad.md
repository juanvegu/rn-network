# Versionado y compatibilidad

## Política

| Tipo de cambio | Bump | Notas |
|---|---|---|
| Agregar campo opcional a `AppConfig` | minor | El JS valida con `parseAppConfig` y descarta extras |
| Agregar método con default no-op a `NetworkProvider` | minor | Implementaciones existentes conforman gratis |
| Agregar código estándar a `NetworkErrorCode` | minor | `NetworkErrorCode` es `string & {}`, no rompe consumidores |
| Cambiar firma de `NetworkProvider.request` | **major** | Requiere migración del host |
| Cambiar shape de `NetworkResponse` o `NetworkError` | **major** | Requiere migración del host |
| Eliminar campo o tipo público | **major** | |

## Sincronización iOS ↔ Android

Los repos `rn-network-contracts-ios` y `rn-network-contracts-android` van **siempre al mismo `MAJOR.MINOR`**. Patches pueden divergir si son fixes específicos de plataforma.

**Regla**: cualquier PR que toque el contrato (firmas, registry fields, error codes) abre PRs simultáneos en ambos repos. El revisor verifica equivalencia antes de aprobar cualquiera de los dos.

### Mecanismos para evitar drift

1. **Doc de paridad** (link compartido en ambos READMEs) con tabla de firmas — fuente de verdad escrita antes de tocar código.
2. **CHANGELOG.md espejo** en ambos repos.
3. **CODEOWNERS** con el equipo de network/platform en ambos, no solo el equipo de cada plataforma.
4. **PR template** con checkbox "este cambio toca el contrato — link al PR equivalente en el otro repo".

## Sincronización contrato ↔ módulo Expo

El contrato y el módulo Expo van a la **misma versión**, pero el mecanismo difiere por plataforma:

**iOS** — el módulo **bundlea** el xcframework del contrato (no es una dependencia de podspec). La versión bundleada debe coincidir con la que usa la app nativa por SPM:

```ruby
# rn-network/ios/RnNetwork.podspec — vendoriza el binario
s.vendored_frameworks = 'iOSNetworkContract.xcframework'
```

Si la app nativa usa `iOSNetworkContract 1.1.0` por SPM y el módulo bundlea `1.0.0`, las firmas difieren → `Symbol not found` en runtime. Por eso se sincronizan (ver [decisión 12](04-decisiones-tecnicas.md)).

**Android** — dependencia Maven pineada a versión exacta:

```groovy
// rn-network/android/build.gradle
implementation 'cl.scotiabank.rnnetwork:contracts:1.1.0'
```

Cuando bumpeás el contrato, bumpeás el módulo Expo: en iOS re-bundleás el xcframework nuevo; en Android actualizás la línea de la dependencia.

## Versiones actuales (referencia)

| Componente | Versión | Repo | Distribución |
|---|---|---|---|
| `iOSNetworkContract` (iOS) | 1.1.0 | `rn-network-contracts-ios` | xcframework binario (git tag) |
| `cl.scotiabank.rnnetwork:contracts` (Android) | 1.1.0 | `rn-network-contracts-android` | AAR (Maven) |
| `@scotia/rn-network` | 1.1.x | `rn-network` | npm interno |

## Migración 1.0 → 1.1 (host del banco)

Breaking changes principales:

- `NetworkProvider.request` ahora recibe `requestId` como primer parámetro y retorna `NetworkResponse` en lugar de `Data`/`ByteArray`.
- `RNNetworkRegistry.appConfig` pasó de diccionario a `AppConfig` struct/data class. `activeDomain` ya no vive dentro — es un campo separado del registry.
- `CancellableNetworkProvider` se eliminó: ahora `cancel(requestId)` es opcional dentro del `NetworkProvider`.
- `NetworkError` typed agregado al contrato — opcional pero recomendado para errores de dominio.

Checklist del host:

```text
[ ] Implementar request(requestId:url:method:headers:body:) -> NetworkResponse
[ ] Retornar 204 como NetworkResponse(statusCode: 204, data: nil)
[ ] NO clasificar 4xx/5xx — el módulo lo hace por statusCode
[ ] Tirar NetworkError(...) para SESSION_EXPIRED y otros casos de dominio
[ ] Reemplazar RNNetworkRegistry.appConfig = [String: Any] por AppConfig struct
[ ] Setear RNNetworkRegistry.activeDomain = "BFF" (antes vivía dentro del dict)
[ ] Asignar RNNetworkRegistry.onSessionExpired = { … } para notificar al JS
[ ] Eliminar conformance a CancellableNetworkProvider; mover cancel al NetworkProvider
```
