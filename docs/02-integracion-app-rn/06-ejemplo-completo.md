# Ejemplo completo

Walkthrough de una pantalla mínima que ejercita las APIs principales: `isAvailable`, `request`, manejo de errores. Basado en `rn-network/example/App.tsx`.

## Estructura

```
example-app/
├── App.tsx               ← pantalla
├── src/
│   └── networkConfig.ts  ← bootstrap del provider/baseURL
└── package.json
```

## `src/networkConfig.ts`

```typescript
import { setProvider, setBaseURL, isAvailable, MockNetworkProvider } from '@scotia/rn-network'

if (__DEV__) {
  setBaseURL('http://localhost:8080')
}

if (__DEV__ && !isAvailable()) {
  setProvider(
    new MockNetworkProvider({
      routes: {
        '/api/users/me':       { id: 1, name: 'Demo User' },
        '/api/accounts/list':  { accounts: [{ id: 'A1' }, { id: 'A2' }] },
      },
    })
  )
}
```

## `App.tsx`

```tsx
// Bootstrap antes de cualquier import que use la librería en tiempo de módulo
import './src/networkConfig'

import { isAvailable, request } from '@scotia/rn-network'
import type { HttpMethod, NetworkErrorPayload } from '@scotia/rn-network'
import { useState } from 'react'
import {
  ActivityIndicator, SafeAreaView, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Record<string, unknown> }
  | { status: 'error'; error: NetworkErrorPayload }

export default function App() {
  const [result, setResult] = useState<RequestState>({ status: 'idle' })

  async function doRequest(
    url: string,
    method: HttpMethod = 'GET',
    body?: Record<string, unknown>,
  ) {
    setResult({ status: 'loading' })
    try {
      const data = await request(url, method, {}, body)
      setResult({ status: 'success', data })
    } catch (e) {
      setResult({ status: 'error', error: e as NetworkErrorPayload })
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.title}>@scotia/rn-network demo</Text>

        <Section title="Bridge">
          <Row label="isAvailable()" value={String(isAvailable())} />
          <Row label="Modo" value={isAvailable() ? 'nativo' : '__DEV__ mock'} />
        </Section>

        <Section title="Requests">
          <Btn label="GET /api/users/me"      onPress={() => doRequest('/api/users/me')} />
          <Btn label="GET /api/accounts/list" onPress={() => doRequest('/api/accounts/list')} />
          <Btn label="POST /api/users/me"     onPress={() => doRequest('/api/users/me', 'POST', { name: 'Test' })} />
          <Btn label="GET /no-existe"         onPress={() => doRequest('/no-existe')} />
        </Section>

        <Section title="Resultado">
          <ResultView state={result} />
        </Section>

      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  )
}

function ResultView({ state }: { state: RequestState }) {
  if (state.status === 'idle') return <Text style={styles.placeholder}>Presiona un botón.</Text>
  if (state.status === 'loading') return <ActivityIndicator />
  if (state.status === 'error') {
    return (
      <View>
        <Text style={styles.errorCode}>code: {state.error.code}</Text>
        <Text>retryable: {String(state.error.retryable)}</Text>
        {state.error.httpStatus != null && <Text>httpStatus: {state.error.httpStatus}</Text>}
      </View>
    )
  }
  return <Text style={styles.json}>{JSON.stringify(state.data, null, 2)}</Text>
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#3C3C43' },
  rowValue: { fontWeight: '600', color: '#007AFF' },
  btn: { backgroundColor: '#007AFF', borderRadius: 8, padding: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  placeholder: { color: '#8E8E93', fontStyle: 'italic' },
  json: { fontFamily: 'monospace', fontSize: 13 },
  errorCode: { fontWeight: '700', color: '#FF3B30' },
})
```

## Qué demuestra cada botón

| Botón | Qué ejercita |
|---|---|
| `GET /api/users/me` | Camino feliz. En dev pega al mock; en build nativo va al provider del host. |
| `GET /api/accounts/list` | Mismo, con un payload con array dentro. |
| `POST /api/users/me` | Que `method` y `body` se serializan correctamente. |
| `GET /no-existe` | Camino de error: en dev devuelve `{ code: 'UNKNOWN' }` (mock no encuentra ruta); en nativo devuelve `HTTP_CLIENT_ERROR` con `httpStatus: 404`. |

## Cómo correrlo

```bash
npm install
npx expo prebuild --clean
npx expo run:ios     # o run:android
```

En modo `expo start`, `isAvailable()` mostrará `false` y el botón "Modo" dirá `__DEV__ mock`.

Si la app está embebida en una app nativa que registró su provider, `isAvailable()` mostrará `true` y "Modo" dirá `nativo`.
