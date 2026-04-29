import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

type RNNetworkOptions = {
    brownfieldTarget?: string
}

const withRNNetworkExports: ConfigPlugin<RNNetworkOptions> = (
    config,
    options = {}
) => {
    const brownfieldTargetName = options.brownfieldTarget ?? 'ScotiaBrownfield'

    return withXcodeProject(config, (config) => {
        const projectRoot = config.modRequest.platformProjectRoot
        const project = config.modResults

        // findTargetKey busca target.name exacto; algunos pbxproj guardan el nombre con comillas
        const targetUuid =
            project.findTargetKey(brownfieldTargetName) ??
            project.findTargetKey(`"${brownfieldTargetName}"`)

        if (!targetUuid) {
            const available = Object.entries(project.pbxNativeTargetSection())
                .filter(([k]) => !k.endsWith('_comment'))
                .map(([, t]: [string, any]) => t.name)
                .join(', ')
            throw new Error(
                `[withRNNetworkExports] Target "${brownfieldTargetName}" not found. ` +
                `Available targets: ${available}`
            )
        }

        // __dirname = build/plugin/ → ../../ios apunta a la carpeta ios/ del paquete
        const iosDir = path.join(__dirname, '..', '..', 'ios')
        const groupKey =
            project.findPBXGroupKey({ name: brownfieldTargetName }) ?? undefined

        const files = ['NetworkProvider.swift', 'RNNetworkRegistry.swift']

        files.forEach(file => {
            const src = path.join(iosDir, file)
            const dest = path.join(projectRoot, brownfieldTargetName, file)

            fs.mkdirSync(path.dirname(dest), { recursive: true })
            fs.copyFileSync(src, dest)

            project.addSourceFile(
                `${brownfieldTargetName}/${file}`,
                { target: targetUuid },
                groupKey
            )
        })

        return config
    })
}

export default withRNNetworkExports
