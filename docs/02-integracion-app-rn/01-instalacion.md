# Instalación

## 1. Agregar la dependencia

Desde el registro npm interno de Scotia:

```bash
npm install @scotia/rn-network
```

> Mientras se trabaja localmente puede apuntarse a un path: `npm install ../rn-network`.

## 2. Peer deps

`@scotia/rn-network` declara como peer: `expo`, `react`, `react-native`. La app debe tenerlas ya instaladas. No agrega ninguna dep runtime propia.

## 3. Sin config plugin

> Versiones anteriores requerían un config plugin de Expo en `app.json`. **Ya no.** El contrato iOS (`iOSNetworkContract`) viaja como xcframework binario vendoreado en el podspec del módulo, con el `user_target_xcconfig` que resuelve el linking. No hay que agregar nada a `plugins`. Ver [03 · Distribución del contrato](03-config-plugin.md).

Solo correr el prebuild normal:

```bash
npx expo prebuild --clean
```

## 4. Verificación

```typescript
import { isAvailable, getBaseURL } from '@scotia/rn-network'

console.log('native provider available:', isAvailable())
console.log('base URL:', getBaseURL())
```

- En una build con host nativo correctamente integrado: `isAvailable() === true` y `getBaseURL()` devuelve el `baseURL` del dominio activo.
- En `expo start` sin host (dev): `isAvailable() === false`; ver [05 · Modo desarrollo](05-modo-desarrollo.md) para usar el `MockNetworkProvider`.
