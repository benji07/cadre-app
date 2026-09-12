import { existsSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { renderInput } from '../src/main/image/render'
import { DEFAULT_SETTINGS } from '../src/shared/types'
import type { ExportJob, ExportOptions, FormatId, Scale, Settings } from '../src/shared/types'

const ADOBE_RGB = '/System/Library/ColorSync/Profiles/AdobeRGB1998.icc'

function job(settings: Partial<Settings> = {}): ExportJob {
  return {
    photoId: 'p1',
    path: '/tmp/source.jpg',
    name: 'source.jpg',
    settings: { ...DEFAULT_SETTINGS, ...settings }
  }
}

function options(over: Partial<ExportOptions> = {}): ExportOptions {
  return { folder: '/tmp', scale: 1, stripExif: true, ...over }
}

/** Image unie. */
function solid(
  width: number,
  height: number,
  rgb: { r: number; g: number; b: number }
): sharp.Sharp {
  return sharp({ create: { width, height, channels: 3, background: rgb } })
}

/** Moitié gauche rouge, moitié droite bleue : permet de détecter une rotation. */
async function halves(width: number, height: number): Promise<Buffer> {
  const left = await solid(Math.round(width / 2), height, { r: 220, g: 20, b: 20 })
    .png()
    .toBuffer()
  const right = await solid(width - Math.round(width / 2), height, { r: 20, g: 20, b: 220 })
    .png()
    .toBuffer()
  return sharp({ create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: Math.round(width / 2), top: 0 }
    ])
    .png()
    .toBuffer()
}

interface Pixels {
  width: number
  height: number
  at: (x: number, y: number) => [number, number, number]
}

async function pixels(buffer: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  return {
    width: info.width,
    height: info.height,
    at: (x, y) => {
      const i = (y * info.width + x) * ch
      return [data[i], data[i + 1], data[i + 2]]
    }
  }
}

function near(
  actual: [number, number, number],
  expected: [number, number, number],
  tol = 12
): void {
  for (let i = 0; i < 3; i++) expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(tol)
}

describe('renderPhoto — dimensions de sortie', () => {
  const cases: [FormatId, Scale, number, number][] = [
    ['4x5', 1, 1080, 1350],
    ['3x4', 1, 1080, 1440],
    ['1x1', 1, 1080, 1080],
    ['5x4', 1, 1350, 1080],
    ['4x5', 2, 2160, 2700]
  ]

  it.each(cases)('%s ×%d → %d × %d', async (format, scale, width, height) => {
    const src = await solid(1200, 800, { r: 120, g: 140, b: 160 }).jpeg().toBuffer()
    const out = await renderInput(src, job({ format }), options({ scale }))
    const meta = await sharp(out).metadata()
    expect([meta.width, meta.height]).toEqual([width, height])
  })
})

describe('bordure', () => {
  it('6 % de 1080 = 65 px : coin à la couleur de bordure, boîte interne remplie par la photo', async () => {
    // Source au ratio exact de la boîte interne (950 × 1220) : dest == inner.
    const src = await solid(950, 1220, { r: 10, g: 200, b: 90 }).png().toBuffer()
    const out = await renderInput(
      src,
      job({ format: '4x5', borderPercent: 6, borderColor: '#ff00ff', fit: 'contain' }),
      options()
    )
    const p = await pixels(out)
    expect([p.width, p.height]).toEqual([1080, 1350])
    near(p.at(0, 0), [255, 0, 255])
    near(p.at(1079, 1349), [255, 0, 255])
    near(p.at(64, 675), [255, 0, 255])
    near(p.at(65, 675), [10, 200, 90])
    near(p.at(540, 675), [10, 200, 90])
  })

  it('0 % : pas de bordure mais des marges de ratio de la couleur choisie', async () => {
    const src = await solid(1000, 1000, { r: 0, g: 0, b: 0 }).png().toBuffer()
    const out = await renderInput(
      src,
      job({ format: '4x5', borderPercent: 0, borderColor: '#ffffff' }),
      options()
    )
    const p = await pixels(out)
    near(p.at(540, 2), [255, 255, 255])
    near(p.at(540, 675), [0, 0, 0])
  })
})

