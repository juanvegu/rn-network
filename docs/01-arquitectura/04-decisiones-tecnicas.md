# Decisiones técnicas

Por qué cada decisión no obvia. Lectura útil para tech leads que validan el diseño antes de migrarlo a Scotia.

## 1. El módulo Expo NO hace HTTP; delega al host nativo

**Decisión:** `request()` siempre termina en `provider.request()` del host (URLSession / OkHttp).

**Por qué:**

- El stack del banco ya tiene pinning, certificados, retry policies, telemetría, cookies de sesión. Reimplementarlo en JS sería absurdo y abriría una segunda superficie de auditoría.
- El nativo conoce el contexto de sesión (token, refresh, device binding). Mantener todo eso en un solo lugar evita drift entre lo que ve el nativo y lo que ve la RN.
- Apps web del banco no son comparables — corren en navegador con su propia política CSP/CORS.

**Costo:** la RN no puede correr sin un host (excepto vía mock JS para dev).

## 2. `NetworkResponse` envelope como retorno

**Decisión:** `request(...)` retorna `NetworkResponse(statusCode, headers, data?)`, no `Data` raw.

**Por qué:**

- Permite que el módulo enforce "2xx = éxito, otro = error" **centralmente**. El host ya no puede olvidar tirar.
- Expone metadata (`Retry-After`, `X-Trace-Id`) al JS sin necesitar otra ronda.
- Modela 204/cuerpos vacíos limpio (`data: nil`), sin colapsar a `UNKNOWN`.

**Alternativa descartada:** `Result<Data, NetworkError>` (sealed/enum). Romper `throws` rompe la propagación natural de `CancellationError` y obliga al host a envolver manualmente.

## 3. `throws` en lugar de Result

**Decisión:** `request(...)` sigue siendo `async throws`.

**Por qué:**

- Swift/Kotlin idiomatic. Las cancelaciones de Task/coroutine fluyen como excepciones automáticamente.
- `URLError`/`IOException` se propagan tal cual; el mapper las traduce sin que el host tenga que catchearlas.
- `NetworkError` tipado del host es un error como cualquier otro — pasa por el mismo canal.

## 4. `NetworkError` tipado vs error genérico

**Decisión:** `NetworkError(code, retryable, httpStatus?, message?, info?)` como excepción que el host tira.

**Por qué:**

- El host sabe la semántica de sus errores (qué 401 es sesión vs cuál es credenciales). El mapper genérico nunca podría discriminarlo.
- `info` permite anexar payloads estructurados (`{ retryAfter: 30 }` para rate-limit) sin contaminar `message`.
- El JS recibe `code` tipado y ramifica con `switch` exhaustivo + escape hatch (`(string & {})`) para códigos host-específicos.

## 5. `RNNetworkRegistry` singleton compartido

**Decisión:** singleton global en `rn-network-contracts`, asignado por el host antes de iniciar RN.

**Por qué:**

- El host tiene que registrar **antes** de que cualquier código RN se ejecute. Un singleton es la única forma de garantizar visibilidad sin pasar el provider por parámetros.
- Compartido entre el binary del host y del módulo Expo porque ambos importan el mismo símbolo de `NetworkContracts`. Si el contrato estuviera en dos binarios distintos, habría dos registries y nada funcionaría.

**Riesgo:** "framework duplicado" en iOS si CocoaPods compila `NetworkContracts` como static — por eso el podspec fuerza `static_framework = false`.

## 6. `activeDomain` separado del `AppConfig`

**Decisión:** `appConfig` describe los dominios disponibles; `activeDomain` está en el registry, mutable.

**Por qué:**

- Inmutabilidad: cambiar de dominio no debería reconstruir el config completo.
- Modela bien que "qué dominios existen" es declarativo y rara vez cambia, mientras "cuál estoy usando" es estado runtime.
- Permite que el JS cambie el active sin que el nativo regenere su config.

## 7. Fallback al mock JS basado en presencia del provider

**Decisión:** si `RNNetworkRegistry.provider == nil`, el módulo cae al `MockNetworkProvider` JS registrado por la app. Sin `__DEV__`, sin flag de modo.

**Por qué:**

- La app nativa del banco puede arrancar en modo stubbed/mock (entorno de desarrollo, QA). Si la RN tuviera un gate `__DEV__` propio, no respetaría la decisión del host.
- Regla binaria fácil de razonar: "hay provider → uso provider; no hay → uso mock JS si la app lo registró; sino, error `PROVIDER_NOT_SET`".
- Los mocks viajan siempre en el bundle (no se excluyen) porque la app nativa puede arrancar en mock también en producción.

## 8. Cancel unificado en el contrato (sin `CancellableNetworkProvider`)

**Decisión:** un solo `NetworkProvider` con `cancel(requestId)` opcional (default no-op).

**Por qué:**

- Evita la detección runtime de capability (`provider as? CancellableNetworkProvider`).
- Implementaciones existentes conforman automáticamente (Swift `extension`, Kotlin `default method`).
- Si el host no soporta cancel, el default no rompe nada y el JS sigue funcionando.

## 9. Timeout cliente en JS

**Decisión:** `Promise.race(bridgeCall, setTimeout)` en el JS, con `cancelRequest(requestId)` best-effort al vencer.

**Por qué:**

- Defensa contra el caso real: el nativo no responde tras inactividad larga (app vuelve de background, sesión muerta, conexión congelada).
- No depende de que el host implemente timeout — siempre hay un upper bound desde el JS.
- Configurable per-call (`options.timeoutMs`) o global (`setRequestTimeout(ms)`).

## 10. `getNativeActiveDomain` como función nativa propia (no dentro de `getNativeAppConfig`)

**Decisión:** dos funciones nativas separadas: `getNativeAppConfig()` retorna solo el config; `getNativeActiveDomain()` retorna el string.

**Por qué:**

- Coherente con la separación en el registry.
- Permite al JS leer cada uno cuando lo necesite, sin forzar un objeto compuesto.
- El `parseAppConfig` no tiene que validar un campo opcional `activeDomain` que en realidad pertenece a otro lugar.
