import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FastForward, Play, Rewind, SkipForward } from 'lucide-react'
import type { Entrada } from '@shared/types'
import { leerLocal, guardarLocal, urlArchivo } from '@/lib/util'

const escribiendo = (): boolean => {
  const a = document.activeElement as HTMLElement | null
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)
}

/**
 * Anterior / siguiente entre los archivos del mismo tipo de la carpeta (gameplays, capturas, modelos…).
 * Teclas: Alt+← / Alt+→ o RePág / AvPág, y ← / → cuando no se está escribiendo ni con un vídeo enfocado.
 */
export function Navegacion({ e, hermanos, abrir }: { e: Entrada; hermanos: Entrada[]; abrir: (r: string) => void }): React.JSX.Element | null {
  const lista = hermanos.filter((h) => h.clase === e.clase)
  const i = lista.findIndex((h) => h.ruta === e.ruta)
  const ant = i > 0 ? lista[i - 1] : null
  const sig = i >= 0 && i < lista.length - 1 ? lista[i + 1] : null
  useEffect(() => {
    const k = (ev: KeyboardEvent): void => {
      if (escribiendo()) return
      const enVideo = (document.activeElement as HTMLElement | null)?.tagName === 'VIDEO'
      const atras = ev.key === 'PageUp' || (ev.key === 'ArrowLeft' && (ev.altKey || !enVideo))
      const alante = ev.key === 'PageDown' || (ev.key === 'ArrowRight' && (ev.altKey || !enVideo))
      if (atras && ant) {
        ev.preventDefault()
        abrir(ant.ruta)
      } else if (alante && sig) {
        ev.preventDefault()
        abrir(sig.ruta)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [ant, sig, abrir])
  if (lista.length < 2) return null
  return (
    <div className="navegacion">
      <button className="btn chico" disabled={!ant} onClick={() => ant && abrir(ant.ruta)} title={ant ? `${ant.titulo ?? ant.nombre} (←)` : ''}>
        <ChevronLeft size={15} /> Anterior
      </button>
      <span className="muted pequeno">
        {i + 1} de {lista.length}
      </span>
      <button className="btn chico" disabled={!sig} onClick={() => sig && abrir(sig.ruta)} title={sig ? `${sig.titulo ?? sig.nombre} (→)` : ''}>
        Siguiente <ChevronRight size={15} />
      </button>
    </div>
  )
}

const VELOCIDADES = [0.5, 1, 1.5, 2, 4]
const fmt = (s: number): string => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––')

/** Reproductor de gameplays: saltos de ±10 s, velocidad, seguir con el siguiente y lista de la carpeta. */
export function VideoVista({ e, hermanos, abrir }: { e: Entrada; hermanos: Entrada[]; abrir: (r: string) => void }): React.JSX.Element {
  const v = useRef<HTMLVideoElement>(null)
  const [vel, setVel] = useState(1)
  const [seguir, setSeguir] = useState(leerLocal('estudio:seguir-video') === '1')
  const [dur, setDur] = useState<Record<string, number>>({})
  const lista = hermanos.filter((h) => h.clase === 'video')
  const i = lista.findIndex((h) => h.ruta === e.ruta)
  const sig = i >= 0 && i < lista.length - 1 ? lista[i + 1] : null

  useEffect(() => {
    if (v.current) v.current.playbackRate = vel
  }, [vel, e.ruta])
  const saltar = (s: number): void => {
    if (v.current) v.current.currentTime = Math.max(0, Math.min(v.current.duration || 0, v.current.currentTime + s))
  }
  // J / L: ±10 s; K o espacio fuera del vídeo: pausa
  useEffect(() => {
    const k = (ev: KeyboardEvent): void => {
      if (escribiendo() || !v.current) return
      if (ev.key === 'j' || ev.key === 'J') saltar(-10)
      else if (ev.key === 'l' || ev.key === 'L') saltar(10)
      else if (ev.key === 'k' || ev.key === 'K' || (ev.key === ' ' && document.activeElement?.tagName !== 'VIDEO')) {
        ev.preventDefault()
        if (v.current.paused) void v.current.play()
        else v.current.pause()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <div className="video-vista">
      <video
        key={e.ruta}
        ref={v}
        className="video-grande"
        controls
        autoPlay={seguir}
        src={urlArchivo(e.ruta, e.mtime)}
        onLoadedMetadata={(x) => {
          x.currentTarget.playbackRate = vel
          const d = x.currentTarget.duration
          setDur((m) => ({ ...m, [e.ruta]: d }))
        }}
        onEnded={() => seguir && sig && abrir(sig.ruta)}
      />
      <div className="video-controles">
        <button className="btn chico" onClick={() => saltar(-10)} title="Atrás 10 s (J)">
          <Rewind size={14} /> 10 s
        </button>
        <button className="btn chico" onClick={() => saltar(10)} title="Adelante 10 s (L)">
          10 s <FastForward size={14} />
        </button>
        <span className="segmentado">
          {VELOCIDADES.map((x) => (
            <button key={x} className={vel === x ? 'on' : ''} onClick={() => setVel(x)}>
              {x}×
            </button>
          ))}
        </span>
        <label className="fila pequeno der">
          <input
            type="checkbox"
            checked={seguir}
            onChange={(x) => {
              setSeguir(x.target.checked)
              guardarLocal('estudio:seguir-video', x.target.checked ? '1' : '0')
            }}
          />
          <SkipForward size={13} /> Al acabar, el siguiente
        </label>
      </div>
      {lista.length > 1 && (
        <div className="tira-videos">
          {lista.map((h, n) => (
            <button key={h.ruta} className={`tira-item ${h.ruta === e.ruta ? 'on' : ''}`} onClick={() => abrir(h.ruta)} title={h.ruta}>
              <span className="tira-mini">
                <video
                  src={`${urlArchivo(h.ruta, h.mtime)}#t=1.5`}
                  muted
                  preload="metadata"
                  onLoadedMetadata={(x) => {
                    const d = x.currentTarget.duration
                    setDur((m) => (m[h.ruta] ? m : { ...m, [h.ruta]: d }))
                  }}
                />
                {h.ruta === e.ruta ? <i className="sonando">Viendo</i> : <Play size={16} />}
                {dur[h.ruta] ? <i className="duracion">{fmt(dur[h.ruta])}</i> : null}
              </span>
              <span className="tira-txt">
                <b>
                  {n + 1}. {h.titulo ?? h.nombre.replace(/\.[^.]+$/, '')}
                </b>
                {h.descripcion && <span className="muted pequeno">{h.descripcion}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
