import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

const withRNNetworkExports: ConfigPlugin = (config) => {
    return withXcodeProject(config, (config) => {
        const projectRoot = config.modRequest.platformProjectRoot
        const projectName = config.modRequest.projectName!
        const iosDir = path.join(__dirname, '..', '..', 'ios')

        const files = [
            'NetworkProvider.swift',
            'RNNetworkRegistry.swift',
        ]

        const project = config.modResults

        files.forEach(file => {
            const src = path.join(iosDir, file)
            const dest = path.join(projectRoot, projectName, file)

            fs.copyFileSync(src, dest)

            const groupKey = project.findPBXGroupKey({ name: projectName }) ?? undefined
            project.addSourceFile(
                `${projectName}/${file}`,
                { target: project.getFirstTarget().uuid },
                groupKey
            )
        })

        return config
    })
}

export default withRNNetworkExports
