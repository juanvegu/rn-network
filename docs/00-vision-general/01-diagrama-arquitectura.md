# Diagrama de arquitectura

## Componentes (vista lógica)

```mermaid
flowchart TB
    subgraph RN["App React Native (consumidor)"]
        RNCode["Código JS/TS<br/>request('/api/...')"]
    end

    subgraph PKG["@scotia/rn-network"]
        JS["Capa JS<br/>src/index.ts"]
        BridgeIOS["Módulo nativo iOS<br/>RnNetworkModule.swift"]
        BridgeAND["Módulo nativo Android<br/>RnNetworkModule.kt"]
        Plugin["Config plugin<br/>withNetworkContracts.ts"]
    end

    subgraph CONTRACTS["rn-network-contracts"]
        ProviderIF["NetworkProvider<br/>(interfaz)"]
        Registry["RNNetworkRegistry<br/>(singleton)"]
    end

    subgraph HOST["App nativa host (consumidor)"]
        Impl["AppNetworkProvider<br/>(OkHttp/URLSession + pinning)"]
        Init["MainApplication / AppDelegate<br/>RNNetworkRegistry.provider = ..."]
    end

    RNCode --> JS
    JS --> BridgeIOS
    JS --> BridgeAND
    BridgeIOS --> Registry
    BridgeAND --> Registry
    Registry --> ProviderIF
    Impl -.implements.-> ProviderIF
    Init -.registra.-> Registry
    Plugin -.modifica Podfile en prebuild.-> RN
```

## Flujo de una request (secuencia)

```mermaid
sequenceDiagram
    autonumber
    participant JS as Código RN (JS)
    participant API as @scotia/rn-network<br/>(src/index.ts)
    participant Native as Módulo nativo<br/>(RnNetworkModule)
    participant Reg as RNNetworkRegistry
    participant Prov as NetworkProvider<br/>(impl del host)
    participant Net as Red (OkHttp/URLSession)

    JS->>API: request('/api/x', 'GET', headers, body)
    API->>API: resolveURL → prepend baseURL si es ruta relativa
    API->>Native: RNNetworkBridge.isAvailable()?
    Native->>Reg: provider != null?
    Reg-->>Native: true
    Native-->>API: true
    API->>Native: request(url, method, headers, body)
    Native->>Reg: lee provider
    Native->>Prov: provider.request(url, method, headers, body)
    Prov->>Net: HTTP request con pinning
    Net-->>Prov: Data / ByteArray
    Prov-->>Native: bytes
    Native->>Native: JSON parse → Map/Dictionary
    Native-->>API: Record<string, unknown>
    API-->>JS: Promise resuelve con JSON
```

## Caso de fallback (modo desarrollo)

```mermaid
sequenceDiagram
    autonumber
    participant JS as Código RN (JS)
    participant API as @scotia/rn-network
    participant Native as Módulo nativo
    participant Mock as MockNetworkProvider (JS)

    JS->>API: request('/api/x')
    API->>Native: isAvailable()?
    Native-->>API: false (no hay provider nativo)
    API->>API: __DEV__ && registry.jsProvider ?
    API->>Mock: mock.request(...)
    Mock-->>API: respuesta hardcodeada
    API-->>JS: Promise resuelve
```

## Caso de error

```mermaid
sequenceDiagram
    participant JS as Código RN
    participant API as @scotia/rn-network
    participant Native as Módulo nativo
    participant Reg as RNNetworkRegistry

    JS->>API: request('/api/x')
    API->>Native: isAvailable()?
    Native->>Reg: provider != null?
    Reg-->>Native: false
    Native-->>API: false
    Note over API: No hay mock JS y no estamos en __DEV__
    API-->>JS: throw { code: 'PROVIDER_NOT_SET', retryable: false }
```

## Distribución / publicación

```mermaid
flowchart LR
    subgraph GH["GitHub"]
        RepoNet["juanvegu/scotia-rn-network"]
        RepoCon["juanvegu/rn-network-contracts"]
        RepoPods["juanvegu/scotia-podspecs"]
    end

    subgraph CI["Registros"]
        NPM["npm / github:juanvegu/scotia-rn-network"]
        JP["JitPack<br/>com.github.juanvegu:rn-network-contracts:&lt;tag&gt;"]
        Pod["CocoaPods<br/>NetworkContracts (vía scotia-podspecs)"]
    end

    RepoNet --> NPM
    RepoCon --> JP
    RepoCon --> RepoPods
    RepoPods --> Pod

    NPM -.consumido por.-> AppRN["App React Native"]
    JP -.consumido por.-> AppAndroid["App nativa Android"]
    Pod -.consumido por.-> AppIOS["App nativa iOS"]
    JP -.consumido por.-> RNNetAnd["rn-network/android"]
    Pod -.consumido por.-> RNNetIOS["rn-network/ios"]
```

## Notas

- **Doble consumo de contracts**: tanto el módulo nativo de `rn-network` como la app host consumen `rn-network-contracts`. Ambos lados deben usar la **misma versión** para garantizar un único `RNNetworkRegistry` en el proceso (ver [Versionado y compatibilidad](../01-arquitectura/05-versionado-y-compatibilidad.md)).
- **Config plugin**: el plugin `withNetworkContracts` se ejecuta solo durante `npx expo prebuild` en la app RN, y modifica el `Podfile` (añadir source `scotia-podspecs`, forzar `NetworkContracts` como dynamic framework). No afecta Android.
