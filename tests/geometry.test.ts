import { describe, expect, it } from 'vitest'
import { borderPxFor, computeLayout, frameFor, hexToRgb, rgbToHex } from '../src/shared/geometry'

describe('frameFor', () => {
  it('garde le petit côté à 1080 pour chaque format', () => {
    expect(frameFor('4x5', 1)).toEqual({ width: 1080, height: 1350 })
    expect(frameFor('3x4', 1)).toEqual({ width: 1080, height: 1440 })
    expect(frameFor('1x1', 1)).toEqual({ width: 1080, height: 1080 })
    expect(frameFor('5x4', 1)).toEqual({ width: 1350, height: 1080 })
  })
  it('double en 2×', () => {
    expect(frameFor('4x5', 2)).toEqual({ width: 2160, height: 2700 })
    expect(frameFor('5x4', 2)).toEqual({ width: 2700, height: 2160 })
  })
})

describe('borderPxFor', () => {
  it('convertit un pourcentage du petit côté', () => {
    expect(borderPxFor(6, { width: 1080, height: 1350 })).toBe(65)
    expect(borderPxFor(6, { width: 1350, height: 1080 })).toBe(65)
    expect(borderPxFor(0, { width: 1080, height: 1080 })).toBe(0)
    expect(borderPxFor(10, { width: 2160, height: 2700 })).toBe(216)
  })
  it('borne à 0..25', () => {
    expect(borderPxFor(-3, { width: 1080, height: 1080 })).toBe(0)
    expect(borderPxFor(40, { width: 1080, height: 1080 })).toBe(270)
  })
})

describe('computeLayout contain', () => {
  it('centre une photo paysage dans un 4:5', () => {
    const l = computeLayout('4x5', 1, 6, 'contain', { width: 6000, height: 4000 })
    expect(l.frame).toEqual({ width: 1080, height: 1350 })
    expect(l.inner).toEqual({ x: 65, y: 65, width: 950, height: 1220 })
    expect(l.dest.width).toBe(950)
    expect(l.dest.height).toBe(633)
    expect(l.dest.x).toBe(65)
    expect(l.dest.y).toBe(65 + Math.round((1220 - 633) / 2))
    expect(l.src).toEqual({ x: 0, y: 0, width: 6000, height: 4000 })
  })
  it('remplit exactement la boîte interne quand le ratio correspond', () => {
    const l = computeLayout('4x5', 1, 6, 'contain', { width: 4000, height: 5000 })
    expect(l.dest.width).toBe(950)
    expect(l.dest.height).toBe(Math.round(5000 * (950 / 4000)))
    expect(l.dest.x).toBe(65)
  })
  it('gère un portrait dans un 5:4', () => {
    const l = computeLayout('5x4', 1, 0, 'contain', { width: 3000, height: 4000 })
    expect(l.frame).toEqual({ width: 1350, height: 1080 })
    expect(l.dest.height).toBe(1080)
    expect(l.dest.width).toBe(810)
    expect(l.dest.x).toBe(270)
  })
})

describe('computeLayout cover', () => {
  it('recadre une photo paysage au centre pour couvrir un 4:5', () => {
    const l = computeLayout('4x5', 1, 6, 'cover', { width: 6000, height: 4000 })
    expect(l.dest).toEqual(l.inner)
    expect(l.src.height).toBe(4000)
    expect(l.src.width).toBe(Math.round(4000 * (950 / 1220)))
    expect(l.src.x).toBe(Math.round((6000 - l.src.width) / 2))
    expect(l.src.y).toBe(0)
  })
  it('recadre verticalement une photo trop haute', () => {
    const l = computeLayout('5x4', 1, 0, 'cover', { width: 3000, height: 4000 })
    expect(l.src.width).toBe(3000)
    expect(l.src.height).toBe(2400)
    expect(l.src.y).toBe(800)
  })
})

describe('couleurs', () => {
  it('convertit hex <-> rgb', () => {
    expect(hexToRgb('#b8532e')).toEqual({ r: 184, g: 83, b: 46 })
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('nope')).toEqual({ r: 255, g: 255, b: 255 })
    expect(rgbToHex(184, 83, 46)).toBe('#b8532e')
  })
})
