// Configure provider before any request
import './src/networkConfig'

import { isAvailable, request } from '@scotia/rn-network'
import type { HttpMethod, NetworkErrorPayload } from '@scotia/rn-network'
import { useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Record<string, unknown> }
  | { status: 'error'; error: NetworkErrorPayload }

export default function App() {
  const [result, setResult] = useState<RequestState>({ status: 'idle' })

  async function doRequest(url: string, method: HttpMethod = 'GET', body?: Record<string, unknown>) {
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

        <Text style={styles.title}>@scotia/rn-network</Text>

        <Section title="Bridge">
          <Row label="isAvailable()" value={String(isAvailable())} />
          <Row label="Modo" value={isAvailable() ? 'nativo' : '__DEV__ mock'} />
        </Section>

        <Section title="Requests">
          <Btn label="GET /api/users/me"        onPress={() => doRequest('/api/users/me')} />
          <Btn label="GET /api/accounts/list"  onPress={() => doRequest('/api/accounts/list')} />
          <Btn label="POST /api/users/me"      onPress={() => doRequest('/api/users/me', 'POST', { name: 'Test' })} />
          <Btn label="GET /ruta/sin/match"     onPress={() => doRequest('/ruta/sin/match')} />
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
  if (state.status === 'idle') {
    return <Text style={styles.placeholder}>Presiona un botón para hacer un request.</Text>
  }
  if (state.status === 'loading') {
    return <ActivityIndicator />
  }
  if (state.status === 'error') {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorCode}>code: {state.error.code}</Text>
        <Text style={styles.errorRetry}>retryable: {String(state.error.retryable)}</Text>
        {state.error.httpStatus != null && (
          <Text style={styles.errorRetry}>httpStatus: {state.error.httpStatus}</Text>
        )}
      </View>
    )
  }
  return (
    <Text style={styles.json}>
      {JSON.stringify(state.data, null, 2)}
    </Text>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginVertical: 8 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#3C3C43' },
  rowValue: { fontWeight: '600', color: '#007AFF' },
  btn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  placeholder: { color: '#8E8E93', fontStyle: 'italic' },
  json: { fontFamily: 'monospace', fontSize: 13, color: '#1C1C1E' },
  errorBox: { gap: 4 },
  errorCode: { fontWeight: '700', color: '#FF3B30' },
  errorRetry: { color: '#3C3C43' },
})
