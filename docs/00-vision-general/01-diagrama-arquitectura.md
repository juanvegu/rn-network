# Diagrama de arquitectura

```
┌─────────────────────────────────────────┐         ┌──────────────────────────────────────┐
│  App nativa del banco (iOS/Android)     │         │ @scotia/rn-network (Expo Module)     │
│                                         │         │                                      │
│  ┌─────────────────────────────────┐    │         │  ┌──────────────────────────────┐   │
│  │ AppNetworkProvider              │    │         │  │ React code → request(...)    │   │
│  │  (URLSession / OkHttp,          │    │         │  │     ↓                        │   │
│  │   pinning, session, telemetry)  │    │         │  │ RNNetworkBridge (TS)         │   │
│  └─────────────────────────────────┘    │         │  │     ↓                        │   │
│                ↑ implementa NetworkProvider        │  │ RnNetworkModule (Swift/Kt)   │   │
│                                                    │  │  (verifica 2xx, parsea body) │   │
│  ┌─────────────────────────────────┐    │         │  │     ↓                        │   │
│  │ RNNetworkRegistry (singleton)   │ ◄──┼─llama───┤  │ provider.request(...)        │   │
│  │  · provider                     │    │         │  └──────────────────────────────┘   │
│  │  · appConfig                    │    │         │                                      │
│  │  · activeDomain                 │    │         │  Si provider == nil:                │
│  │  · onSessionExpired             │    │         │  fallback al MockNetworkProvider JS │
│  └─────────────────────────────────┘    │         │                                      │
└─────────────────────────────────────────┘         └──────────────────────────────────────┘

           ────────────────── contrato: rn-network-contracts ──────────────────
                              (Swift Package / CocoaPod  +  Maven AAR)
```

## Lecturas del diagrama

1. **Quien hace el request HTTP es el host nativo**, no el módulo RN.
2. **El singleton `RNNetworkRegistry`** vive en el código del contrato, asegurando una instancia compartida entre el binary del host y el del módulo Expo.
3. **El módulo Expo verifica la respuesta** (`2xx`/`statusCode`) centralmente — el host no clasifica errores HTTP por status.
4. **Si no hay provider**, el módulo cae al mock JS sin que la app se entere — útil cuando el nativo arranca en modo stubbed.
5. **Eventos `sessionExpired`** viajan en sentido inverso (nativo → JS) vía un callback en el registry.

## Cuándo cruza el bridge

| Acción | Hilo / dirección |
|---|---|
| `request(url, …)` desde React | JS → bridge → módulo nativo → `provider.request` |
| Respuesta exitosa | provider → módulo verifica 2xx → JS recibe `{ body, statusCode, headers }` |
| Error del provider | `NetworkError` tipado → bridge → JS recibe `NetworkErrorPayload` |
| Timeout del cliente | JS race, llama `cancel(requestId)` → módulo → `provider.cancel` |
| Sesión expirada | host invoca `RNNetworkRegistry.onSessionExpired?()` → módulo emite evento → JS recibe |