describe('orientation EXIF', () => {
  it('applique une orientation 6 : le paysage 1200 × 800 devient un portrait 800 × 1200', async () => {
    const flat = await halves(1200, 800)
    const src = await sharp(flat).withMetadata({ orientation: 6 }).jpeg({ quality: 100 }).toBuffer()

    const out = await renderInput(
      src,
      job({ format: '1x1', borderPercent: 0, borderColor: '#00ff00', fit: 'contain' }),
      options()
    )
    const p = await pixels(out)
    expect([p.width, p.height]).toEqual([1080, 1080])
    // 800 × 1200 dans 1080 × 1080 → dest 720 × 1080, centré en x = 180.
    near(p.at(10, 540), [0, 255, 0]) // marge latérale
    near(p.at(1070, 540), [0, 255, 0])
    near(p.at(540, 200), [220, 20, 20]) // gauche rouge → haut après rotation horaire
    near(p.at(540, 880), [20, 20, 220]) // droite bleue → bas
  })

  it('laisse un portrait natif intact', async () => {
    const src = await solid(800, 1200, { r: 200, g: 30, b: 30 }).png().toBuffer()
    const out = await renderInput(src, job({ format: '3x4', borderPercent: 0 }), options())
    const meta = await sharp(out).metadata()
    expect([meta.width, meta.height]).toEqual([1080, 1440])
  })
})

describe('cadrage « remplir »', () => {
  it('ne laisse aucun pixel de bordure dans la boîte interne', async () => {
    const src = await halves(1200, 800)
    const out = await renderInput(
      src,
      job({ format: '4x5', borderPercent: 6, borderColor: '#00ff00', fit: 'cover' }),
      options()
    )
    const p = await pixels(out)
    const border = 65
    for (let y = border + 2; y < 1350 - border - 2; y += 37) {
      for (let x = border + 2; x < 1080 - border - 2; x += 37) {
        const [r, g, b] = p.at(x, y)
        expect(g - r > 120 && g - b > 120).toBe(false)
      }
    }
    // La bordure est bien présente à l'extérieur.
    near(p.at(2, 2), [0, 255, 0])
  })
})

describe('métadonnées', () => {
  const withExif = async (): Promise<Buffer> =>
    sharp({ create: { width: 900, height: 900, channels: 3, background: { r: 90, g: 90, b: 90 } } })
      .withExif({
        IFD0: { Make: 'CadreTest', Model: 'Modele9' },
        IFD2: { DateTimeOriginal: '2024:05:06 07:08:09', FNumber: '28/10', ISOSpeedRatings: '200' },
        IFD3: { GPSDateStamp: '2020:01:02', GPSLatitudeRef: 'N' }
      })
      .jpeg()
      .toBuffer()

  it('supprime les EXIF par défaut', async () => {
    const out = await renderInput(await withExif(), job(), options({ stripExif: true }))
    const meta = await sharp(out).metadata()
    expect(meta.exif).toBeUndefined()
  })

  it('conserve la liste blanche sans GPS quand on demande de garder les EXIF', async () => {
    const src = await withExif()
    expect((await sharp(src).metadata()).exif?.toString('latin1')).toContain('2020:01:02')

    const out = await renderInput(src, job(), options({ stripExif: false }))
    const meta = await sharp(out).metadata()
    expect(meta.exif).toBeDefined()
    const text = meta.exif!.toString('latin1')
    expect(text).toContain('CadreTest')
    expect(text).toContain('Modele9')
    expect(text).toContain('2024:05:06 07:08:09')
    expect(text).not.toContain('2020:01:02')
  })
})

describe('profil colorimétrique', () => {
  const run = existsSync(ADOBE_RGB) ? it : it.skip

  run('convertit une entrée non sRGB et annonce un profil sRGB', async () => {
    // sharp convertit les pixels vers AdobeRGB en attachant le profil : les octets
    // stockés (≈ 172, 44, 43) diffèrent donc de la couleur sRGB demandée.
    const src = await solid(1000, 1000, { r: 200, g: 40, b: 40 })
      .withIccProfile(ADOBE_RGB)
      .jpeg({ quality: 100 })
      .toBuffer()
    const stored = await sharp(src, { ignoreIcc: true }).raw().toBuffer()
    expect(stored[0]).toBeLessThan(190)

    const out = await renderInput(src, job({ format: '1x1', borderPercent: 0 }), options())
    const meta = await sharp(out).metadata()
    if (meta.icc) {
      // La description ICC est en UTF-16 : on retire les octets nuls avant de chercher « sRGB ».
      const description = meta.icc.toString('latin1').replace(/\0/g, '')
      expect(description).toMatch(/sRGB/i)
      expect(description).not.toMatch(/Adobe RGB/i)
    }
    // Les pixels de sortie sont revenus aux valeurs sRGB d'origine : la conversion a bien eu lieu.
    const p = await pixels(out)
    near(p.at(540, 540), [200, 40, 40], 6)
  })
})
