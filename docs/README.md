# Documentación — `rn-network` + `rn-network-contracts`

Documentación técnica de las dos librerías que componen el puente de networking compartido para apps móviles del banco:

- **`@scotia/rn-network`** — Expo module que expone una API de red en JS/TS para apps React Native y delega la ejecución a proveedores nativos.
- **`rn-network-contracts`** — Contratos nativos (Kotlin/Swift) que definen las interfaces (`NetworkProvider`, `RNNetworkRegistry`) que las apps host deben implementar.

> Las apps mencionadas como ejemplo en esta documentación (una app React Native consumidora y apps nativas host) se referencian de manera **genérica**. Cualquier app RN puede consumir `rn-network`, y cualquier app nativa (Android/iOS) puede satisfacer `rn-network-contracts`.

## Índice

### [00 — Visión general](00-vision-general/README.md)
Punto de partida: qué son estas librerías, cómo se conectan y cuál es el rol de cada una.

- [Diagrama de arquitectura](00-vision-general/01-diagrama-arquitectura.md)
- [Glosario](00-vision-general/02-glosario.md)
- [Roles de cada librería](00-vision-general/03-roles-de-cada-libreria.md)

### [01 — Arquitectura](01-arquitectura/README.md)
Detalle interno de las librerías, flujo de requests, modelo de dominios y decisiones técnicas.

- [Componentes](01-arquitectura/01-componentes.md)
- [Flujo de requests](01-arquitectura/02-flujo-de-requests.md)
- [Modelo de dominios](01-arquitectura/03-modelo-de-dominios.md)
- [Decisiones técnicas](01-arquitectura/04-decisiones-tecnicas.md)
- [Versionado y compatibilidad](01-arquitectura/05-versionado-y-compatibilidad.md)

### [02 — Integración en una app RN](02-integracion-app-rn/README.md)
Guía paso a paso para equipos que tienen una app React Native y quieren consumir `@scotia/rn-network`.

- [Instalación](02-integracion-app-rn/01-instalacion.md)
- [Uso básico](02-integracion-app-rn/02-uso-basico.md)
- [Config plugin](02-integracion-app-rn/03-config-plugin.md)
- [AppConfigProvider y dominios](02-integracion-app-rn/04-app-config-provider.md)
- [Modo desarrollo](02-integracion-app-rn/05-modo-desarrollo.md)
- [Ejemplo completo](02-integracion-app-rn/06-ejemplo-completo.md)

### [03 — Integración en una app nativa](03-integracion-app-nativa/README.md)
Guía paso a paso para equipos que tienen una app nativa Android/iOS y quieren implementar `NetworkProvider` para hospedar RN.

- [Android — consumir contracts](03-integracion-app-nativa/01-android-consumir-contracts.md)
- [Android — registrar provider](03-integracion-app-nativa/02-android-registrar-provider.md)
- [iOS — consumir contracts](03-integracion-app-nativa/03-ios-consumir-contracts.md)
- [iOS — registrar provider](03-integracion-app-nativa/04-ios-registrar-provider.md)
- [Orden de inicialización](03-integracion-app-nativa/05-orden-de-inicializacion.md)
- [Publicación de artefactos](03-integracion-app-nativa/06-publicacion-de-artefactos.md)

### [04 — Referencia API](04-referencia-api/README.md)
Referencia completa de firmas, tipos, errores y troubleshooting.

- [API JS](04-referencia-api/01-rn-network-api-js.md)
- [Tipos](04-referencia-api/02-rn-network-tipos.md)
- [Contracts Android](04-referencia-api/03-contracts-android.md)
- [Contracts iOS](04-referencia-api/04-contracts-ios.md)
- [Manejo de errores](04-referencia-api/05-manejo-de-errores.md)
- [Troubleshooting](04-referencia-api/06-troubleshooting.md)

## Versiones documentadas

| Componente | Versión | Notas |
|---|---|---|
| `@scotia/rn-network` | 0.1.33 | Expo module — `peerDependencies`: expo, react, react-native |
| `rn-network-contracts` (Android, JitPack) | 1.0.8 | `com.github.juanvegu:rn-network-contracts` |
| `rn-network-contracts` (iOS, CocoaPods) | 1.0.3 | Distribuido vía `scotia-podspecs` |

## Convenciones

- Idioma: **español**.
- Audiencia: equipo mobile (RN + nativo).
- Cada archivo `.md` está pensado para pegarse como **una página individual** en Confluence; cada subcarpeta es una **sección padre** con sus páginas hijas.
- Los diagramas usan Mermaid. Confluence los renderiza con el plugin oficial.
