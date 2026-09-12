import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { outputName, runExport } from '../src/main/export'
import { DEFAULT_SETTINGS } from '../src/shared/types'
import type { ExportJob, ExportOptions } from '../src/shared/types'

const run = promisify(execFile)
const HAS_SIPS = existsSync('/usr/bin/sips')

let work: string
let out: string

function gradient(w: number, h: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g"><stop offset="0" stop-color="#6f8fae"/><stop offset="1" stop-color="#3f4d3c"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
  )
}

function options(over: Partial<ExportOptions> = {}): ExportOptions {
  return { folder: out, scale: 1, stripExif: true, ...over }
}

function job(path: string, id = path): ExportJob {
  return {
    photoId: id,
    path,
    name: basename(path),
    settings: { ...DEFAULT_SETTINGS }
  }
}

beforeAll(async () => {
  work = await mkdtemp(join(tmpdir(), 'cadre-export-'))
  out = join(work, 'out')
  await sharp(gradient(1200, 800)).jpeg().toFile(join(work, 'DSC_0412.jpg'))
  await sharp(gradient(800, 1200)).png().toFile(join(work, 'IMG_2201.png'))
  if (HAS_SIPS) {
    await run('/usr/bin/sips', [
      '-s',
      'format',
      'heic',
      join(work, 'DSC_0412.jpg'),
      '--out',
      join(work, 'IMG_2207.heic')
    ])
  }
})

afterAll(async () => {
  await rm(work, { recursive: true, force: true })
})

describe('outputName', () => {
  it('ajoute le suffixe du format', () => {
    expect(outputName(job('/x/DSC_0412.jpg'))).toBe('DSC_0412_4x5.jpg')
    expect(
      outputName({ ...job('/x/IMG.heic'), settings: { ...DEFAULT_SETTINGS, format: '5x4' } })
    ).toBe('IMG_5x4.jpg')
  })
})

describe('runExport', () => {
  it('exporte un lot complet, HEIC compris, sans écraser les fichiers existants', async () => {
    const jobs = [job(join(work, 'DSC_0412.jpg')), job(join(work, 'IMG_2201.png'))]
    if (HAS_SIPS) jobs.push(job(join(work, 'IMG_2207.heic')))
    const progress: number[] = []
    const first = await runExport(
      jobs,
      options(),
      (p) => progress.push(p.index),
      () => false,
      work
    )
    expect(first.failed).toEqual([])
    expect(first.cancelled).toBe(false)
    expect(first.done).toHaveLength(jobs.length)
    expect(progress).toEqual(jobs.map((_, i) => i + 1))
    for (const d of first.done) {
      const meta = await sharp(d.outputPath).metadata()
      expect([meta.width, meta.height]).toEqual([1080, 1350])
      expect(meta.exif).toBeUndefined()
    }
    const second = await runExport(
      jobs.slice(0, 1),
      options(),
      () => {},
      () => false,
      work
    )
    expect(second.done[0].outputPath.endsWith('DSC_0412_4x5-2.jpg')).toBe(true)
    const files = await readdir(out)
    expect(files.filter((f) => f.startsWith('DSC_0412_4x5'))).toHaveLength(2)
  })

  it('signale un fichier illisible et continue le lot', async () => {
    const jobs = [job(join(work, 'nope.jpg')), job(join(work, 'IMG_2201.png'))]
    const r = await runExport(
      jobs,
      options(),
      () => {},
      () => false,
      work
    )
    expect(r.failed).toHaveLength(1)
    expect(r.failed[0].photoId).toBe(join(work, 'nope.jpg'))
    expect(r.done).toHaveLength(1)
  })

  it("s'arrête après la photo en cours quand on annule", async () => {
    const jobs = [job(join(work, 'DSC_0412.jpg')), job(join(work, 'IMG_2201.png'))]
    let calls = 0
    const r = await runExport(
      jobs,
      options(),
      () => {},
      () => calls++ >= 1,
      work
    )
    expect(r.cancelled).toBe(true)
    expect(r.done.length).toBeLessThan(2)
  })
})
