# 02 — Integración en una app RN

Guía para equipos que tienen una app React Native (con Expo) y necesitan consumir `@scotia/rn-network`.

## Prerrequisitos

- App Expo (managed o bare workflow con prebuild). Si la app no usa Expo, contactar primero — la integración asume el ecosistema Expo modules.
- Versión de React Native compatible con Expo SDK 55+ (probado con RN 0.82–0.83, React 19).
- Acceso al repo `juanvegu/scotia-rn-network` y `juanvegu/scotia-podspecs` (para iOS).

## Páginas de esta sección

1. [Instalación](01-instalacion.md) — añadir el paquete al `package.json` y al `app.json`.
2. [Uso básico](02-uso-basico.md) — primera request, `isAvailable`, manejo de errores.
3. [Config plugin](03-config-plugin.md) — qué hace `withNetworkContracts` durante `prebuild`.
4. [AppConfigProvider y dominios](04-app-config-provider.md) — exponer `activeDomain` desde JS.
5. [Modo desarrollo](05-modo-desarrollo.md) — `MockNetworkProvider`, `setProvider`, fallback localhost.
6. [Ejemplo completo](06-ejemplo-completo.md) — walkthrough basado en `example/App.tsx`.

## Camino recomendado de lectura

Si nunca has integrado la librería: lee las páginas **en orden**, ejecutando el código de cada una en una app de prueba.

Si ya tienes integración funcionando y vienes a buscar algo específico: salta directo a la referencia en [04 — Referencia API](../04-referencia-api/README.md).
