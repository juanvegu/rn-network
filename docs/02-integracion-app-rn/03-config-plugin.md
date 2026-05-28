# Config plugin

`@scotia/rn-network` incluye un config plugin de Expo que se ejecuta durante `npx expo prebuild`. **Solo afecta a iOS.**

## Qué hace

Agrega un `post_install` hook al Podfile que fuerza a `NetworkContracts` a compilarse como **dynamic framework** (`MACH_O_TYPE = mh_dylib`), aunque CocoaPods quisiera linkearlo estático.

## Por qué es necesario

Si `NetworkContracts` se linkea estático, el binary final de la app tiene **dos copias** del símbolo `RNNetworkRegistry` (una en el módulo Expo, otra en la app del banco). Cada copia mantiene su propio singleton → el host registra el provider en una instancia y el módulo Expo lee la otra → `isAvailable() === false` aunque registraste.

Como dynamic framework, los símbolos viven en una única `.framework` cargada en runtime y el singleton es realmente compartido.

## Cómo se aplica

En `app.json`:

```json
{
  "expo": {
    "plugins": ["@scotia/rn-network"]
  }
}
```

Después correr `npx expo prebuild --clean`. El plugin modifica `ios/Podfile`.

## Validación

En el Podfile generado deberías ver un bloque tipo:

```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'NetworkContracts'
      target.build_configurations.each do |config|
        config.build_settings['MACH_O_TYPE'] = 'mh_dylib'
        # … etc
      end
    end
  end
end
```

Si lo borrás y volvés a `pod install`, el plugin lo regenera en el próximo `prebuild`.

## Troubleshooting

| Síntoma | Causa |
|---|---|
| `isAvailable()` siempre false aunque registraste | NetworkContracts se linkeó estático. Verificar plugin en `app.json` y correr `prebuild --clean`. |
| `duplicate symbols for ...RNNetworkRegistry...` al compilar iOS | Mismo problema, otra cara. Misma solución. |
