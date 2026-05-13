# Config plugin

`@scotia/rn-network` incluye un config plugin de Expo que se ejecuta automáticamente durante `npx expo prebuild`. Solo afecta a **iOS**.

## Activación

En `app.json`:

```json
{
  "expo": {
    "plugins": [
      "@scotia/rn-network"
    ]
  }
}
```

No requiere opciones por ahora.

## Qué hace exactamente

### 1. Añade sources al `Podfile`

Inserta al inicio del archivo:

```ruby
source 'https://github.com/juanvegu/scotia-podspecs.git'
source 'https://cdn.cocoapods.org/'
```

El primer source permite resolver el pod `NetworkContracts`. El segundo es el source estándar de CocoaPods (necesario porque al declarar un source custom, CocoaPods deja de buscar en el CDN público por defecto).

### 2. Inyecta un `pre_install` hook

Añade antes del primer `target ... do`:

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

Esto fuerza que el pod `NetworkContracts` se compile como **dynamic framework** independientemente de la configuración global del Podfile (típicamente `use_frameworks! :linkage => :static`).

Razón: garantizar que `RNNetworkRegistry` exista como **una sola instancia** en runtime, compartida entre la app host y el módulo nativo de `rn-network`. Si quedara estático, habría dos copias del símbolo y la integración fallaría silenciosamente (ver [Decisiones técnicas §4](../01-arquitectura/04-decisiones-tecnicas.md)).

### 3. Idempotencia

El plugin verifica antes de inyectar:

```typescript
const sourcesAlreadyPresent =
    podfile.includes('scotia-podspecs') &&
    podfile.includes('cdn.cocoapods.org')

const hookAlreadyPresent = podfile.includes("pod.name == 'NetworkContracts'")
```

Esto permite correr `npx expo prebuild` múltiples veces sin duplicar las inyecciones.

## Cuándo se ejecuta

| Comando | Ejecuta el plugin |
|---|---|
| `npx expo prebuild` | Sí |
| `npx expo prebuild --clean` | Sí (regenera `ios/` y `android/` desde cero) |
| `npx expo run:ios` | Sí (corre prebuild si es necesario) |
| `expo start` (Metro dev server) | No |
| Build de Xcode después de prebuild | No (el Podfile ya está modificado) |

## Verificar que se ejecutó correctamente

Después de `npx expo prebuild`:

```bash
grep -n "scotia-podspecs\|NetworkContracts" ios/Podfile
```

Deberías ver las tres líneas relevantes (los dos `source` y el bloque `pre_install`).

## Si no usas Expo prebuild

Si tu app está en **bare workflow** sin Expo CLI gestionando los archivos nativos, el plugin no se ejecuta. En ese caso debes modificar manualmente el `ios/Podfile`:

1. Añadir los dos `source` al inicio.
2. Añadir el `pre_install` hook.
3. Añadir `pod 'NetworkContracts', '~> 1.0'` al target relevante (si no lo estás obteniendo via el pod de `rn-network`).

## Android: no hace nada

El plugin no toca `android/`. La integración Android se resuelve completamente a través del módulo Expo y la dependencia Maven que declara el host (ver [Android — consumir contracts](../03-integracion-app-nativa/01-android-consumir-contracts.md)).

## Siguiente paso

[AppConfigProvider y dominios →](04-app-config-provider.md)
