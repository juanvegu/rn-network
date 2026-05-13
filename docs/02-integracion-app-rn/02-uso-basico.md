# Uso básico

## Primera request

```typescript
import { request } from '@scotia/rn-network'

async function fetchUser() {
  try {
    const data = await request('/api/users/me')
    console.log(data) // Record<string, unknown>
  } catch (error) {
    // error es de tipo NetworkErrorPayload
    console.error(error)
  }
}
```

`request()` por defecto hace `GET`. Para otros métodos:

```typescript
await request('/api/users', 'POST', { 'Content-Type': 'application/json' }, { name: 'Ana' })
await request('/api/users/42', 'PUT', {}, { name: 'Ana B.' })
await request('/api/users/42', 'DELETE')
```

## Firma completa

```typescript
function request(
  url: string,
  method: HttpMethod = 'GET',
  headers: Record<string, string> = {},
  body?: Record<string, unknown>
): Promise<Record<string, unknown>>
```

- `url` — relativo (se prepende el `baseURL` activo) o absoluto (`http(s)://...`).
- `method` — `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`.
- `headers` — diccionario plano de strings.
- `body` — diccionario JSON-serializable, opcional.

Retorna un `Record<string, unknown>` (la respuesta JSON parseada). **Solo se soportan respuestas JSON con un objeto raíz** — arrays raíz, texto plano o binario no son válidos.

## Verificar si el bridge nativo está disponible

```typescript
import { isAvailable } from '@scotia/rn-network'

if (isAvailable()) {
  // La app nativa host registró su provider — las requests van al stack nativo
} else {
  // Estamos en desarrollo sin host, o el host no registró todavía
}
```

`isAvailable()` retorna `true` solo si el módulo nativo está linkeado **y** el host ya hizo `RNNetworkRegistry.provider = ...`. Útil para decidir si caer a un mock JS.

## Configurar la baseURL en JS

Cuando no hay host nativo (típicamente en `expo start`), puedes setear un `baseURL` manual:

```typescript
import { setBaseURL, getBaseURL } from '@scotia/rn-network'

setBaseURL('http://localhost:8080')
console.log(getBaseURL()) // 'http://localhost:8080'
```

`setBaseURL` recorta el `/` final si lo trae. En modo nativo este valor se ignora (gana el `baseURL` derivado de `appConfig.activeDomain` del host).

## Manejo de errores

Todos los errores son rechazos con forma `NetworkErrorPayload`:

```typescript
import type { NetworkErrorPayload } from '@scotia/rn-network'

try {
  await request('/api/x')
} catch (e) {
  const err = e as NetworkErrorPayload
  console.log(err.code)         // 'SSL_PINNING_FAILED' | 'TIMEOUT' | ...
  console.log(err.retryable)    // boolean
  console.log(err.httpStatus)   // number | undefined
}
```

Ver [Manejo de errores](../04-referencia-api/05-manejo-de-errores.md) para la tabla completa de códigos.

## Patrón de servicio típico

```typescript
// src/services/users.ts
import { request } from '@scotia/rn-network'

export interface User {
  id: number
  name: string
}

export async function getCurrentUser(): Promise<User> {
  const data = await request('/api/users/me')
  return data as unknown as User
}

export async function updateUser(id: number, patch: Partial<User>): Promise<User> {
  const data = await request(`/api/users/${id}`, 'PATCH', {}, patch)
  return data as unknown as User
}
```

La conversión `as unknown as User` es manual porque la API retorna `Record<string, unknown>`. Si necesitas validación runtime, integra una librería como Zod o Valibot en la capa de servicios.

## Siguiente paso

[Config plugin →](03-config-plugin.md)
