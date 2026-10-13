import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { Sovraimpressione } from './Campo2D'
import { PORTIERE_CASA, PORTIERE_OSPITE, type Divisa } from './colori'
import { creaAnimatore } from './animazione'
import { LARGHEZZA, LUNGHEZZA, statoScena, type Scena, type Stato } from './scena'

const PELLI = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a0673a']
// Giocatori un po' più grandi del vero: dalla tribuna devono restare leggibili.
const SCALA = 1.6

// Coordinate campo (metri, origine nell'angolo) -> scena 3D (origine al centro, y verso l'alto).
const aX = (x: number) => x - LUNGHEZZA / 2
const aZ = (y: number) => y - LARGHEZZA / 2

interface Pupazzo {
  gruppo: THREE.Group
  gambe: [THREE.Group, THREE.Group]
  braccia: [THREE.Group, THREE.Group]
  ombra: THREE.Mesh
  anello: THREE.Mesh
  cartellino: THREE.Mesh
  fase: number
}

function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function texturePrato(): THREE.CanvasTexture {
  const px = 10
  const c = document.createElement('canvas')
  c.width = LUNGHEZZA * px
  c.height = LARGHEZZA * px
  const g = c.getContext('2d')!
  for (let i = 0; i < 14; i++) {
    g.fillStyle = i % 2 ? '#2f7d3a' : '#378c43'
    g.fillRect((c.width / 14) * i, 0, c.width / 14 + 1, c.height)
  }
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = 0.14 * px
  const rett = (x: number, y: number, w: number, h: number) => g.strokeRect(x * px, y * px, w * px, h * px)
  rett(0.1, 0.1, LUNGHEZZA - 0.2, LARGHEZZA - 0.2)
  g.beginPath()
  g.moveTo((LUNGHEZZA / 2) * px, 0)
  g.lineTo((LUNGHEZZA / 2) * px, c.height)
  g.stroke()
  g.beginPath()
  g.arc((LUNGHEZZA / 2) * px, (LARGHEZZA / 2) * px, 9.15 * px, 0, Math.PI * 2)
  g.stroke()
  for (const lato of [0, 1]) {
    const x = (d: number) => (lato === 0 ? 0 : LUNGHEZZA - d)
    rett(x(16.5), (LARGHEZZA - 40.32) / 2, 16.5, 40.32)
    rett(x(5.5), (LARGHEZZA - 18.32) / 2, 5.5, 18.32)
    const dischetto = lato === 0 ? 11 : LUNGHEZZA - 11
    g.beginPath()
    g.arc(dischetto * px, (LARGHEZZA / 2) * px, 9.15 * px, lato === 0 ? -0.93 : Math.PI - 0.93, lato === 0 ? 0.93 : Math.PI + 0.93)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function creaPupazzo(divisa: Divisa, id: string): Pupazzo {
  const lambert = (colore: string) => new THREE.MeshLambertMaterial({ color: colore })
  const maglia = lambert(divisa.maglia)
  const dettaglio = lambert(divisa.dettaglio)
  const pelle = lambert(PELLI[hash(id) % PELLI.length])
  const scarpe = lambert('#151515')
  const cubo = (w: number, h: number, d: number, m: THREE.Material, y: number, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    mesh.position.set(0, y, z)
    return mesh
  }
  const gruppo = new THREE.Group()
  gruppo.add(cubo(0.5, 0.62, 0.28, maglia, 1.22))
  gruppo.add(cubo(0.52, 0.24, 0.3, dettaglio, 0.84))
  const testa = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), pelle)
  testa.position.y = 1.72
  gruppo.add(testa)
  const gamba = (lato: number) => {
    const g = new THREE.Group()
    g.position.set(lato * 0.13, 0.8, 0)
    g.add(cubo(0.15, 0.36, 0.15, pelle, -0.2))
    g.add(cubo(0.15, 0.38, 0.15, maglia, -0.57))
    g.add(cubo(0.16, 0.08, 0.27, scarpe, -0.78, 0.05))
    gruppo.add(g)
    return g
  }
  const braccio = (lato: number) => {
    const g = new THREE.Group()
    g.position.set(lato * 0.32, 1.48, 0)
    g.add(cubo(0.13, 0.2, 0.13, maglia, -0.1))
    g.add(cubo(0.11, 0.38, 0.11, pelle, -0.38))
    gruppo.add(g)
    return g
  }
  const piatto = (raggio: number, colore: string, opacita: number) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(raggio, 24),
      new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: opacita, depthWrite: false }),
    )
    m.rotation.x = -Math.PI / 2
    return m
  }
  const ombra = piatto(0.45, '#000000', 0.3)
  ombra.position.y = 0.02
  const anello = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.78, 32),
    new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.9, depthWrite: false }),
  )
  anello.rotation.x = -Math.PI / 2
  anello.position.y = 0.03
  const cartellino = cubo(0.22, 0.3, 0.02, new THREE.MeshBasicMaterial({ color: '#facc15' }), 2.25)
  gruppo.add(cartellino)
  gruppo.scale.setScalar(SCALA)
  return { gruppo, gambe: [gamba(-1), gamba(1)], braccia: [braccio(-1), braccio(1)], ombra, anello, cartellino, fase: 0 }
}

