import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BookOpen,
  Bot,
  Box,
  Clapperboard,
  FileText,
  Folder,
  FolderSearch,
  Hammer,
  Image as ImageIcon,
  Inbox,
  KanbanSquare,
  ListTodo,
  Map as MapIcon,
  MessageSquare,
  Music,
  Package,
  Palette,
  PersonStanding,
  Play,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { ESTADOS, type Entrada, type Proyecto } from '@shared/types'
import { contar, urlArchivo } from '@/lib/util'
import { useMiniatura } from '@/lib/miniaturas'
import { ICONO } from './Arbol'
import { paraQue } from '@shared/estructura'

/** Icono de una carpeta por su nombre (Gameplay, Animaciones, Sonidos…). */
const POR_NOMBRE: [RegExp, LucideIcon][] = [
  [/gameplay|v[ií]deo|trailer|grabaci/i, Clapperboard],
  [/anima/i, PersonStanding],
  [/sonido|audio|m[uú]sica|sfx/i, Music],
  [/mapa|nivel|escena/i, MapIcon],
  [/modelo|3d|arma|personaje|prop/i, Box],
  [/textura|material/i, Palette],
  [/imagen|concept|arte|captura|ilustra/i, ImageIcon],
  [/contexto|lore|historia|biblia|docu/i, BookOpen],
  [/tarea|pendiente|hito/i, ListTodo],
  [/build|versi/i, Hammer],
  [/sin procesar|bandeja|entrada|inbox/i, Inbox],
  [/asset/i, Package]
]
export const iconoCarpeta = (nombre: string): LucideIcon => POR_NOMBRE.find(([r]) => r.test(nombre))?.[1] ?? Folder

const ORDEN = ['sin procesar', 'contexto', 'assets', 'capturas', 'tareas', 'builds']
const plano = (xs: Entrada[]): Entrada[] => xs.flatMap((x) => (x.clase === 'carpeta' ? plano(x.hijos ?? []) : [x]))
const VISUAL: Entrada['clase'][] = ['imagen', 'video', 'modelo']

/** Una miniatura de muestra: imagen, primer fotograma de un vídeo o la miniatura del modelo. */
function Muestra({ e }: { e: Entrada }): React.JSX.Element {
  const mini = useMiniatura(e.clase === 'modelo' ? e : undefined)
  if (e.clase === 'imagen') return <img src={urlArchivo(e.ruta, e.mtime)} alt="" loading="lazy" />
  if (e.clase === 'video')
    return (
      <span className="muestra-video">
        <video src={`${urlArchivo(e.ruta, e.mtime)}#t=1.5`} muted preload="metadata" />
        <Play size={18} />
      </span>
    )
  return mini ? <img src={mini} alt="" className="contener" /> : <Box size={30} className="c-modelo" />
}

/**
 * Lo que hay dentro de una carpeta, en pequeño: primero lo visual (imágenes, fotogramas de vídeo, modelos) y, si no
 * hay, fichas con el icono y el nombre de los archivos (sonidos, mapas, animaciones, notas…). Vacía: icono genérico.
 */
export function Collage({ e, children }: { e: Entrada; children?: React.ReactNode }): React.JSX.Element {
  const todos = useMemo(() => (e.clase === 'carpeta' ? plano(e.hijos ?? []) : [e]), [e])
  const visuales = todos.filter((x) => VISUAL.includes(x.clase))
  const muestras = (visuales.length ? visuales : todos).slice(0, 4)
  const I = e.clase === 'carpeta' ? iconoCarpeta(e.nombre) : ICONO[e.clase]
  return (
    <div className={`collage n${Math.min(muestras.length, 4)}`}>
      {muestras.length ? (
        muestras.map((m) => (
          <div key={m.ruta} className={`celda ${VISUAL.includes(m.clase) ? '' : 'ficha-archivo'}`}>
            {VISUAL.includes(m.clase) ? <Muestra e={m} /> : <FichaArchivo e={m} />}
          </div>
        ))
      ) : (
        <div className="celda vacia">
          <I size={44} strokeWidth={1.3} />
        </div>
      )}
      {children}
    </div>
  )
}

