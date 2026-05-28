# Publicación de artefactos

Para mantenedores de `rn-network-contracts-ios` y `rn-network-contracts-android`. Si solo sos consumidor, esta página es informativa.

## iOS · Tag git (SPM y CocoaPods)

Ambos managers leen del mismo tag git. Una sola operación cubre los dos.

```bash
# desde rn-network-contracts-ios
git tag 1.1.0
git push origin 1.1.0
```

- **SPM** resuelve por tag directamente (consumidor escribe `from: "1.1.0"`).
- **CocoaPods** lee el `.podspec` cuyo `s.source` apunta a `:tag => s.version.to_s`. Si Scotia tiene un Specs repo privado, también hay que pushear el `.podspec` ahí:

```bash
pod repo push scotia-specs NetworkContracts.podspec --allow-warnings
```

> **Regla:** una vez creado un tag, **no se modifica**. Si necesitás corregir algo, bumpeá patch (`1.1.1`).

## Android · Maven publish al Nexus de Scotia

El `build.gradle` tiene `maven-publish` configurado apuntando al Nexus interno:

```bash
# desde rn-network-contracts-android
./gradlew publish \
  -PscotiaNexusUser=$SCOTIA_NEXUS_USER \
  -PscotiaNexusPass=$SCOTIA_NEXUS_PASS
```

Esto sube el AAR a `cl.scotiabank.rnnetwork:contracts:<version>`. Después también:

```bash
git tag 1.1.0
git push origin 1.1.0
```

para que el repo y el artefacto Maven queden alineados.

## Versionado coordinado iOS ↔ Android

Misma `MAJOR.MINOR` en ambos repos siempre. Workflow:

1. Cambio en el contrato → PR en `rn-network-contracts-ios` con el código + tag `1.2.0`.
2. PR espejo en `rn-network-contracts-android` con el código equivalente + tag `1.2.0`.
3. PR en `rn-network` que bumpea las deps a `1.2.0` en `podspec` y `build.gradle`.

CHANGELOG espejo en ambos repos. CODEOWNERS con el mismo team de network/platform.

## Validación post-publish

### iOS

```bash
# Desde un proyecto Xcode de prueba:
cat > Package.swift <<EOF
.package(url: "https://github.scotiabank.com/<org>/rn-network-contracts-ios.git", from: "1.1.0")
EOF
swift package resolve
```

### Android

```bash
# Desde un proyecto Gradle de prueba:
echo 'implementation("cl.scotiabank.rnnetwork:contracts:1.1.0")' >> app/build.gradle.kts
./gradlew :app:dependencies | grep contracts
```

Si los resolvers fallan, revisar credenciales y URL del registro.
