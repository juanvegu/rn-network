# Glosario

Términos que se repiten a lo largo de la documentación.

## Provider (`NetworkProvider`)

Interfaz definida en `rn-network-contracts` que la app nativa host **implementa**. Tiene un único método `request(url, method, headers, body)` que devuelve los bytes crudos de la respuesta HTTP.

Quién la implementa: la app nativa (Android o iOS), típicamente usando OkHttp (Android) o URLSession (iOS) con SSL pinning configurado.

## Registry (`RNNetworkRegistry`)

Singleton definido en `rn-network-contracts` que mantiene:

- `provider: NetworkProvider?` — la implementación viva.
- `appConfig: [String: Any]?` — diccionario con `country`, `domains`, `activeDomain`, etc.

Quién escribe en él: la app nativa host, en `Application.onCreate()` (Android) o el `AppDelegate` / `@main` struct (iOS), **antes** de inicializar React Native.

Quién lee de él: el módulo nativo de `@scotia/rn-network`.

## Contracts

Atajo para referirse a `rn-network-contracts`. La librería que contiene la **interfaz** (`NetworkProvider`) y el **singleton** (`RNNetworkRegistry`). No tiene lógica, solo declara el contrato.

## Bridge (`RNNetworkBridge`)

Capa JS dentro de `@scotia/rn-network` (`src/RNNetworkBridge.ts`) que envuelve la llamada a `requireNativeModule('RNNetworkModule')`. Expone `isAvailable()`, `getNativeAppConfig()`, `request()`, etc. Es el punto donde JS habla con el módulo nativo de Expo.

## SSL pinning / certificate pinning

Práctica de seguridad: la app valida que el certificado TLS del servidor coincida con un valor esperado (hash de la SPKI) y rechaza la conexión si no. Imposible con `fetch` desde JS — por eso las requests se delegan al stack nativo.

Formato del pin: `sha256/<base64-de-la-SPKI>`.

## Dominio activo (`activeDomain`)

Clave dentro de `appConfig.domains` que indica qué `baseURL` se usa para resolver rutas relativas. Permite cambiar de entorno (prod, staging, QA) en runtime sin reiniciar la app.

Ejemplo de `appConfig`:
```kotlin
mapOf(
  "country" to "CL",
  "domains" to listOf(
    mapOf("key" to "prod",    "baseURL" to "https://api.bank.cl"),
    mapOf("key" to "staging", "baseURL" to "https://staging.bank.cl"),
  ),
  "activeDomain" to "prod"
)
```

Cambiar el dominio activo desde JS: `useAppConfig().setActiveDomain('staging')`.

## `isAvailable()`

Función exportada por `@scotia/rn-network`. Retorna `true` solo si:
1. El módulo nativo `RNNetworkModule` está linkeado (la app fue prebuildeada/compilada con `rn-network`).
2. La capa nativa reporta que `RNNetworkRegistry.provider != null` (la app host ya registró su provider).

Sirve para que el código JS decida si delegar al nativo o usar un mock.

## Brownfield

Contexto donde una app nativa preexistente embebe un runtime de React Native (a diferencia de "greenfield", donde la app es 100% RN desde cero). El puente `rn-network` + `contracts` está diseñado para escenarios brownfield, donde la app nativa ya tiene su stack de red establecido y la app RN consume ese stack.

No es estrictamente necesario que el host sea brownfield — una app RN pura también puede tener un provider en JS via `setProvider()` (ver [Modo desarrollo](../02-integracion-app-rn/05-modo-desarrollo.md)).

## Config plugin (Expo)

Mecanismo de Expo para modificar el proyecto nativo durante `npx expo prebuild`. `@scotia/rn-network` incluye `withNetworkContracts` que añade el source `scotia-podspecs` al `Podfile` y fuerza que el pod `NetworkContracts` sea dynamic framework.

## JitPack

Servicio que construye y publica artefactos Maven a partir de tags de GitHub. `rn-network-contracts` se publica para Android a través de JitPack con coordenadas `com.github.juanvegu:rn-network-contracts:<tag>`. No requiere un servidor Maven propio.

## `scotia-podspecs`

Repositorio CocoaPods privado (en GitHub: `https://github.com/juanvegu/scotia-podspecs.git`) donde se publica el podspec de `NetworkContracts` para iOS. La app RN lo añade como source en su `Podfile` via el config plugin.

## `PROVIDER_NOT_SET`

Código de error que aparece cuando se intenta hacer una request y:
- En modo nativo: `RNNetworkRegistry.provider == nil` (la app host no registró su provider antes de inicializar RN).
- En modo dev: tampoco hay `MockNetworkProvider` registrado vía `setProvider()`.

Es el error más común al integrar la librería por primera vez y casi siempre se debe a un problema de **orden de inicialización**.
