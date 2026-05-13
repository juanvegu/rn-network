# Decisiones técnicas

Las razones detrás de cada decisión de diseño no obvia.

## 1. Por qué un puente nativo y no `fetch`

### Motivación

Las apps del banco requieren:

- **SSL pinning**: validar que el certificado TLS del servidor coincida con un hash conocido (SPKI). Imposible con la API `fetch` estándar de RN.
- **Reutilizar el stack de red del host**: cookies, sesión, headers comunes, telemetría, certificados ya configurados a nivel de OkHttp/URLSession.
- **Visibilidad para auditorías**: las apps nativas tienen procesos de revisión de seguridad sobre su stack de red. Bypasearlo desde JS sería un retroceso.

### Implicación

Toda la lógica HTTP (incluido timeout, retry, pinning, manejo de errores de red) vive en el código nativo del host. La capa JS solo formatea la request y deserializa la respuesta.

## 2. Por qué `rn-network-contracts` es un repo aparte

`contracts` se mantiene separado de `rn-network` por tres motivos:

| Motivo | Detalle |
|---|---|
| Sin dependencias de RN/Expo | Una app nativa pura (Android/iOS) puede consumir solo `contracts` sin arrastrar Hermes, Metro, ni Expo. |
| Versionado independiente | El host y el módulo RN pueden estar en ciclos de release distintos. Mientras el contrato núcleo no cambie, distintas versiones coexisten. |
| Estabilidad como API | El contrato es Kotlin/Swift puro; cambia raramente. El módulo RN evoluciona más rápido (nuevos métodos JS, mejor mapping de errores, etc.). |

## 3. Por qué el contrato núcleo nunca cambia

El comentario en el código lo dice explícito:

```kotlin
/**
 * Core contract — must never change between versions.
 * New capabilities are added as optional interfaces
 * that extend this core.
 */
interface NetworkProvider {
    suspend fun request(...): ByteArray
}
```

Razón: distintos países / equipos / apps pueden ir actualizando la versión del contracts en momentos distintos. Si el contrato núcleo cambiara, una app vieja dejaría de poder satisfacer a un módulo RN nuevo (o viceversa).

Para extender funcionalidad sin romper:

```kotlin
interface CancellableNetworkProvider : NetworkProvider {
    fun cancel(requestId: String)
}
```

El módulo RN detecta en runtime si el provider implementa la interfaz extra y degrada elegantemente si no.

## 4. Por qué `NetworkContracts` debe ser dynamic framework en iOS

### Problema

La app RN típicamente usa `use_frameworks! :linkage => :static` para reducir size. Pero si `NetworkContracts` se compila como **static framework** y la app host lo carga también, terminan habiendo **dos copias** del símbolo `RNNetworkRegistry` en runtime — uno por cada binario. Cuando la app host escribe en uno, el módulo RN lee del otro, y la integración falla silenciosamente (`provider == nil`).

### Solución

El config plugin `withNetworkContracts` inyecta en el Podfile:

```ruby
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name == 'NetworkContracts'
      def pod.build_type
        Pod::BuildType.dynamic_framework
      end
    end
  end
end
```

Esto fuerza que `NetworkContracts` se compile como **dynamic framework**, garantizando una única instancia compartida en runtime.

El podspec correspondiente ya está configurado coherentemente:

```ruby
s.static_framework = false
s.pod_target_xcconfig = {
  'MACH_O_TYPE' => 'mh_dylib',
  ...
}
```

## 5. Por qué Android no necesita el equivalente al `pre_install` hook

En Android la JVM tiene un único `ClassLoader` por proceso (excepto cuando se usan plugins isolados, que no es nuestro caso). Una clase con el mismo nombre cargada una sola vez ⇒ `RNNetworkRegistry` es realmente único.

El módulo Android expone una función `debugIdentity` que confirma esto:

```kotlin
Function("debugIdentity") {
    "registryId=${System.identityHashCode(RNNetworkRegistry)} " +
        "classloader=${RNNetworkRegistry::class.java.classLoader}"
}
```

Llamar `debugIdentity` desde JS y compararlo con un `Log.d` desde el host: si coinciden, el singleton es compartido.

## 6. Por qué el provider devuelve `ByteArray` / `Data` y no un objeto

El contrato núcleo:

```kotlin
suspend fun request(...): ByteArray
```

```swift
func request(...) async throws -> Data
```

Razones:

- **Independencia de formato**: el provider no asume JSON. Cambiar a XML, MessagePack o binario solo requiere cambiar el código de parseo (que vive en el módulo RN, no en el provider).
- **Performance**: evita parseo redundante. El provider devuelve los bytes, el módulo RN parsea una sola vez.
- **Errores HTTP claros**: el provider puede inspeccionar los bytes antes de parsear para detectar payloads de error específicos.

## 7. Por qué la API JS solo retorna `Record<string, unknown>`

```typescript
request(...): Promise<Record<string, unknown>>
```

Limitación deliberada: la API actual asume que todas las respuestas son **JSON objects**. No soporta arrays raíz (`[...]`), texto plano, ni binario.

Razón histórica: el caso de uso dominante (APIs internas del banco) siempre responde con objetos. Si esto cambia, la API se puede extender con una variante `requestRaw()` o tipar el retorno como `unknown`.

## 8. Por qué `__DEV__` es parte del flujo

El código verifica explícitamente `__DEV__` antes de delegar al mock:

```typescript
const mock = registry.jsProvider
if (__DEV__ && mock) {
  return mock.request(...)
}
```

Razón: previene que un `MockNetworkProvider` registrado accidentalmente en código de producción (por un error de bundling, por ejemplo) responda con datos hardcodeados en lugar de fallar visiblemente con `PROVIDER_NOT_SET`. En release builds, `__DEV__` es `false` y el mock se ignora.
