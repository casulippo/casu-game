import { describe, expect, it } from 'vitest'
import {
  FERMO,
  RAGGIO_LEVETTA,
  ZONA_MORTA,
  posizioneLevetta,
  spinta,
} from './joystick'

const centro = { x: 100, y: 100 }

describe('spinta', () => {
  it('resta ferma col dito sul centro', () => {
    expect(spinta(centro, centro)).toEqual(FERMO)
  })

  it('ignora i micro-movimenti dentro la zona morta', () => {
    const dito = { x: centro.x + RAGGIO_LEVETTA * ZONA_MORTA * 0.5, y: centro.y }
    expect(spinta(centro, dito)).toEqual(FERMO)
  })

  it('si attiva appena fuori dalla zona morta', () => {
    const dito = { x: centro.x + RAGGIO_LEVETTA * ZONA_MORTA * 1.5, y: centro.y }
    expect(spinta(centro, dito).intensita).toBeGreaterThan(0)
  })

  it('restituisce un versore, qualunque sia la distanza', () => {
    const dito = { x: centro.x + 200, y: centro.y + 200 }
    const s = spinta(centro, dito)
    expect(Math.hypot(s.x, s.y)).toBeCloseTo(1)
  })

  it('e al massimo a fondo corsa e non oltre', () => {
    const aFondo = spinta(centro, { x: centro.x + RAGGIO_LEVETTA, y: centro.y })
    const oltre = spinta(centro, { x: centro.x + RAGGIO_LEVETTA * 3, y: centro.y })
    expect(aFondo.intensita).toBeCloseTo(1)
    expect(oltre.intensita).toBeCloseTo(1)
  })

  it('a meta corsa da meta intensita', () => {
    const dito = { x: centro.x + RAGGIO_LEVETTA / 2, y: centro.y }
    expect(spinta(centro, dito).intensita).toBeCloseTo(0.5)
  })

  it('punta nella direzione del dito', () => {
    const suADestra = spinta(centro, { x: centro.x + 50, y: centro.y - 50 })
    expect(suADestra.x).toBeGreaterThan(0)
    expect(suADestra.y).toBeLessThan(0)
  })
})

describe('posizioneLevetta', () => {
  it('segue il dito dentro la corsa', () => {
    const dito = { x: centro.x + 20, y: centro.y - 10 }
    expect(posizioneLevetta(centro, dito)).toEqual({ x: 20, y: -10 })
  })

  it('resta agganciata al bordo se il dito va oltre', () => {
    const dito = { x: centro.x + 500, y: centro.y }
    const p = posizioneLevetta(centro, dito)
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(RAGGIO_LEVETTA)
  })
})
