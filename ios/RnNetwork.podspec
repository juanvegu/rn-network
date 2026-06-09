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

  # iOSNetworkContract viaja como xcframework binario dentro de este paquete
  # (ios/iOSNetworkContract.xcframework). Se sincroniza desde el repo de contracts
  # con `rn-network-contracts/scripts/build-and-sync.sh`. La app nativa consume
  # el mismo xcframework por SPM; ambas copias deben ser la MISMA versión para
  # que dyld comparta un único RNNetworkRegistry (un solo singleton).
  s.vendored_frameworks = 'iOSNetworkContract.xcframework'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  # En static linking (use_frameworks! off), CocoaPods agrega el FRAMEWORK_SEARCH_PATHS
  # del xcframework (compila) pero NO propaga el `-framework iOSNetworkContract` al app
  # target (no linkea). Lo forzamos acá para que el binario del contrato se enlace.
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '-framework "iOSNetworkContract"',
    'FRAMEWORK_SEARCH_PATHS' => '"${PODS_XCFRAMEWORKS_BUILD_DIR}/RnNetwork"',
  }

  # OJO: excluir el xcframework de los source_files para que CocoaPods no intente
  # compilar nada adentro — solo lo enlaza vía vendored_frameworks.
  s.source_files = '*.{h,m,mm,swift}'
  s.exclude_files = 'iOSNetworkContract.xcframework/**/*'
end