/** Un archivo no visual dentro del collage: su icono, su nombre y, si es sonido, botón para oírlo. */
function FichaArchivo({ e }: { e: Entrada }): React.JSX.Element {
  const I = ICONO[e.clase]
  return (
    <span className={`ficha-arch c-${e.clase}`}>
      <I size={22} strokeWidth={1.5} />
      <span>{e.titulo ?? e.nombre}</span>
    </span>
  )
}

/** Tarjeta de una sección (carpeta): collage de lo que tiene, recuento y estados. */
function TarjetaSeccion({ e, ir, titulo, menu }: { e: Entrada; ir: (r: string) => void; titulo?: string; menu?: (e: Entrada, x: number, y: number) => void }): React.JSX.Element {
  const todos = useMemo(() => (e.clase === 'carpeta' ? plano(e.hijos ?? []) : [e]), [e])
  const I = e.clase === 'carpeta' ? iconoCarpeta(e.nombre) : ICONO[e.clase]
  const n = e.clase === 'carpeta' ? contar(e) : 1
  const porEstado = ESTADOS.map((s) => ({ ...s, n: todos.filter((x) => x.estado === s.id).length })).filter((s) => s.n)
  const pendientes = todos.reduce((a, x) => a + (x.pendientes ?? 0), 0) + (e.clase === 'carpeta' ? e.pendientes ?? 0 : 0)
  const tipos = [...new Set(todos.map((x) => x.ext.replace('.', '').toUpperCase()).filter(Boolean))].slice(0, 4)
  return (
    <button
      className="seccion-tarjeta"
      onClick={() => ir(e.ruta)}
      onContextMenu={(x) => {
        if (!menu) return
        x.preventDefault()
        menu(e, x.clientX, x.clientY)
      }}
      title={[e.titulo, e.ruta, e.id, e.descripcion].filter(Boolean).join('\n')}
    >
      <Collage e={e}>
        {pendientes ? (
          <span className="sello-com" title="Comentarios sin resolver">
            {pendientes}
          </span>
        ) : null}
      </Collage>
      <div className="seccion-pie">
        <div className="fila" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <span className="seccion-icono">
            <I size={16} />
          </span>
          <b>{titulo ?? e.titulo ?? e.nombre}</b>
        </div>
        {e.descripcion && <span className="desc pequeno">{e.descripcion}</span>}
        <span className="muted pequeno">
          {n} {n === 1 ? 'archivo' : 'archivos'}
          {tipos.length ? ` · ${tipos.join(', ')}` : ''}
        </span>
        {porEstado.length > 0 && (
          <span className="barra-estados" title={porEstado.map((s) => `${s.nombre}: ${s.n}`).join(' · ')}>
            {porEstado.map((s) => (
              <i key={s.id} className={`e-${s.id}`} style={{ flex: s.n }} />
            ))}
          </span>
        )}
      </div>
    </button>
  )
}

