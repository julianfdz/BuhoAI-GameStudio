import { useState } from 'react'
import { AudioLines, Box, ChevronRight, File, FileText, Film, Folder, FolderOpen, Image as ImageIcon, FileCode2, MessageSquare } from 'lucide-react'
import type { Clase, Entrada } from '@shared/types'

export const ICONO: Record<Clase, typeof File> = {
  carpeta: Folder,
  nota: FileText,
  imagen: ImageIcon,
  modelo: Box,
  audio: AudioLines,
  video: Film,
  texto: FileCode2,
  otro: File
}

export type AccionArbol = { tipo: 'menu'; e: Entrada | null; x: number; y: number } | { tipo: 'mover'; ruta: string; destino: string } | { tipo: 'soltar'; destino: string; archivos: string[] }

interface Props {
  nodos: Entrada[]
  sel: string | null
  abiertos: Set<string>
  recientes: Set<string>
  alternar: (r: string) => void
  elegir: (r: string) => void
  accion: (a: AccionArbol) => void
}

/** Árbol de carpetas y archivos del proyecto. Arrastrar dentro mueve; soltar archivos del Explorador los copia. */
export function Arbol(p: Props): React.JSX.Element {
  const [destino, setDestino] = useState<string | null>(null)
  const soltar = (e: React.DragEvent, d: string): void => {
    e.preventDefault()
    e.stopPropagation()
    setDestino(null)
    const interno = e.dataTransfer.getData('text/x-buho-ruta')
    if (interno) {
      if (interno !== d) p.accion({ tipo: 'mover', ruta: interno, destino: d })
      return
    }
    const archivos = Array.from(e.dataTransfer.files).map((f) => window.buho.rutaDeArchivo(f)).filter(Boolean)
    if (archivos.length) p.accion({ tipo: 'soltar', destino: d, archivos })
  }
  const pintar = (ns: Entrada[], nivel: number): React.JSX.Element => (
    <ul>
      {ns.map((n) => {
        const carpeta = n.clase === 'carpeta'
        const abierto = p.abiertos.has(n.ruta)
        const I = carpeta ? (abierto ? FolderOpen : Folder) : ICONO[n.clase]
        return (
          <li key={n.ruta}>
            <div
              className={`nodo ${carpeta ? 'carpeta' : n.clase} ${p.sel === n.ruta ? 'on' : ''} ${p.recientes.has(n.ruta) ? 'reciente' : ''} ${destino === n.ruta ? 'destino' : ''}`}
              style={{ paddingLeft: 8 + nivel * 14 }}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/x-buho-ruta', n.ruta)}
              onDragOver={(e) => {
                if (!carpeta) return
                e.preventDefault()
                e.stopPropagation()
                setDestino(n.ruta)
              }}
              onDragLeave={() => setDestino((d) => (d === n.ruta ? null : d))}
              onDrop={(e) => carpeta && soltar(e, n.ruta)}
              onClick={() => {
                p.elegir(n.ruta)
                if (carpeta && !abierto) p.alternar(n.ruta)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                p.accion({ tipo: 'menu', e: n, x: e.clientX, y: e.clientY })
              }}
              title={[n.titulo, n.ruta, n.descripcion].filter(Boolean).join('\n')}
            >
              {carpeta ? (
                <button
                  className={`flecha ${abierto ? 'abierta' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    p.alternar(n.ruta)
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              ) : (
                <span className="flecha" />
              )}
              <I size={15} className={`ico c-${n.clase}`} />
              <span className="titulo">{n.nombre}</span>
              {n.pendientes ? (
                <span className="globo" title={`${n.pendientes} comentario(s) sin resolver`}>
                  <MessageSquare size={11} />
                  {n.pendientes}
                </span>
              ) : null}
              {n.estado && <i className={`bola e-${n.estado}`} title={n.estado} />}
            </div>
            {carpeta && abierto && (n.hijos?.length ? pintar(n.hijos, nivel + 1) : <div className="vacio" style={{ paddingLeft: 30 + nivel * 14 }}>vacía</div>)}
          </li>
        )
      })}
    </ul>
  )
  return (
    <div
      className={`arbol ${destino === '' ? 'destino-raiz' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDestino('')
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDestino(null)
      }}
      onDrop={(e) => soltar(e, '')}
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return
        e.preventDefault()
        p.accion({ tipo: 'menu', e: null, x: e.clientX, y: e.clientY })
      }}
    >
      {pintar(p.nodos, 0)}
    </div>
  )
}
