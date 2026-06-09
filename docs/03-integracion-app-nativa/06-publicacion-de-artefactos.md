# Publicación de artefactos

Para mantenedores de `rn-network-contracts-ios` y `rn-network-contracts-android`. Si solo sos consumidor, esta página es informativa.

## iOS · xcframework binario (pipeline Fastlane + Jenkins)

El contrato iOS se publica como **xcframework binario** (ver [decisión 11](../01-arquitectura/04-decisiones-tecnicas.md)). El pipeline lo genera, lo sube a Artifactory y crea el tag git.

### Flujo del release (Jenkins, trigger manual)

```
Jenkins "Build with Parameters" → elige BUMP (patch|minor|major)
   └─ bundle install                  (Fastlane)
   └─ fastlane test                   (swift build + swift test)
   └─ fastlane release bump:X
        ├─ next_version                (lee último git tag → bump)
        ├─ build-xcframework.sh        (genera el xcframework + checksum)
        ├─ upload a Artifactory        (placeholder DevOps)
        ├─ write DISTRIBUTION.md       (URL + checksum para consumidores)
        └─ git commit + tag + push
```

### Lanes de Fastlane

| Lane | Qué hace |
|---|---|
| `fastlane test` | `swift build` + `swift test` |
| `fastlane build_xcframework` | Genera el binario local, sin publicar |
| `fastlane release bump:minor` | Build + upload + tag |

### El build script (no usar `create_xcframework`)

`scripts/build-xcframework.sh` arma el xcframework desde el `Package.swift` (source mode). Maneja tres gotchas de SwiftPM → xcframework:

1. El `.framework` queda en `usr/local/lib` (no en `Library/Frameworks`) → lo busca con `find`.
2. El `Modules/swiftmodule` NO se copia al framework → lo inyecta manualmente (sin esto, no se puede `import`).
3. Mismo `derivedDataPath` pisa el swiftmodule del device → paths separados por plataforma.

> El plugin `fastlane-plugin-create_xcframework` se probó y **falla** con Swift Packages puros (bitcode deprecado, xcpretty con bug, framework sin `Modules/`). Por eso usamos el script.

### Versionado por git tag

No hay podspec que bumpear (el contrato se distribuye binario). La versión es el **git tag**. El release lee el último tag y bumpea.

### Lo que el consumidor recibe

Cada release genera `DISTRIBUTION.md` con el snippet exacto:

```swift
.binaryTarget(
    name: "iOSNetworkContract",
    url: "https://artifactory.scotiabank.cl/ios/iOSNetworkContract/1.1.0/iOSNetworkContract.xcframework.zip",
    checksum: "<sha256>"
)
```

### TODO DevOps (placeholders en el pipeline)

| Dónde | Qué |
|---|---|
| `Jenkinsfile` → `agent { label 'ios' }` | Label del agente macOS con Xcode |
| `Jenkinsfile` → `IOSNETWORKCONTRACT_ARTIFACT_BASE_URL` | URL base del storage |
| `Jenkinsfile` → `credentialsId` | Credenciales de Artifactory |
| `Fastfile` → `upload_artifact` | Comando real de upload (`curl -T` / `jfrog rt upload`) |

## Android · Maven publish al Nexus de Scotia

El contrato Android se publica como **AAR** (no xcframework — Android no tiene el problema SPM/CocoaPods; Gradle dedupea por coordenada Maven).

```bash
# desde rn-network-contracts-android
./gradlew publish \
  -PscotiaNexusUser=$SCOTIA_NEXUS_USER \
  -PscotiaNexusPass=$SCOTIA_NEXUS_PASS
```

Sube el AAR a `cl.scotiabank.rnnetwork:contracts:<version>`. Después:

```bash
git tag 1.1.0
git push origin 1.1.0
```

## Versionado coordinado

| Eje | Regla |
|---|---|
| iOS ↔ Android | Misma `MAJOR.MINOR`. Cambio del contrato → PRs espejo en ambos repos |
| Contrato ↔ módulo Expo | **Misma versión del xcframework** en la app nativa y en el módulo. Si divergen → `Symbol not found` en runtime (ver [decisión 12](../01-arquitectura/04-decisiones-tecnicas.md)) |

CHANGELOG espejo en ambos repos de contrato. CODEOWNERS con el mismo team de network/platform.

## Validación post-publish

### iOS

```bash
# Verificar que el zip se resuelve y el checksum coincide:
swift package compute-checksum iOSNetworkContract.xcframework.zip
# Comparar con el checksum del DISTRIBUTION.md publicado.
```

### Android

```bash
echo 'implementation("cl.scotiabank.rnnetwork:contracts:1.1.0")' >> app/build.gradle.kts
./gradlew :app:dependencies | grep contracts
```
