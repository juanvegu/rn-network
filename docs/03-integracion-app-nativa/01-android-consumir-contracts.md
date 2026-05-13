# Android — Consumir `rn-network-contracts`

Cómo añadir la dependencia Maven a una app nativa Android.

## 1. Habilitar el repo de JitPack

`contracts` se publica vía JitPack a partir de tags de GitHub. Añade JitPack como repositorio en `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }
}
```

Si tu proyecto usa el `settings.gradle` antiguo (Groovy):

```groovy
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}
```

## 2. Declarar la dependencia

En el `build.gradle.kts` del módulo `app`:

```kotlin
dependencies {
    implementation("com.github.juanvegu:rn-network-contracts:1.0.8")

    // Dependencias típicas para implementar el provider:
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
```

| Coordenada | Valor |
|---|---|
| Group | `com.github.juanvegu` |
| Artifact | `rn-network-contracts` |
| Version | `1.0.8` (versión actual; consultar [Versionado](../01-arquitectura/05-versionado-y-compatibilidad.md)) |

## 3. La misma versión en ambos lados

Si tu app va a embeber un AAR de la app RN (escenario brownfield), **el AAR también consume `rn-network-contracts`**. Ambos deben resolver a la **misma versión** para que el `RNNetworkRegistry` sea un singleton compartido.

Ejemplo conflicto típico:

| Componente | Versión declarada |
|---|---|
| `scotia-android-native/app/build.gradle.kts` | `1.0.8` |
| AAR de `rn-network` (interno) | `1.0.7` |

Gradle resolverá a `1.0.8` (la más nueva), pero si algo cambió entre `1.0.7` y `1.0.8` podrías ver `NoSuchMethodError` en runtime.

**Recomendación**: declarar la versión explícitamente en ambos sitios y bumpearla simultáneamente.

## 4. Verificar la resolución

```bash
./gradlew :app:dependencyInsight --dependency rn-network-contracts
```

Debe mostrar **una sola** entrada de `com.github.juanvegu:rn-network-contracts:<version>`. Si aparecen varias, hay conflicto.

## 5. Importar las clases

En tu código Kotlin:

```kotlin
import com.scotia.rnnetwork.contracts.NetworkProvider
import com.scotia.rnnetwork.contracts.RNNetworkRegistry
import com.scotia.rnnetwork.contracts.CancellableNetworkProvider  // opcional
```

Si IntelliJ/Android Studio no las encuentra, sincroniza Gradle y verifica que JitPack haya construido el tag:

```
https://jitpack.io/com/github/juanvegu/rn-network-contracts/<version>/
```

Si JitPack todavía no compiló el tag (puede tardar unos minutos la primera vez), navega a esa URL — JitPack lo construye on-demand.

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Could not resolve com.github.juanvegu:rn-network-contracts:X` | Falta el repo JitPack | Añadir `maven { url = uri("https://jitpack.io") }` |
| `Could not find ... rn-network-contracts:X` | El tag no existe / aún no se compiló | Verificar el tag en GitHub y forzar build navegando a `https://jitpack.io/com/github/juanvegu/rn-network-contracts/X/` |
| `Type com.scotia.rnnetwork.contracts.RNNetworkRegistry is defined multiple times` | Contracts entró por dos rutas (ej. composite build + Maven) | Unificar a una sola fuente |
| Versiones distintas entre host y AAR | Falta de pin explícito | Declarar la misma versión en ambos lados |

## Siguiente paso

[Android — registrar provider →](02-android-registrar-provider.md)
