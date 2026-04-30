import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

const SPECS_SOURCE = "source 'https://github.com/juanvegu/scotia-podspecs.git'"

const withNetworkContracts: ConfigPlugin = (config) => {
    return withDangerousMod(config, ['ios', (config) => {
        const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
        if (!fs.existsSync(podfilePath)) return config

        let podfile = fs.readFileSync(podfilePath, 'utf-8')
        if (podfile.includes('scotia-podspecs')) return config

        // Prepend private specs source before the default CocoaPods source
        fs.writeFileSync(podfilePath, `${SPECS_SOURCE}\n` + podfile)
        return config
    }])
}

export default withNetworkContracts
