# Uso básico

## Primera request

```typescript
import { request } from '@scotia/rn-network'

const res = await request('/v1/brands', 'GET')
console.log(res.body)         // parsed JSON
console.log(res.statusCode)   // 200
console.log(res.headers)      // { ... }
```

`request<T>()` retorna `Promise<NetworkResponse<T>>` con:

- `body: T` — JSON parseado (`{}` para 204/cuerpo vacío)
- `statusCode: number`
- `headers: Record<string, string>`

## Tipado del body

```typescript
interface Brand { id: string; description: string }
interface BrandsResponse { brands: Brand[]; years: { id: string; description: string }[] }

const res = await request<BrandsResponse>('/v1/brands', 'GET')
res.body.brands.forEach(b => console.log(b.description))
```

## Métodos, headers y body

```typescript
const res = await request<{ id: string }>(
  '/v1/quote',
  'POST',
  { 'X-Client': 'mobile' },
  { vehicleId: '123', condition: 'new' }
)
```

Métodos soportados: `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`.

## Manejo de errores

Todos los errores rechazan con `NetworkErrorPayload`:

```typescript
interface NetworkErrorPayload {
  code: string         // ver tabla de códigos estándar
  retryable: boolean
  httpStatus?: number
  message?: string
  info?: Record<string, unknown>
}
```

Patrón recomendado:

```typescript
try {
  const res = await request('/v1/brands')
} catch (e) {
  const err = e as NetworkErrorPayload
  switch (err.code) {
    case 'SESSION_EXPIRED':
      router.replace('/login')
      break
    case 'NO_CONNECTIVITY':
    case 'TIMEOUT':
      toast.show('Sin conexión. Reintentá.', { retryable: err.retryable })
      break
    case 'HTTP_CLIENT_ERROR':
      toast.show(`Error del cliente (${err.httpStatus})`)
      break
    case 'HTTP_SERVER_ERROR':
      toast.show('El servidor falló. Reintentá en unos minutos.')
      break
    default:
      logger.error('unhandled network error', err)
  }
}
```

Ver [04 · Códigos de error](../04-referencia-api/05-manejo-de-errores.md) para la lista completa.

## Timeout

Por defecto cada request tiene 30 s de timeout cliente. Si el nativo no responde, JS lanza `TIMEOUT` y best-effort cancela el request real.

```typescript
import { setRequestTimeout, request } from '@scotia/rn-network'

setRequestTimeout(15_000)              // global, en ms
setRequestTimeout(0)                   // desactiva el timeout cliente

// override per-call:
await request('/slow', 'GET', {}, undefined, { timeoutMs: 5_000 })
```

## Cancelación

Pasar un `requestId` permite cancelar manualmente:

```typescript
import { request, cancelRequest } from '@scotia/rn-network'

const id = 'fetch-brands'
request('/v1/brands', 'GET', {}, undefined, { requestId: id })
  .catch(e => console.log(e.code))    // 'CANCELLED' si se canceló

// más tarde:
await cancelRequest(id)
```

Si el host no implementa `cancel()`, `cancelRequest` es no-op pero no rompe.

## Sesión expirada

Suscribirse al evento push para reaccionar inmediatamente cuando el host detecta sesión perdida (no espera al próximo request fallido):

```typescript
import { onSessionExpired } from '@scotia/rn-network'

useEffect(() => onSessionExpired(() => {
  Alert.alert('Sesión expirada', 'Volvé a iniciar sesión')
  router.replace('/login')
}), [])
```
