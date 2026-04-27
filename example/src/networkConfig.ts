import { isAvailable, MockNetworkProvider, setProvider } from '@scotia/rn-network'

// In development (__DEV__) without native bridge, inject the mock.
// With the bridge present, native handles everything — this block won't execute.
if (__DEV__ && !isAvailable()) {
  setProvider(
    new MockNetworkProvider({
      routes: {
        '/users/me': require('../mocks/users/me.json'),
        '/accounts/list': require('../mocks/accounts/list.json'),
      },
    })
  )
}