/** Tarjeta de una nota de Contexto: título, estado y el comienzo del texto. */
function TarjetaNota({ e, ir, menu }: { e: Entrada; ir: (r: string) => void; menu?: (e: Entrada, x: number, y: number) => void }): React.JSX.Element {
  const [extracto, setExtracto] = useState('')
  useEffect(() => {
    if (e.clase !== 'nota') return
    void window.buho
      .leer(e.ruta)
      .then((l) =>
        setExtracto(
          l.texto
            .replace(/^---[\s\S]*?---/, '')
            .split('\n')
            .filter((x) => x.trim() && !x.startsWith('#') && !x.startsWith('|') && !x.startsWith('!['))
            .join(' ')
            .replace(/[*_`>[\]]/g, '')
            .replace(/\(([^)]*)\)/g, '')
            .slice(0, 160)
        )
      )
      .catch(() => setExtracto(''))
  }, [e.ruta, e.mtime, e.clase])
  const estado = ESTADOS.find((s) => s.id === e.estado)
  return (
    <button
      className="nota-tarjeta"
      onClick={() => ir(e.ruta)}
      onContextMenu={(x) => {
        if (!menu) return
        x.preventDefault()
        menu(e, x.clientX, x.clientY)
      }}
      title={`${e.ruta}\n${e.id}`}
    >
      <div className="fila entre" style={{ flexWrap: 'nowrap' }}>
        <b className="fila" style={{ gap: 7, flexWrap: 'nowrap' }}>
          <FileText size={15} className="c-nota" /> {e.titulo ?? e.nombre.replace(/\.md$/i, '')}
        </b>
        {estado && <span className={`sello-mini e-${estado.id}`}>{estado.nombre}</span>}
      </div>
      <span className="extracto">{e.descripcion || extracto || 'Sin texto todavía.'}</span>
      {e.pendientes ? (
        <span className="pequeno c-com">
          <MessageSquare size={12} /> {e.pendientes} sin resolver
        </span>
      ) : null}
    </button>
  )
}

/** Imagen de portada: la que se llame «portada», si no la primera de Capturas o de un concept art. */
function elegirPortada(todos: Entrada[]): Entrada | undefined {
  const imgs = todos.filter((x) => x.clase === 'imagen')
  return imgs.find((x) => /portada|cover|key ?art/i.test(x.nombre)) ?? imgs.find((x) => /concept/i.test(x.ruta)) ?? imgs.find((x) => x.ruta.startsWith('Capturas/')) ?? imgs[0]
}

/** Inicio del proyecto: cabecera, lo pendiente y una tarjeta por cada sección para ir directo a ella. */
export function Inicio(p: {
  proyecto: Proyecto
  arbol: Entrada[]
  planos: Entrada[]
  version: number
  ir: (r: string) => void
  irVista: (v: 'tablero' | 'actividad' | 'tareas') => void
  menu: (e: Entrada, x: number, y: number) => void
  tareasAbiertas: number
  crearIaContext: () => void
}): React.JSX.Element {
  const archivos = p.planos.filter((x) => x.clase !== 'carpeta')
  const [comentarios, setComentarios] = useState(0)
  useEffect(() => {
    void window.buho.comentarios().then((cs) => setComentarios(cs.filter((c) => !c.respuestaA && !c.resuelto).length))
  }, [p.version])
  const portada = useMemo(() => elegirPortada(archivos), [archivos])
  const cuenta = (c: Entrada['clase']): number => archivos.filter((x) => x.clase === c).length
  const estados = ESTADOS.map((s) => ({ ...s, n: p.planos.filter((x) => x.estado === s.id).length }))
  const carpetas = p.arbol
    .filter((x) => x.clase === 'carpeta')
    .sort((a, b) => {
      const ia = ORDEN.indexOf(a.nombre.toLowerCase())
      const ib = ORDEN.indexOf(b.nombre.toLowerCase())
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.nombre.localeCompare(b.nombre, 'es')
    })
  const sueltos = p.arbol.filter((x) => x.clase !== 'carpeta')
  const sinProcesar = p.arbol.find((x) => x.clase === 'carpeta' && x.nombre.toLowerCase() === 'sin procesar')
  const leeme = sueltos.find((x) => /^l[eé]eme|readme/i.test(x.nombre))

  return (
    <div className="pagina inicio-pagina">
      <section className="heroe">
        <div className="heroe-texto">
          <div className="kicker">
            <Sparkles size={13} /> Proyecto de videojuego
          </div>
          <h1>{p.proyecto.nombre}</h1>
          {p.proyecto.descripcion && <p className="entradilla">{p.proyecto.descripcion}</p>}
          <div className="fila heroe-cifras">
            {(
              [
                ['modelo', 'modelos 3D'],
                ['imagen', 'imágenes'],
                ['video', 'vídeos'],
                ['audio', 'sonidos'],
                ['nota', 'notas']
              ] as const
            ).map(([c, t]) =>
              cuenta(c) ? (
                <span key={c} className="cifra">
                  <b>{cuenta(c)}</b> {t}
                </span>
              ) : null
            )}
            {p.proyecto.enlaces.unity && <span className="cifra unity">Unity enlazado</span>}
          </div>
          <div className="fila" style={{ marginTop: 16 }}>
            {leeme && (
              <button className="btn heroe-btn" onClick={() => p.ir(leeme.ruta)}>
                <BookOpen size={15} /> Léeme
              </button>
            )}
            <button className="btn heroe-btn" onClick={() => p.irVista('tablero')}>
              <KanbanSquare size={15} /> Tablero
            </button>
            <button className="btn heroe-btn" onClick={() => void window.buho.revelar('')}>
              <FolderSearch size={15} /> Carpeta
            </button>
          </div>
        </div>
        {portada && (
          <button className="heroe-imagen" onClick={() => p.ir(portada.ruta)} title={portada.ruta}>
            <img src={urlArchivo(portada.ruta, portada.mtime)} alt="" />
          </button>
        )}
      </section>

      <section className="pendientes">
        <button className="pendiente e-revisar" onClick={() => p.irVista('tablero')}>
          <b>{estados.find((s) => s.id === 'revisar')!.n}</b>
          <span>por revisar</span>
        </button>
        <button className="pendiente e-en-curso" onClick={() => p.irVista('tablero')}>
          <b>{estados.find((s) => s.id === 'en-curso')!.n}</b>
          <span>en curso</span>
        </button>
        <button className="pendiente com" onClick={() => p.irVista('actividad')}>
          <b>{comentarios}</b>
          <span>comentarios abiertos</span>
        </button>
        <button className="pendiente e-aprobado" onClick={() => p.irVista('tablero')}>
          <b>{estados.find((s) => s.id === 'aprobado')!.n}</b>
          <span>aprobados</span>
        </button>
        {sinProcesar && contar(sinProcesar) > 0 && (
          <button className="pendiente bandeja" onClick={() => p.ir(sinProcesar.ruta)} title="Bandeja de entrada: se procesa cuando se pide">
            <b>{contar(sinProcesar)}</b>
            <span>sin procesar</span>
          </button>
        )}
        <button className="pendiente tareas" onClick={() => p.irVista('tareas')}>
          <b>{p.tareasAbiertas}</b>
          <span>tareas abiertas</span>
        </button>
        <button className="pendiente act" onClick={() => p.irVista('actividad')}>
          <Activity size={22} />
          <span>Actividad</span>
        </button>
      </section>

      {carpetas.map((c) => {
        const I = iconoCarpeta(c.nombre)
        const hijos = c.hijos ?? []
        const sub = hijos.filter((h) => h.clase === 'carpeta')
        const notas = hijos.filter((h) => h.clase === 'nota')
        const otros = hijos.filter((h) => h.clase !== 'carpeta' && h.clase !== 'nota')
        return (
          <section key={c.ruta} className="seccion">
            <h2 className="h-seccion fila">
              <span className="seccion-icono grande">
                <I size={18} />
              </span>
              <button className="enlace-titulo" onClick={() => p.ir(c.ruta)}>
                {c.titulo ?? c.nombre}
              </button>
              <span className="muted pequeno">{contar(c)} archivos</span>
            </h2>
            {(c.descripcion || paraQue(c.ruta)) && <p className="muted desc-seccion">{c.descripcion || paraQue(c.ruta)}</p>}
            {c.nombre.toLowerCase() === 'contexto' && !hijos.some((h) => h.nombre.toLowerCase() === 'ia_context.md') && (
              <p className="aviso fila" style={{ marginBottom: 12 }}>
                <Bot size={15} /> Falta <b>ia_context.md</b>: la nota que leen primero los agentes (cómo trabajar en este juego).
                <button className="btn chico der" onClick={p.crearIaContext}>
                  Crearla
                </button>
              </p>
            )}
            {hijos.length === 0 && <p className="muted pequeno">Vacía. Arrastra archivos a la carpeta o pídeselo a un agente.</p>}
            {notas.length > 0 && (
              <div className="rejilla-notas">
                {notas.map((n) => (
                  <TarjetaNota key={n.ruta} e={n} ir={p.ir} menu={p.menu} />
                ))}
              </div>
            )}
            {(sub.length > 0 || otros.length > 0) && (
              <div className="rejilla-secciones">
                {sub.map((s) => (
                  <TarjetaSeccion key={s.ruta} e={s} ir={p.ir} menu={p.menu} />
                ))}
                {otros.length > 0 && <TarjetaSeccion e={{ ...c, hijos: otros }} ir={p.ir} menu={p.menu} titulo={sub.length ? `Sueltos en ${c.nombre}` : c.titulo ?? c.nombre} />}
              </div>
            )}
          </section>
        )
      })}

      {sueltos.length > 0 && (
        <section className="seccion">
          <h2 className="h-seccion">Archivos sueltos</h2>
          <div className="rejilla-notas">
            {sueltos.map((n) => (
              <TarjetaNota key={n.ruta} e={n} ir={p.ir} menu={p.menu} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
