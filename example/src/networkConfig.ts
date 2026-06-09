import { isAvailable, MockNetworkProvider, setProvider } from '@scotia/rn-network'

// Regla de fallback: si NO hay provider nativo registrado, usamos el mock JS.
// Sin gate __DEV__ — el host nativo decide (puede arrancar en stubbed/mock
// incluso en prod). Con provider nativo presente, este bloque no aplica.
if (!isAvailable()) {
  setProvider(
    new MockNetworkProvider({
      routes: {
        '/users/me': require('../mocks/users/me.json'),
        '/accounts/list': require('../mocks/accounts/list.json'),
      },
    })
  )
}
