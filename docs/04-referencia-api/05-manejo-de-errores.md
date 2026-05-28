# Manejo de errores

Todos los errores de `request()` rechazan con `NetworkErrorPayload`:

```typescript
interface NetworkErrorPayload {
  code: NetworkErrorCode
  retryable: boolean
  httpStatus?: number
  message?: string
  info?: Record<string, unknown>
}
```

## Tabla de códigos estándar

La librería garantiza emitir/mapear estos códigos. Hosts pueden agregar los suyos (prefijo `SCOTIA_*` recomendado).

| Código | Origen | `retryable` | `httpStatus` | Cuándo aparece |
|---|---|---|---|---|
| `SSL_PINNING_FAILED` | mapper | false | — | Cert no matchea el pin |
| `TIMEOUT` | mapper (sistema) o JS (cliente) | true | — | Request superó el timeout |
| `NO_CONNECTIVITY` | mapper | true | — | Sin red / DNS fail / unreachable |
| `HTTP_CLIENT_ERROR` | módulo | false | 4xx | Response con status 400–499 |
| `HTTP_SERVER_ERROR` | módulo | true | 5xx | Response con status 500–599 |
| `INVALID_RESPONSE_BODY` | módulo | false | (2xx) | 2xx pero body no es JSON parseable |
| `CANCELLED` | mapper | false | — | Task/coroutine cancelada (incluye timeout cliente) |
| `SESSION_EXPIRED` | host | false | usualmente 401 | Host detectó sesión vencida |
| `SESSION_UNAUTHORIZED` | host | false | 401 | 401 que no es expiración (credenciales) |
| `PROVIDER_NOT_SET` | módulo | false | — | Sin provider nativo y sin mock JS |
| `UNKNOWN` | mapper | false | — | Error que no encaja en ningún caso |

## Patrón de manejo

```typescript
try {
  const res = await request<{ data: Foo }>('/v1/foo', 'POST', {}, payload)
  // usar res.body.data
} catch (e) {
  const err = e as NetworkErrorPayload
  switch (err.code) {
    case 'SESSION_EXPIRED':
      router.replace('/login')
      break

    case 'NO_CONNECTIVITY':
    case 'TIMEOUT':
      toast.show('Sin conexión. Verificá tu red.', { retryable: true })
      break

    case 'HTTP_CLIENT_ERROR':
      // err.httpStatus es 400-499. Mensaje específico del backend en err.message.
      toast.show(err.message ?? 'Solicitud inválida.')
      break

    case 'HTTP_SERVER_ERROR':
      toast.show('El servidor está fallando. Reintentá en unos minutos.')
      break

    case 'INVALID_RESPONSE_BODY':
      logger.error('BFF returned non-JSON', { url: '/v1/foo' })
      break

    case 'CANCELLED':
      // Usuario navegó o se disparó timeout cliente — no mostrar nada.
      break

    case 'SSL_PINNING_FAILED':
      logger.fatal('Pinning failed; possible MITM', err)
      Alert.alert('Error de seguridad', 'Cerrá y volvé a abrir la app.')
      break

    case 'PROVIDER_NOT_SET':
      logger.fatal('No network provider registered', err)
      break

    default:
      // Códigos host-específicos del banco (SCOTIA_*, etc.).
      logger.warn('unhandled network code', err)
  }
}
```

## Códigos host-específicos

El host puede tirar cualquier código string que tenga sentido para el banco. Ejemplos:

```kotlin
throw NetworkError(
    code = "SCOTIA_KYC_PENDING",
    retryable = false,
    httpStatus = 403,
    message = "El usuario debe completar KYC",
    info = mapOf("kycUrl" to "https://kyc.bank.cl/start"),
)
```

El JS recibe esto verbatim:

```typescript
case 'SCOTIA_KYC_PENDING':
  router.push(err.info?.kycUrl as string)
  break
```

`NetworkErrorCode` es `StandardNetworkErrorCode | (string & {})` — TypeScript mantiene autocomplete de los estándar pero acepta cualquier string para los custom.

## `retryable`

Hint del provider o del módulo sobre si vale la pena reintentar. La librería **no** reintenta automáticamente — esa decisión es del consumidor (app o capa de servicios). Patrones recomendados:

- **No retry para 4xx**: cambiar el request es responsabilidad del usuario.
- **Retry exponencial para `TIMEOUT`, `NO_CONNECTIVITY`, `HTTP_SERVER_ERROR`**: con backoff y un cap razonable (3 intentos máx).
- **Nunca retry para `SESSION_EXPIRED`**: forzar relogin.
