import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

const SOURCES = [
    "source 'https://github.com/juanvegu/scotia-podspecs.git'",
    "source 'https://cdn.cocoapods.org/'",
].join('\n')

const PRE_INSTALL_HOOK = `
# Forzar NetworkContracts a dynamic framework
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name == 'NetworkContracts'
      def pod.build_type
        Pod::BuildType.dynamic_framework
      end
    end
  end
end
`

const withNetworkContracts: ConfigPlugin = (config) => {
    return withDangerousMod(config, ['ios', (config) => {
        const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
        if (!fs.existsSync(podfilePath)) return config

        let podfile = fs.readFileSync(podfilePath, 'utf-8')

        const sourcesAlreadyPresent =
            podfile.includes('scotia-podspecs') &&
            podfile.includes('cdn.cocoapods.org')

        if (!sourcesAlreadyPresent) {
            podfile = `${SOURCES}\n${podfile}`
        }

        const hookAlreadyPresent = podfile.includes("pod.name == 'NetworkContracts'")

        if (!hookAlreadyPresent) {
            podfile = podfile.replace(
                /^target ['"][^'"]+['"] do/m,
                `${PRE_INSTALL_HOOK}\n$&`
            )
        }

        fs.writeFileSync(podfilePath, podfile)
        return config
    }])
}

export default withNetworkContracts