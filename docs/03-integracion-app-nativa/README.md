# 03 · Integración en una app nativa

Guía para equipos que tienen una app nativa Android/iOS que va a **hospedar** un runtime de React Native y necesita exponer su stack de red al módulo `@scotia/rn-network` vía `rn-network-contracts`.

| Archivo | Contenido |
|---|---|
| [01 · Android · Consumir contracts](01-android-consumir-contracts.md) | Agregar la dep Maven |
| [02 · Android · Registrar provider](02-android-registrar-provider.md) | Implementar `NetworkProvider` con OkHttp + registrar |
| [03 · iOS · Consumir contracts](03-ios-consumir-contracts.md) | Agregar SPM o CocoaPods |
| [04 · iOS · Registrar provider](04-ios-registrar-provider.md) | Implementar `NetworkProvider` con URLSession + registrar |
| [05 · Orden de inicialización](05-orden-de-inicializacion.md) | Regla crítica: registrar antes de iniciar RN |
| [06 · Publicación de artefactos](06-publicacion-de-artefactos.md) | Para mantenedores de `rn-network-contracts` |
