# Versionado y compatibilidad

## Versiones actuales (referencia)

| Componente | Versión | Coordenadas |
|---|---|---|
| `@scotia/rn-network` | `0.1.33` | npm / `github:juanvegu/scotia-rn-network` |
| `rn-network-contracts` (Android) | `1.0.8` | `com.github.juanvegu:rn-network-contracts:1.0.8` |
| `rn-network-contracts` (iOS) | `1.0.3` (podspec) | Pod `NetworkContracts` vía `scotia-podspecs` |

## Regla de oro

**Ambos lados que consumen `contracts` deben usar la misma versión.**

- En Android: la app host y el módulo Android de `rn-network` deben declarar el mismo tag de `com.github.juanvegu:rn-network-contracts`.
- En iOS: la app host y la app RN (vía Podfile generado por prebuild) deben resolver al mismo `NetworkContracts.podspec`.

Si las versiones divergen:

- Android: Gradle resuelve la versión más nueva (regla de Maven), pero si las clases cambiaron entre versiones puede haber `NoSuchMethodError`/`NoClassDefFoundError`.
- iOS: CocoaPods falla en `pod install` con un conflicto explícito.

## Compatibilidad entre componentes

El contrato núcleo (`NetworkProvider.request(url, method, headers, body) -> bytes`) **no cambia entre versiones de `contracts`**. Esto se respeta como invariante de diseño (ver [Decisiones técnicas §3](04-decisiones-tecnicas.md)).

Implicación: una versión `1.x` de `contracts` siempre es ABI-compatible con cualquier otra `1.y` para el método núcleo. Nuevas capacidades se añaden como interfaces extra (`CancellableNetworkProvider`, etc.).

| Cambio en contracts | Impacto |
|---|---|
| Bump de patch en una interfaz opcional | Sin impacto — el módulo RN detecta en runtime con `is CancellableNetworkProvider`. |
| Bump añadiendo una nueva interfaz opcional | Sin impacto en hosts existentes; opcional implementarla. |
| Cambiar la firma de `NetworkProvider.request` | **No permitido** — sería un major breaking change que rompe todos los hosts. |
| Cambiar el shape de `appConfig` | No es un cambio de API estrictamente (es un mapa libre), pero se debe coordinar con el módulo RN. |

## Compatibilidad entre `rn-network` y `contracts`

| `rn-network` | `contracts` mín | Notas |
|---|---|---|
| `0.1.x` | Android `1.0.8`, iOS `1.0.3` | Versiones validadas en producción. |
| Versiones futuras | Por confirmar | Si se introduce un método nuevo en el módulo nativo que requiera una capacidad de contracts (ej. cancellation), declarar el mínimo aquí. |

## Tipo de cambios y consecuencias

| Tipo de cambio | En qué se traduce |
|---|---|
| Nuevo método en la **API JS** | Solo bump de `@scotia/rn-network`. No requiere update de host. |
| Nuevo método en el **módulo nativo** | Bump de `@scotia/rn-network`. No requiere update de host **si** no depende de capacidades nuevas de contracts. |
| Nueva interfaz opcional en **contracts** | Bump de `contracts`. Bump del módulo nativo de `rn-network` si lo va a explotar. Hosts viejos siguen funcionando con degradación elegante. |
| Cambio en el shape de `appConfig` esperado por el módulo nativo | Coordinar bump simultáneo de `rn-network` y de los hosts que producen el config. |

## Cómo verificar la consistencia en una integración

### Android

```bash
./gradlew :app:dependencyInsight --dependency rn-network-contracts
```

Debe mostrar **una única versión** resuelta. Si aparecen dos, hay un conflicto.

### iOS

```bash
cd ios && pod outdated
```

Verifica que `NetworkContracts` esté en la versión esperada. Después de un `pod install`, también revisar `Podfile.lock`:

```
NetworkContracts (1.0.3)
```

### Runtime (Android)

Desde JS, en debug build:

```typescript
import { RNNetworkBridge } from '@scotia/rn-network'
// debugIdentity solo existe en el módulo Android
console.log((RNNetworkBridge as any).debugIdentity?.())
```

Y comparar con un `Log.d` desde el host:

```kotlin
Log.d("Net", "host id=${System.identityHashCode(RNNetworkRegistry)} cl=${RNNetworkRegistry::class.java.classLoader}")
```

Mismo `registryId` y mismo `classloader` ⇒ singleton compartido. Distintos ⇒ contracts duplicado, integración rota.

### Runtime (iOS)

No hay `debugIdentity` en iOS por ahora. La validación se hace indirectamente: si `RNNetworkRegistry.provider != nil` desde el host pero `hasNativeProvider()` devuelve `false` desde JS, el framework está duplicado (típicamente porque `NetworkContracts` quedó estático).
