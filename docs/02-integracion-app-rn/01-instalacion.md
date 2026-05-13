# Instalación

## 1. Añadir la dependencia

`@scotia/rn-network` se distribuye desde GitHub directo (no está publicado en el npm registry público).

```bash
npm install github:juanvegu/scotia-rn-network
```

O si prefieres pinear un tag específico:

```bash
npm install github:juanvegu/scotia-rn-network#v0.1.33
```

Resultado en `package.json`:

```json
{
  "dependencies": {
    "@scotia/rn-network": "github:juanvegu/scotia-rn-network"
  }
}
```

## 2. peerDependencies

El paquete declara como `peerDependencies`:

```json
"peerDependencies": {
  "expo": "*",
  "react": "*",
  "react-native": "*"
}
```

Estos paquetes deben estar instalados en tu app (lo están por defecto en cualquier proyecto Expo).

## 3. Registrar el config plugin en `app.json`

Añade `"@scotia/rn-network"` al array `plugins`:

```json
{
  "expo": {
    "plugins": [
      "@scotia/rn-network"
    ]
  }
}
```

El plugin se ejecuta solo en `npx expo prebuild`. Modifica el `Podfile` iOS (no afecta Android). Ver [Config plugin](03-config-plugin.md) para detalles.

## 4. Prebuild

```bash
npx expo prebuild --clean
```

Esto regenera `ios/` y `android/`. Verifica que el `Podfile` ahora contenga:

```ruby
source 'https://github.com/juanvegu/scotia-podspecs.git'
source 'https://cdn.cocoapods.org/'

# ... resto del Podfile ...

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

## 5. Instalar pods (iOS) y validar Gradle (Android)

```bash
cd ios && pod install && cd ..
```

Deberías ver en la salida:

```
Installing NetworkContracts (1.0.3)
```

En Android no hace falta paso extra para `rn-network` mismo. Si tu app **es la host** (registra el provider), necesitarás añadir `contracts` como dependencia Maven; ver [03 — Integración en una app nativa](../03-integracion-app-nativa/README.md).

## 6. Smoke test

Crea un archivo cualquiera (`src/networkTest.ts`) y verifica que la API importa sin errores:

```typescript
import {
  request,
  isAvailable,
  setBaseURL,
  setProvider,
  MockNetworkProvider,
  AppConfigProvider,
  useAppConfig,
} from '@scotia/rn-network'
```

Si todo importa, la instalación está completa.

## Siguiente paso

[Uso básico →](02-uso-basico.md)
