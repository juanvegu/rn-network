import { ConfigPlugin, withFinalizedMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

// xcode is a transitive dependency of @expo/config-plugins — always available in Expo projects
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xcode = require('xcode')

type RNNetworkOptions = {
    brownfieldTarget?: string
}

const withRNNetworkExports: ConfigPlugin<RNNetworkOptions> = (
    config,
    options = {}
) => {
    const brownfieldTargetName = options.brownfieldTarget ?? 'ScotiaBrownfield'

    // withFinalizedMod runs AFTER all withXcodeProject mods (including expo-brownfield's).
    // That guarantees the ScotiaBrownfield target already exists in the on-disk pbxproj
    // when our code runs, regardless of plugin order in app.json.
    return withFinalizedMod(config, ['ios', async (config) => {
        const platformProjectRoot = config.modRequest.platformProjectRoot

        // Locate the .xcodeproj folder
        const xcodeprojs = fs.readdirSync(platformProjectRoot)
            .filter((f: string) => f.endsWith('.xcodeproj'))
        if (!xcodeprojs.length) return config

        const pbxprojPath = path.join(
            platformProjectRoot,
            xcodeprojs[0],
            'project.pbxproj'
        )

        // Parse the pbxproj from disk — expo-brownfield has already created ScotiaBrownfield
        const project = xcode.project(pbxprojPath)
        project.parseSync()

        const targetUuid: string | null =
            project.findTargetKey(brownfieldTargetName) ??
            project.findTargetKey(`"${brownfieldTargetName}"`)

        if (!targetUuid) {
            const available = Object.entries(project.pbxNativeTargetSection())
                .filter(([k]: [string, unknown]) => !k.endsWith('_comment'))
                .map(([, t]: [string, any]) => t.name)
                .join(', ')
            throw new Error(
                `[withRNNetworkExports] Target "${brownfieldTargetName}" not found. ` +
                `Available targets: ${available}`
            )
        }

        // Locate the ScotiaBrownfield Sources build phase UUID.
        // We look up the UUID in PBXSourcesBuildPhase directly — the comment varies
        // depending on how the phase was created (expo-brownfield uses the target name,
        // not the generic 'Sources' string).
        const nativeTarget = project.pbxNativeTargetSection()[targetUuid]
        const pbxSources = project.hash.project.objects['PBXSourcesBuildPhase'] ?? {}
        const sourcesBuildPhaseUUID: string | undefined = (nativeTarget?.buildPhases ?? [])
            .find((phase: any) => pbxSources[phase.value] !== undefined)?.value

        if (!sourcesBuildPhaseUUID) {
            throw new Error(
                `[withRNNetworkExports] No Sources build phase found for target "${brownfieldTargetName}"`
            )
        }

        const iosDir = path.join(__dirname, '..', '..', 'ios')
        const files = ['NetworkProvider.swift', 'RNNetworkRegistry.swift']

        files.forEach((file: string) => {
            const src = path.join(iosDir, file)
            const dest = path.join(platformProjectRoot, brownfieldTargetName, file)

            fs.mkdirSync(path.dirname(dest), { recursive: true })
            fs.copyFileSync(src, dest)

            const filePath = `${brownfieldTargetName}/${file}`

            // Add PBXFileReference — returns null if already present
            const fileRef = project.addFile(filePath, undefined)
            const fileRefUUID: string | undefined = fileRef
                ? fileRef.fileRef
                : findExistingFileRef(project, filePath)

            if (!fileRefUUID) return

            // Skip if already in the ScotiaBrownfield Sources build phase
            const sourcesBuildPhase =
                project.hash.project.objects['PBXSourcesBuildPhase'][sourcesBuildPhaseUUID]
            const alreadyInPhase = (sourcesBuildPhase.files as any[]).some(
                (f: any) => f.comment === `${file} in Sources`
            )
            if (alreadyInPhase) return

            // Create PBXBuildFile entry
            const buildFileUUID = project.generateUuid()
            const buildFileComment = `${file} in Sources`

            project.hash.project.objects['PBXBuildFile'][buildFileUUID] = {
                isa: 'PBXBuildFile',
                fileRef: fileRefUUID,
                fileRef_comment: file,
            }
            project.hash.project.objects['PBXBuildFile'][`${buildFileUUID}_comment`] =
                buildFileComment

            // Insert into the correct (ScotiaBrownfield) Sources build phase
            sourcesBuildPhase.files.push({
                value: buildFileUUID,
                comment: buildFileComment,
            })
        })

        // Write the modified pbxproj back to disk
        fs.writeFileSync(pbxprojPath, project.writeSync())

        return config
    }])
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
