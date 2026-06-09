# @scotia/rn-network

Networking bridge for React Native (Expo) embedded in Scotia's native apps (expo-brownfield). The module **does not do HTTP** — it delegates every request to the bank's native stack (URLSession / OkHttp with pinning, session, telemetry) through a shared contract.

```
React  ──request()──►  RnNetworkModule (Swift/Kotlin)  ──►  host's NetworkProvider
                              │
                       no provider → MockNetworkProvider (JS, dev/stubbed)
```

## What it solves

- RN doesn't reimplement pinning/session/retries — it uses the bank's HTTP stack.
- Typed shared contract (`NetworkResponse`, `NetworkError`, `AppConfig`) between the native host and the module.
- Automatic fallback to a JS mock when the host didn't register a provider (stubbed mode).
- Client-side timeout, cancellation, `sessionExpired` event.

## Installation

```bash
npm install @scotia/rn-network    # Scotia internal npm registry
```

Peer deps: `expo`, `react`, `react-native`. **No** config plugin needed in `app.json`.

## Usage

```typescript
import { request, onSessionExpired } from '@scotia/rn-network'

// request() returns the envelope { body, statusCode, headers }
const res = await request<{ brands: Brand[] }>('/v1/brands', 'GET')
console.log(res.body.brands, res.statusCode)

// typed errors
try { await request('/v1/quote', 'POST', {}, payload) }
catch (e) {
  if (e.code === 'SESSION_EXPIRED') router.replace('/login')
}

// session expired (pushed from native)
useEffect(() => onSessionExpired(() => router.replace('/login')), [])
```

### Mock for development

```typescript
import { isAvailable, setProvider, MockNetworkProvider } from '@scotia/rn-network'

if (!isAvailable()) {
  setProvider(new MockNetworkProvider({
    routes: { 'GET /v1/brands': require('./mocks/brands.json') },
  }))
}
```

## The native contract

The module depends on `iOSNetworkContract` (iOS) and `cl.scotiabank.rnnetwork:contracts` (Android):

- **iOS** — bundles `ios/iOSNetworkContract.xcframework` (vendored). Synced from the contract repo via `build-and-sync.sh`.
- **Android** — Maven dependency in `android/build.gradle`.

The **bank's native app** implements `NetworkProvider` and registers it in `RNNetworkRegistry` before initializing RN. See the contract repo and the docs.

## Local development

```bash
npm run build       # compile TS (build/)
npm test            # jest
npm run lint
```

### Linking against local repos

```bash
# In the consuming app:
npm install ../rn-network --install-links=false   # symlink (live)
# requires metro.config.js (see docs · Development mode)

# Sync the contract xcframework when it changes:
cd ../rn-network-contracts && ./scripts/build-and-sync.sh
```

> With a symlink, add a `metro.config.js` with `watchFolders` + `blockList` (see docs). Or use `npm install ../rn-network` (copy) with no config.

## Structure

```
src/        TS: index, RNNetworkBridge, MockNetworkProvider, AppConfigContext, types
ios/        RnNetworkModule.swift, NetworkErrorMapper.swift, RnNetwork.podspec, iOSNetworkContract.xcframework
android/    RnNetworkModule.kt, NetworkErrorMapper.kt, build.gradle
example/    minimal reference app (how to integrate)
docs/       full documentation (Confluence)
```

## Full documentation

See [`docs/`](docs/README.md) — architecture, technical decisions, native integration, API reference, troubleshooting.

## Public API

`request` · `cancelRequest` · `setRequestTimeout` · `setProvider` · `isAvailable` · `setBaseURL` · `getBaseURL` · `onSessionExpired` · `AppConfigProvider` · `useAppConfig` · `MockNetworkProvider` · `parseAppConfig`

Types: `NetworkResponse` · `NetworkErrorPayload` · `NetworkErrorCode` · `HttpMethod` · `RequestOptions` · `AppConfig`
