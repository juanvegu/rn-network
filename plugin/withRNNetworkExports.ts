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

        // Find the ScotiaBrownfield Sources build phase UUID directly from the target object.
        // We bypass addSourceFile() because when no PBXGroup is named after the target,
        // addSourceFile falls back to addPluginFile(), which makes buildPhase() return
        // undefined and buildPhaseObject() fall back to the first Sources phase (main app).
        const nativeTarget = project.pbxNativeTargetSection()[targetUuid]
        const sourcesBuildPhaseUUID: string | undefined = (nativeTarget?.buildPhases ?? [])
            .find((phase: any) => phase.comment === 'Sources')?.value

        if (!sourcesBuildPhaseUUID) {
            throw new Error(
                `[withRNNetworkExports] No Sources build phase found for target "${brownfieldTargetName}"`
            )
        }

        const iosDir = path.join(__dirname, '..', '..', 'ios')
        const files = ['NetworkProvider.swift', 'RNNetworkRegistry.swift']

        files.forEach(file => {
            const src = path.join(iosDir, file)
            const dest = path.join(projectRoot, brownfieldTargetName, file)

            fs.mkdirSync(path.dirname(dest), { recursive: true })
            fs.copyFileSync(src, dest)

            const filePath = `${brownfieldTargetName}/${file}`

            // addFile only creates PBXFileReference + group entry — no build phase side effects.
            // Returns null if the file reference already exists.
            const fileRef = project.addFile(filePath, undefined)
            const fileRefUUID: string | undefined = fileRef
                ? fileRef.fileRef
                : findExistingFileRef(project, filePath)

            if (!fileRefUUID) return

            // Skip if already present in the ScotiaBrownfield Sources build phase.
            const sourcesBuildPhase =
                project.hash.project.objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUUID]
            const alreadyInPhase = (sourcesBuildPhase.files as any[]).some(
                (f: any) => f.comment === `${file} in Sources`
            )
            if (alreadyInPhase) return

            // Create the PBXBuildFile entry.
            const buildFileUUID = project.generateUuid()
            const buildFileComment = `${file} in Sources`

            project.hash.project.objects['PBXBuildFile'][buildFileUUID] = {
                isa: 'PBXBuildFile',
                fileRef: fileRefUUID,
                fileRef_comment: file,
            }
            project.hash.project.objects['PBXBuildFile'][`${buildFileUUID}_comment`] =
                buildFileComment

            // Add to the correct (ScotiaBrownfield) Sources build phase.
            sourcesBuildPhase.files.push({
                value: buildFileUUID,
                comment: buildFileComment,
            })
        })

        return config
    })
}

function findExistingFileRef(project: any, filePath: string): string | undefined {
    const refs = project.hash.project.objects['PBXFileReference']
    for (const key of Object.keys(refs)) {
        if (key.endsWith('_comment')) continue
        const ref = refs[key]
        if (ref.path === filePath || ref.path === `"${filePath}"`) return key
    }
    return undefined
}

export default withRNNetworkExports
