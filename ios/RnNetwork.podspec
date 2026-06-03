require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RnNetwork'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = false

  s.dependency 'ExpoModulesCore'

  # NetworkContracts viaja como xcframework binario dentro de este paquete
  # (ios/NetworkContracts.xcframework). Se sincroniza desde el repo de contracts
  # con `rn-network-contracts/scripts/build-and-sync.sh`. La app nativa consume
  # el mismo xcframework por SPM; ambas copias deben ser la MISMA versión para
  # que dyld comparta un único RNNetworkRegistry (un solo singleton).
  s.vendored_frameworks = 'NetworkContracts.xcframework'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  # OJO: excluir el xcframework de los source_files para que CocoaPods no intente
  # compilar nada adentro — solo lo enlaza vía vendored_frameworks.
  s.source_files = '*.{h,m,mm,swift}'
  s.exclude_files = 'NetworkContracts.xcframework/**/*'
end