function webglDisponibile(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

function libera(radice: THREE.Object3D) {
  radice.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.geometry.dispose()
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      ;(m as THREE.MeshLambertMaterial).map?.dispose()
      m.dispose()
    }
  })
}

function creaPorta(lato: -1 | 1): THREE.Group {
  const porta = new THREE.Group()
  const bianco = new THREE.MeshLambertMaterial({ color: '#ffffff' })
  const palo = (z: number) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.44, 10), bianco)
    m.position.set(0, 1.22, z)
    porta.add(m)
  }
  palo(-3.66)
  palo(3.66)
  const traversa = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.32, 10), bianco)
  traversa.rotation.x = Math.PI / 2
  traversa.position.y = 2.44
  porta.add(traversa)
  const rete = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.44), rete)
  fondo.rotation.y = Math.PI / 2
  fondo.position.set(lato * 2, 1.22, 0)
  porta.add(fondo)
  const tetto = new THREE.Mesh(new THREE.PlaneGeometry(2, 7.32), rete)
  tetto.rotation.x = -Math.PI / 2
  tetto.position.set(lato, 2.44, 0)
  porta.add(tetto)
  for (const z of [-3.66, 3.66]) {
    const fianco = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.44), rete)
    fianco.position.set(lato, 1.22, z)
    porta.add(fianco)
  }
  porta.position.x = aX(lato === 1 ? LUNGHEZZA : 0)
  return porta
}

