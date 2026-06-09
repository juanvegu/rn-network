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
- Compartido entre el binary del host y del módulo Expo porque ambos referencian el mismo símbolo de `iOSNetworkContract`. Si el contrato estuviera en dos binarios distintos, habría dos registries y nada funcionaría.

**Riesgo:** "framework/singleton duplicado" en iOS si la app nativa y el módulo Expo compilan cada uno su propia copia del contrato. Por eso se distribuye como **xcframework binario** que ambos referencian (ver decisión 11).

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

## 11. Distribución del contrato iOS como xcframework binario

**Decisión:** el contrato iOS (`iOSNetworkContract`) se distribuye como **xcframework binario**, consumido por SPM (`.binaryTarget`) en la app nativa y por CocoaPods (`vendored_frameworks`) en el módulo Expo.

**El contrato es dual-capable** — el `Package.swift` source también funciona. El binario NO es porque SPM falle, sino por una **limitación del ecosistema Expo/RN**:

- Expo Modules está atado a CocoaPods (ExpoModulesCore, autolinking, brownfield)
- No hay soporte SPM nativo en Expo todavía (RN 0.84+ roadmap; SDK 56 experimental; [issue expo#37813](https://github.com/expo/expo/issues/37813) abierto)
- `cocoapods-spm` está vetado por seguridad del banco

**Por qué binario y no source:**

- La app nativa quiere migrar a **SPM 100%**. El módulo Expo está forzado a **CocoaPods**.
- Para compartir **una sola instancia** de `RNNetworkRegistry` entre ambos, los dos tienen que apuntar al **mismo binario**. Source-en-ambos-lados = dos compilaciones = dos singletons = roto.
- El xcframework (dynamic) garantiza una copia única por install name → un singleton.

**Cuándo revertir a source:** cuando Expo/RN soporten SPM first-class y `ExpoModulesCore` se distribuya por SPM, los dos lados consumirían el mismo `Package.swift` source y el xcframework dejaría de ser necesario. Hasta entonces, binario.

**Por qué NO `fastlane-plugin-create_xcframework`:** se probó (Xcode 26.5) y falla con Swift Packages puros — fuerza bitcode deprecado, usa un xcpretty con bug, y produce un framework **sin `Modules/swiftinterface`** (no se puede importar). El script `build-xcframework.sh` maneja los tres gotchas de SwiftPM explícitamente. Ver `scripts/build-xcframework.sh`.

## 12. Versionado coordinado contrato ↔ módulo Expo

**Decisión:** el contrato y el módulo Expo se versionan de forma coordinada; ambos lados (app nativa + módulo) usan la **misma versión** del xcframework.

**Por qué:**

- El xcframework comparte el singleton por install name + versión. Si la app nativa usa `1.1.0` y el módulo `1.0.0`, las firmas difieren → `Symbol not found` en runtime.
- Es la misma disciplina que cualquier ABI compartido: un cambio del contrato se propaga a todos los consumidores en lockstep.
