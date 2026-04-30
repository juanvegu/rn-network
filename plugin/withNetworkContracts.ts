import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

const SOURCES = [
    "source 'https://github.com/juanvegu/scotia-podspecs.git'",
    "source 'https://cdn.cocoapods.org/'",
].join('\n')

const withNetworkContracts: ConfigPlugin = (config) => {
    return withDangerousMod(config, ['ios', (config) => {
        const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
        if (!fs.existsSync(podfilePath)) return config

        let podfile = fs.readFileSync(podfilePath, 'utf-8')
        if (podfile.includes('scotia-podspecs')) return config

        // Prepend both sources — private first, then public CDN.
        // When sources are declared explicitly CocoaPods only uses those,
        // so the public CDN must also be listed or public pods won't resolve.
        fs.writeFileSync(podfilePath, `${SOURCES}\n` + podfile)
        return config
    }])
}

export default withNetworkContracts
