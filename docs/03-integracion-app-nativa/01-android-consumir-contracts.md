# Android · Consumir `rn-network-contracts`

## Distribución

`rn-network-contracts` se publica como AAR en el **Maven interno de Scotia**. Coordenadas:

```
cl.scotiabank.rnnetwork:contracts:1.1.0
```

> En el repo legacy estaba como `com.github.juanvegu:rn-network-contracts:1.0.8` en JitPack. La migración a Scotia cambió las coordenadas y el registro.

## 1. Habilitar el repo Maven interno

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://nexus.scotiabank.cl/repository/maven-releases/")
            credentials {
                username = providers.gradleProperty("scotiaNexusUser").get()
                password = providers.gradleProperty("scotiaNexusPass").get()
            }
        }
    }
}
```

Las credenciales viven en `~/.gradle/gradle.properties` (devs) o en variables de entorno (CI).

## 2. Declarar la dependencia en el host y el expo-module

Ambos lados deben referenciar la **misma versión**:

```kotlin
// scotia-android-native/app/build.gradle.kts
dependencies {
    implementation("cl.scotiabank.rnnetwork:contracts:1.1.0")
    // OkHttp y kotlinx-coroutines también, si el provider los usa.
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
```

```groovy
// rn-network/android/build.gradle (interno al expo-module, ya está)
dependencies {
    implementation 'cl.scotiabank.rnnetwork:contracts:1.1.0'
}
```

Pinear a versión exacta (no rango). Una sola versión en el APK garantiza un solo `RNNetworkRegistry`.

## 3. Verificar identidad del singleton

En la JVM hay un único `ClassLoader` por proceso, así que el singleton es siempre compartido si el classpath está limpio. Para verificarlo en runtime:

```kotlin
Log.d("Net", "host=${System.identityHashCode(RNNetworkRegistry)} cl=${RNNetworkRegistry::class.java.classLoader}")
```

Y en el módulo Expo está expuesto `RnNetworkModule.debugIdentity()`. Los dos valores deben coincidir.

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `Could not resolve cl.scotiabank.rnnetwork:contracts:1.1.0` | Repo Maven no agregado / credenciales mal | Verificar `settings.gradle.kts` y `gradle.properties` |
| `Type ... RNNetworkRegistry is defined multiple times` | Contract entró por dos rutas | Unificar a una sola fuente del Maven |
| `provider == null` aunque registraste | Orden: registraste después del init de RN | Ver [orden de inicialización](05-orden-de-inicializacion.md) |
