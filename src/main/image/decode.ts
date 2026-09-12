import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Source prête pour sharp, plus le nettoyage du fichier temporaire éventuel. */
export interface Decodable {
  input: string | Buffer
  cleanup: () => Promise<void>
}

const HEIC_EXTENSIONS = new Set(['.heic', '.heif'])
const noCleanup = async (): Promise<void> => {}

/**
 * Prépare un fichier pour sharp.
 *
 * Vérifié avec sharp 0.35.4 sur macOS arm64 : `metadata()` lit bien un HEIC,
 * mais le décodage complet échoue (« heif: Error while loading plugin: Support
 * for this compression format has not been built in »), les binaires
 * précompilés n'embarquant pas le décodeur HEVC pour raisons de licence.
 * Les HEIC/HEIF passent donc systématiquement par `sips`, présent sur tout
 * macOS, qui applique l'orientation et conserve le profil colorimétrique.
 * Le JPEG temporaire (qualité 100) est supprimé par `cleanup()`.
 */
export async function loadDecodable(path: string, tempRoot: string = tmpdir()): Promise<Decodable> {
  if (!HEIC_EXTENSIONS.has(extname(path).toLowerCase())) return { input: path, cleanup: noCleanup }
  return convertWithSips(path, tempRoot)
}

/** Conversion vers un JPEG temporaire qualité maximale. */
async function convertWithSips(path: string, tempRoot: string): Promise<Decodable> {
  const dir = await mkdtemp(join(tempRoot, 'cadre-'))
  const name = basename(path, extname(path)) || 'image'
  const out = join(dir, `${name}.jpg`)
  const cleanup = async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true })
  }
  try {
    await execFileAsync('sips', [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '100',
      path,
      '--out',
      out
    ])
  } catch (error) {
    await cleanup()
    throw new Error(`Conversion HEIC impossible : ${(error as Error).message}`)
  }
  return { input: out, cleanup }
}
