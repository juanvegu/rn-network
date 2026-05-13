# Manejo de errores

Todos los errores que `@scotia/rn-network` lanza desde `request()` son rechazos de Promise con la forma:

```typescript
interface NetworkErrorPayload {
  code: NetworkErrorCode
  retryable: boolean
  httpStatus?: number
}
```

## Tabla de códigos

| `code` | Causa típica | `retryable` esperado | `httpStatus` presente | Acción sugerida |
|---|---|---|---|---|
| `SSL_PINNING_FAILED` | El certificado del servidor no coincide con el pin. Puede ser un ataque MITM, un certificado rotado sin actualizar el pin, o un proxy de debugging interceptando. | `false` | No | **No reintentar.** Reportar al equipo de seguridad. Revisar el pin contra el cert actual. |
| `TIMEOUT` | La request superó el `connectTimeout` o `readTimeout` configurado en el provider nativo. | `true` | No | Reintentar con backoff exponencial. Si recurre, alertar al usuario sobre conexión lenta. |
| `NO_CONNECTIVITY` | El device no tiene red (avión, sin señal). | `true` | No | Mostrar UI de "sin conexión". Reintentar cuando vuelva la conectividad. |
| `HTTP_CLIENT_ERROR` | Status 4xx — error del cliente (auth, validación, recurso no encontrado, etc.). | `false` (por default) | Sí | **No reintentar** automáticamente. Manejar según el `httpStatus`: 401 ⇒ refresh token, 404 ⇒ feedback, 400 ⇒ validación de inputs. |
| `HTTP_SERVER_ERROR` | Status 5xx — error del servidor. | `true` | Sí | Reintentar con backoff. Si recurre, alertar y dejar log para el equipo backend. |
| `PROVIDER_NOT_SET` | No hay `NetworkProvider` registrado (en nativo) **y** no hay mock JS en `__DEV__`. | `false` | No | **Error de integración**, no de runtime. Ver [Orden de inicialización](../03-integracion-app-nativa/05-orden-de-inicializacion.md). |
| `UNKNOWN` | Cualquier otro error: parse JSON fallido, excepción no clasificada del provider, mock sin ruta matching, etc. | `false` | No | Log con detalle. Si recurre, investigar el provider. |

## Patrón de manejo

### Discriminar por `code`

```typescript
import type { NetworkErrorPayload } from '@scotia/rn-network'

async function fetchWithUX() {
  try {
    return await request('/api/data')
  } catch (e) {
    const err = e as NetworkErrorPayload
    switch (err.code) {
      case 'NO_CONNECTIVITY':
        showToast('Sin conexión. Reintentando...')
        return
      case 'TIMEOUT':
      case 'HTTP_SERVER_ERROR':
        if (err.retryable) await retryWithBackoff()
        return
      case 'HTTP_CLIENT_ERROR':
        if (err.httpStatus === 401) await refreshAuthAndRetry()
        else showError(`Error ${err.httpStatus}`)
        return
      case 'SSL_PINNING_FAILED':
        showError('Error de seguridad. Contacta soporte.')
        reportToSecurity(err)
        return
      case 'PROVIDER_NOT_SET':
        // Bug de integración. En prod nunca debería pasar.
        console.error('PROVIDER_NOT_SET — host no registró el provider')
        return
      case 'UNKNOWN':
      default:
        showError('Algo salió mal.')
    }
  }
}
```

### Wrapper con retry genérico

```typescript
async function requestWithRetry<T = Record<string, unknown>>(
  url: string,
  opts: { method?: HttpMethod; headers?: Record<string, string>; body?: Record<string, unknown> } = {},
  maxAttempts = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await request(url, opts.method, opts.headers, opts.body)
      return data as T
    } catch (e) {
      const err = e as NetworkErrorPayload
      if (!err.retryable || attempt === maxAttempts) throw err
      await new Promise(r => setTimeout(r, 2 ** attempt * 250))
    }
  }
  throw new Error('unreachable')
}
```

## La librería **no** reintenta sola

`request()` ejecuta exactamente una llamada al provider. La política de retry es responsabilidad del consumidor. El campo `retryable` es una **sugerencia**, no una garantía.

## Errores que **no** son `NetworkErrorPayload`

En casos excepcionales, un error que llega al `catch` puede no tener la forma esperada (ej. un error de programación que tira otro tipo de objeto). La capa nativa normaliza la mayoría de cosas, pero es buena práctica chequear:

```typescript
function isNetworkError(e: unknown): e is NetworkErrorPayload {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as any).code === 'string' &&
    typeof (e as any).retryable === 'boolean'
  )
}

try {
  await request('/api/x')
} catch (e) {
  if (isNetworkError(e)) {
    // safe to access e.code, e.retryable, e.httpStatus
  } else {
    console.error('Unexpected error shape', e)
  }
}
```

(Internamente, `RNNetworkBridge` ya hace esta verificación y convierte cualquier cosa no reconocida a `{ code: 'UNKNOWN', retryable: false }`. Pero defensivamente, validar en el consumidor no hace daño.)

## Cómo se mapean los errores en la capa nativa

El módulo nativo usa una clase interna `NetworkErrorMapper` (no exportada en `contracts`) que recibe cualquier `Throwable`/`Error` del provider y devuelve un `NetworkException` con `code` y `retryable`. La heurística usual:

- `SSLException` / `SecTrustEvaluate` failure ⇒ `SSL_PINNING_FAILED`.
- `SocketTimeoutException` / `URLError.timedOut` ⇒ `TIMEOUT`.
- `UnknownHostException` / `URLError.notConnectedToInternet` ⇒ `NO_CONNECTIVITY`.
- `IOException` con mensaje `com.scotia.rnnetwork.http:<status>` ⇒ `HTTP_CLIENT_ERROR` (400-499) o `HTTP_SERVER_ERROR` (500-599), con `httpStatus` extraído.
- Cualquier otra cosa ⇒ `UNKNOWN`.

Si necesitas un control fino sobre cómo se clasifican errores específicos de tu host, lanza con el mensaje en el formato esperado.
