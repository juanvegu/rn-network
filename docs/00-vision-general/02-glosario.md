# Glosario

Términos que se repiten a lo largo de la documentación.

| Término | Significado |
|---|---|
| **Host (nativo)** | La app nativa del banco (iOS/Android) que embebe React Native vía expo-brownfield. Es quien implementa y registra el `NetworkProvider`. |
| **Provider** | Clase Swift/Kotlin que implementa `NetworkProvider`. Hace la petición HTTP real usando el cliente del banco (URLSession / OkHttp con pinning). |
| **Registry** | `RNNetworkRegistry`, singleton del contrato. El host lo popula antes de iniciar RN: `provider`, `appConfig`, `activeDomain`, `onSessionExpired`. |
| **Bridge** | `RNNetworkBridge` en TS — la capa JS que llama al módulo nativo (`RnNetworkModule`). |
| **Contracts** | El repo binario `rn-network-contracts` que define las interfaces. Lo importan tanto el host como `@scotia/rn-network`. |
| **AppConfig** | Struct/data class inmutable con `country`, `environment`, `domains[]`. Describe los dominios disponibles para la app RN. |
| **DomainConfig** | Entrada `{ key, baseURL }` dentro de `AppConfig.domains`. |
| **activeDomain** | Campo mutable en `RNNetworkRegistry`. Apunta a una `key` de `appConfig.domains`. Permite cambiar de entorno sin reconstruir el config. |
| **NetworkResponse** | Envelope que retorna el provider en éxito: `statusCode`, `headers`, `data?`. |
| **NetworkError** | Excepción tipada que el provider tira para errores de dominio (`SESSION_EXPIRED`, `RATE_LIMITED`, etc.). Llega al JS con todos sus campos. |
| **NetworkErrorPayload** | La forma del error tal como lo recibe el JS: `{ code, retryable, httpStatus?, message?, info? }`. |
| **MockNetworkProvider** | Implementación JS de `NetworkProvider`. Se usa cuando no hay provider nativo registrado. |
| **requestId** | UUID generado por JS al hacer `request()`. Sirve para correlacionar con `cancel(requestId)`. |
| **expo-brownfield** | Modo de Expo en el que un módulo RN se embebe dentro de una app nativa existente. La RN no levanta la app — la nativa la invoca cuando hace falta. |
| **Bundle prod** | Build de producción del bundle JS de RN. Los mocks viajan siempre — el switch a mock depende solo de si el host registró o no un provider. |