export default function Campo3D({
  scena,
  tempo,
  ritmo,
  divise,
  nomi,
}: {
  scena: Scena
  tempo: RefObject<number>
  ritmo: RefObject<number | null>
  divise: { casa: Divisa; ospite: Divisa }
  nomi: Record<string, string>
}) {
  const contenitore = useRef<HTMLDivElement>(null)
  const scenaRef = useRef(scena)
  const [sovra, setSovra] = useState<Stato>(() => statoScena(scena, tempo.current))
  const [supportato] = useState(webglDisponibile)

  useEffect(() => {
    scenaRef.current = scena
  }, [scena])

  useEffect(() => {
    const el = contenitore.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    el.appendChild(renderer.domElement)

    const mondo = new THREE.Scene()
    mondo.background = new THREE.Color('#0d1b2a')
    mondo.fog = new THREE.Fog('#0d1b2a', 90, 190)
    mondo.add(new THREE.HemisphereLight('#ffffff', '#2a4a2a', 1.6))
    const sole = new THREE.DirectionalLight('#ffffff', 1.8)
    sole.position.set(-30, 60, 25)
    mondo.add(sole)

    const prato = new THREE.Mesh(new THREE.PlaneGeometry(LUNGHEZZA, LARGHEZZA), new THREE.MeshLambertMaterial({ map: texturePrato() }))
    prato.rotation.x = -Math.PI / 2
    mondo.add(prato)
    const bordo = new THREE.Mesh(new THREE.PlaneGeometry(LUNGHEZZA + 30, LARGHEZZA + 26), new THREE.MeshLambertMaterial({ color: '#25602f' }))
    bordo.rotation.x = -Math.PI / 2
    bordo.position.y = -0.02
    mondo.add(bordo)
    mondo.add(creaPorta(-1), creaPorta(1))

    // Cartelloni e tribune: blocchi semplici, quanto basta per dare l'idea dello stadio.
    const cartellone = new THREE.MeshLambertMaterial({ color: '#1e3a8a', emissive: '#0b1640' })
    const tribuna = new THREE.MeshLambertMaterial({ color: '#334155' })
    const blocco = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
      b.position.set(x, y, z)
      mondo.add(b)
    }
    blocco(LUNGHEZZA + 8, 0.9, 0.2, cartellone, 0, 0.45, -LARGHEZZA / 2 - 4)
    blocco(0.2, 0.9, LARGHEZZA + 8, cartellone, -LUNGHEZZA / 2 - 4, 0.45, 0)
    blocco(0.2, 0.9, LARGHEZZA + 8, cartellone, LUNGHEZZA / 2 + 4, 0.45, 0)
    for (let i = 0; i < 6; i++) {
      blocco(LUNGHEZZA + 30, 1.6, 2.4, tribuna, 0, 1.2 + i * 1.6, -LARGHEZZA / 2 - 10 - i * 2.4)
      blocco(2.4, 1.6, LARGHEZZA + 26, tribuna, -LUNGHEZZA / 2 - 13 - i * 2.4, 1.2 + i * 1.6, 0)
      blocco(2.4, 1.6, LARGHEZZA + 26, tribuna, LUNGHEZZA / 2 + 13 + i * 2.4, 1.2 + i * 1.6, 0)
    }

    const palla = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshLambertMaterial({ color: '#ffffff' }))
    mondo.add(palla)
    const ombraPalla = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 20),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
    )
    ombraPalla.rotation.x = -Math.PI / 2
    ombraPalla.position.y = 0.02
    mondo.add(ombraPalla)

    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 400)
    let camX = 0
    const anima = creaAnimatore()
    const pupazzi = new Map<string, Pupazzo>()

    const ridimensiona = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const osservatore = new ResizeObserver(ridimensiona)
    osservatore.observe(el)
    ridimensiona()

    let ultimo = performance.now()
    let ultimaSovra = 0
    let frame = requestAnimationFrame(function passo(ora) {
      const dt = Math.max(0, Math.min(0.1, (ora - ultimo) / 1000))
      ultimo = ora
      const { stato, movimenti } = anima(scenaRef.current, tempo.current, dt, ora / 1000, ritmo.current ?? 1)
      const presenti = new Set<string>()

      for (const g of stato.giocatori) {
        presenti.add(g.id)
        let p = pupazzi.get(g.id)
        if (!p) {
          const divisa = g.ruolo === 'Goalkeeper' ? (g.casa ? PORTIERE_CASA : PORTIERE_OSPITE) : g.casa ? divise.casa : divise.ospite
          p = creaPupazzo(divisa, g.id)
          mondo.add(p.gruppo, p.ombra, p.anello)
          pupazzi.set(g.id, p)
        }
        const { dx: vx, dy: vy } = movimenti.get(g.id) ?? { dx: 0, dy: 0 }
        const velocita = Math.hypot(vx, vy) / Math.max(dt, 0.001)
        const mira =
          velocita > 0.6 ? Math.atan2(vx, vy) : Math.atan2(stato.palla.x - g.x, stato.palla.y - g.y)
        let delta = mira - p.gruppo.rotation.y
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        p.gruppo.rotation.y += delta * Math.min(1, dt * 8)
        p.fase += Math.min(velocita, 12) * dt * 1.8
        const ampiezza = Math.min(0.9, velocita * 0.12)
        const oscilla = Math.sin(p.fase) * ampiezza
        p.gambe[0].rotation.x = oscilla
        p.gambe[1].rotation.x = -oscilla
        p.braccia[0].rotation.x = -oscilla * 0.8
        p.braccia[1].rotation.x = oscilla * 0.8
        p.gruppo.position.set(aX(g.x), 0, aZ(g.y))
        p.ombra.position.set(aX(g.x), 0.02, aZ(g.y))
        p.anello.position.set(aX(g.x), 0.03, aZ(g.y))
        p.anello.visible = g.conPalla
        p.cartellino.visible = g.giallo
      }
      for (const [id, p] of pupazzi) {
        if (presenti.has(id)) continue
        mondo.remove(p.gruppo, p.ombra, p.anello)
        for (const o of [p.gruppo, p.ombra, p.anello]) libera(o)
        pupazzi.delete(id)
      }

      palla.position.set(aX(stato.palla.x), 0.28 + stato.palla.h, aZ(stato.palla.y))
      ombraPalla.position.set(aX(stato.palla.x), 0.02, aZ(stato.palla.y))
      camX += (aX(stato.palla.x) * 0.8 - camX) * (1 - Math.exp(-dt * 1.8))
      camera.position.set(camX, 26, 55)
      camera.lookAt(camX, 0, 4)
      renderer.render(mondo, camera)

      if (ora - ultimaSovra > 100) {
        ultimaSovra = ora
        setSovra(stato)
      }
      frame = requestAnimationFrame(passo)
    })

    return () => {
      cancelAnimationFrame(frame)
      osservatore.disconnect()
      libera(mondo)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [divise, tempo, ritmo])

  if (!supportato) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 p-4 text-center text-sm text-slate-400">
        Il 3D non è supportato da questo browser: usa il campo 2D.
      </div>
    )
  }
  const portatore = sovra.giocatori.find((g) => g.conPalla)
  return (
    <div className="relative">
      <div ref={contenitore} className="aspect-video max-h-[70dvh] w-full overflow-hidden rounded-xl bg-slate-900" />
      <Sovraimpressione stato={sovra} nomi={nomi} portatore={portatore?.nome} />
    </div>
  )
}
