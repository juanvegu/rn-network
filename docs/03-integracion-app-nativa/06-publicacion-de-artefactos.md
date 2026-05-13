# Publicación de artefactos

Referencia para mantenedores de `rn-network-contracts`. Si solo eres consumidor, esta página es informativa.

## Android — JitPack

`rn-network-contracts` para Android se publica automáticamente vía [JitPack](https://jitpack.io) a partir de tags de GitHub.

### Publicar una nueva versión

1. Bump del campo `version` en `android/build.gradle`:
   ```groovy
   group = 'com.github.juanvegu'
   version = '1.0.9'
   ```
2. Commit y push.
3. Crear tag en GitHub: `git tag 1.0.9 && git push origin 1.0.9`.
4. Navegar a `https://jitpack.io/com/github/juanvegu/rn-network-contracts/1.0.9/` — JitPack construye on-demand. Verás los logs de Gradle en vivo.
5. Si la build tiene éxito, el artefacto está disponible en:
   ```
   com.github.juanvegu:rn-network-contracts:1.0.9
   ```

### Validar después de publicar

En una app de prueba:

```kotlin
implementation("com.github.juanvegu:rn-network-contracts:1.0.9")
```

Y sincronizar Gradle. Si falla:

- Revisar los logs de JitPack en la URL de arriba.
- Verificar que el tag coincide con el `version` en `build.gradle` (JitPack compila el tag, no la rama).
- Verificar que `singleVariant('release')` está configurado en el `publishing` block.

### Comportamiento de JitPack

- **First request**: construye el artefacto y tarda 1–5 minutos. Las siguientes resoluciones son instantáneas (artefacto cacheado).
- **Tags sin compilar**: si nadie ha pedido el tag, JitPack no lo construye. La primera resolución dispara la build.
- **Fallos de build**: visibles en `https://jitpack.io/com/github/juanvegu/rn-network-contracts/<tag>/build.log`.

## iOS — `scotia-podspecs`

Para iOS no se usa JitPack. El podspec se publica en un repositorio CocoaPods privado en GitHub: [`juanvegu/scotia-podspecs`](https://github.com/juanvegu/scotia-podspecs).

### Estructura del podspecs repo

```
scotia-podspecs/
└── Specs/
    └── NetworkContracts/
        ├── 1.0.0/
        │   └── NetworkContracts.podspec
        ├── 1.0.1/
        │   └── NetworkContracts.podspec
        └── 1.0.3/
            └── NetworkContracts.podspec
```

### Publicar una nueva versión

1. Bump del `s.version` en `ios/NetworkContracts.podspec` del repo de contracts:
   ```ruby
   s.version = '1.0.4'
   ```
2. Verificar que `s.source` apunte a la rama / tag correcto:
   ```ruby
   s.source = { :git => 'https://github.com/juanvegu/rn-network-contracts.git', :tag => '1.0.4' }
   ```
3. Crear tag en GitHub: `git tag 1.0.4 && git push origin 1.0.4`.
4. Copiar el `.podspec` actualizado a `scotia-podspecs/Specs/NetworkContracts/1.0.4/NetworkContracts.podspec`.
5. Commit y push del podspecs repo.

### Validar después de publicar

```bash
pod repo update
pod search NetworkContracts
```

O en un Podfile de prueba con `source 'https://github.com/juanvegu/scotia-podspecs.git'`:

```ruby
pod 'NetworkContracts', '1.0.4'
```

Y `pod install`. Si falla:

- Revisar que el podspec en `scotia-podspecs` esté bien indexado (estructura `Specs/<Name>/<Version>/<Name>.podspec`).
- Validar el podspec con `pod spec lint NetworkContracts.podspec` antes de publicar.

## Coordinación Android ↔ iOS

Los tags de **`rn-network-contracts`** deben ir alineados entre las dos plataformas (mismo tag en GitHub). Aunque el podspec tiene su propio `s.version` y el `build.gradle` tiene su `version`, la convención es:

| Tag GitHub | `build.gradle` (Android) | `NetworkContracts.podspec` (iOS) |
|---|---|---|
| `1.0.8` | `1.0.8` | `1.0.8` |
| `1.0.9` | `1.0.9` | `1.0.9` |

(En el snapshot actual del repo el podspec apunta a `1.0.3` mientras Android está en `1.0.8` — es una desincronización que debería corregirse en el próximo release.)

## Cuándo crear un release

| Cambio | ¿Release? |
|---|---|
| Documentación, README, comentarios | No |
| Test unitario nuevo | No |
| Añadir interfaz opcional nueva (ej. `CancellableNetworkProvider`) | Sí — minor bump |
| Cambiar firma del `NetworkProvider.request` | **Nunca permitido** (ver [Decisiones técnicas §3](../01-arquitectura/04-decisiones-tecnicas.md)) |
| Bugfix en doc / ejemplos | Patch bump si afecta APIs públicas, nada si no |

## Quién consume cada cosa

| Consumidor | Tipo | Versión que importa |
|---|---|---|
| App nativa Android del banco | Maven (JitPack) | La que decida cada banco según su roadmap |
| App nativa iOS del banco | CocoaPods (scotia-podspecs) | Idem |
| `@scotia/rn-network` módulo Android | Maven (JitPack), declarado en `rn-network/android/build.gradle` | Pinneado por el equipo de la librería |
| `@scotia/rn-network` módulo iOS | CocoaPods (scotia-podspecs), declarado vía Podfile inyectado por el plugin | Idem |
