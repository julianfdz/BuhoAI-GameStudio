import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Columns2, Eye, FilePlus2, FolderPlus, Pencil, Play, Pause, Upload, Folder, RefreshCw } from 'lucide-react'
import { ESTADOS, type Entrada, type EstadoAsset } from '@shared/types'
import { contar, nombreDe, padreDe, tam, urlArchivo } from '@/lib/util'
import { extDe, useMiniatura } from '@/lib/miniaturas'
import { EN_APP } from '@/lib/tres'
import { ICONO } from './Arbol'
import { Markdown } from './Markdown'
import { Visor3D } from './Visor3D'
import { Navegacion, VideoVista } from './Medios'

export function Migas({ ruta, nombre, ir }: { ruta: string; nombre: string; ir: (r: string) => void }): React.JSX.Element {
  const partes = ruta ? ruta.split('/') : []
  return (
    <div className="migas">
      <button onClick={() => ir('')}>{nombre}</button>
      {partes.map((p, i) => (
        <span key={i} className="fila" style={{ gap: 2 }}>
          <span className="sep">/</span>
          <button onClick={() => ir(partes.slice(0, i + 1).join('/'))}>{p}</button>
        </span>
      ))}
    </div>
  )
}

/** Audio pequeño que se reproduce sin abrir el archivo (en las tarjetas). */
let sonando: HTMLAudioElement | null = null
function BotonAudio({ ruta, v }: { ruta: string; v: number }): React.JSX.Element {
  const [on, setOn] = useState(false)
  const a = useRef<HTMLAudioElement | null>(null)
  return (
    <button
      className="play"
      title={on ? 'Parar' : 'Escuchar'}
      onClick={(e) => {
        e.stopPropagation()
        if (on) {
          a.current?.pause()
          setOn(false)
          return
        }
        sonando?.pause()
        a.current ??= new Audio(urlArchivo(ruta, v))
        a.current.currentTime = 0
        a.current.onended = () => setOn(false)
        a.current.onpause = () => setOn(false)
        void a.current.play()
        sonando = a.current
        setOn(true)
      }}
    >
      {on ? <Pause size={18} /> : <Play size={18} />}
    </button>
  )
}

function Tarjeta({ e, abrir, sel }: { e: Entrada; abrir: (r: string) => void; sel: boolean }): React.JSX.Element {
  const mini = useMiniatura(e)
  const I = ICONO[e.clase]
  let fondo: React.ReactNode
  if (e.clase === 'imagen') fondo = <img src={urlArchivo(e.ruta, e.mtime)} loading="lazy" alt="" />
  else if (e.clase === 'modelo')
    fondo = mini ? (
      <img src={mini} alt="" />
    ) : (
      <div className="haciendo">
        <Box size={34} />
        <span>{EN_APP.includes(extDe(e.ruta)) || extDe(e.ruta) === '.blend' ? 'Haciendo miniatura…' : extDe(e.ruta)}</span>
      </div>
    )
  else if (e.clase === 'video')
    fondo = (
      <span className="muestra-video">
        <video src={`${urlArchivo(e.ruta, e.mtime)}#t=1.5`} muted preload="metadata" />
        <Play size={20} />
      </span>
    )
  else
    fondo = (
      <div className={`icono-grande c-${e.clase}`}>
        <I size={40} strokeWidth={1.4} />
        {e.clase === 'carpeta' && <span>{contar(e)} archivos</span>}
        {e.clase === 'audio' && <BotonAudio ruta={e.ruta} v={e.mtime} />}
      </div>
    )
  return (
    <button
      className={`tarjeta ${sel ? 'on' : ''}`}
      onClick={() => abrir(e.ruta)}
      draggable
      onDragStart={(ev) => ev.dataTransfer.setData('text/x-buho-ruta', e.ruta)}
      title={[e.titulo, e.ruta, e.descripcion].filter(Boolean).join('\n')}
    >
      <div className={`mini ${e.clase === 'modelo' || e.clase === 'imagen' || e.clase === 'video' ? 'oscura' : ''}`}>
        {fondo}
        {e.estado && <span className={`sello e-${e.estado}`}>{ESTADOS.find((x) => x.id === e.estado)?.nombre}</span>}
        {e.pendientes ? <span className="sello-com">{e.pendientes}</span> : null}
      </div>
      <div className="pie">
        <span className="nombre">{e.titulo || e.nombre}</span>
        {e.titulo && <span className="archivo-real mono pequeno">{e.nombre}</span>}
        {e.descripcion && <span className="desc pequeno">{e.descripcion}</span>}
        <span className="muted pequeno">{e.clase === 'carpeta' ? 'carpeta' : `${e.ext.replace('.', '').toUpperCase() || '—'} · ${tam(e.tam)}`}</span>
      </div>
    </button>
  )
}

/** Vista de una carpeta: galería con miniaturas, filtro por estado y zona para soltar archivos. */
export function Galeria(p: {
  carpeta: Entrada | null
  hijos: Entrada[]
  nombreProyecto: string
  ir: (r: string) => void
  sel: string | null
  nuevaNota: (c: string) => void
  nuevaCarpeta: (c: string) => void
  subir: (c: string) => void
  soltar: (c: string, archivos: string[]) => void
  mover: (r: string, c: string) => void
}): React.JSX.Element {
  const ruta = p.carpeta?.ruta ?? ''
  const [filtro, setFiltro] = useState<EstadoAsset | 'todos'>('todos')
  const [sobre, setSobre] = useState(false)
  const [todo, setTodo] = useState(false)
  // «Ver todo»: los archivos de las subcarpetas también, como una galería única
  const lista = useMemo(() => {
    const plano = (xs: Entrada[]): Entrada[] => xs.flatMap((x) => (x.clase === 'carpeta' ? plano(x.hijos ?? []) : [x]))
    const xs = todo ? plano(p.hijos) : p.hijos
    return filtro === 'todos' ? xs : xs.filter((x) => x.estado === filtro)
  }, [p.hijos, filtro, todo])
  return (
    <div
      className={`pagina galeria ${sobre ? 'soltando' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setSobre(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setSobre(false)
        const interno = e.dataTransfer.getData('text/x-buho-ruta')
        if (interno) {
          if (padreDe(interno) !== ruta) p.mover(interno, ruta)
          return
        }
        const fs = Array.from(e.dataTransfer.files).map((f) => window.buho.rutaDeArchivo(f)).filter(Boolean)
        if (fs.length) p.soltar(ruta, fs)
      }}
    >
      <Migas ruta={ruta} nombre={p.nombreProyecto} ir={p.ir} />
      <div className="cabecera">
        <div>
          <h1 className="h-pagina">
            <Folder size={26} className="c-carpeta" /> {ruta ? nombreDe(ruta) : p.nombreProyecto}
          </h1>
          <p className="muted">{p.hijos.length ? `${p.hijos.filter((h) => h.clase === 'carpeta').length} carpetas · ${p.hijos.filter((h) => h.clase !== 'carpeta').length} archivos aquí` : 'Carpeta vacía: suelta archivos aquí o crea una nota.'}</p>
        </div>
        <div className="fila">
          <button className="btn" onClick={() => p.nuevaNota(ruta)}>
            <FilePlus2 size={15} /> Nota
          </button>
          <button className="btn" onClick={() => p.nuevaCarpeta(ruta)}>
            <FolderPlus size={15} /> Carpeta
          </button>
          <button className="btn primario" onClick={() => p.subir(ruta)}>
            <Upload size={15} /> Subir archivos
          </button>
        </div>
      </div>
      <div className="fila filtros">
        {(['todos', ...ESTADOS.map((x) => x.id)] as const).map((f) => (
          <button key={f} className={`chip ${filtro === f ? 'on' : ''}`} onClick={() => setFiltro(f)}>
            {f !== 'todos' && <i className={`bola e-${f}`} />}
            {f === 'todos' ? 'Todos' : ESTADOS.find((x) => x.id === f)!.nombre}
          </button>
        ))}
        <label className="fila der pequeno">
          <input type="checkbox" checked={todo} onChange={(e) => setTodo(e.target.checked)} /> Incluir subcarpetas
        </label>
      </div>
      <div className="rejilla">
        {lista.map((h) => (
          <Tarjeta key={h.ruta} e={h} abrir={p.ir} sel={p.sel === h.ruta} />
        ))}
      </div>
      {sobre && <div className="velo-soltar">Suelta para copiar a «{ruta || p.nombreProyecto}»</div>}
    </div>
  )
}

/** Editor de notas Markdown: vista, edición o las dos a la vez. Guarda solo; si un agente la cambia, se recarga. */
function NotaEditor({ e, idx, abrir }: { e: Entrada; idx: Map<string, Entrada>; abrir: (r: string) => void }): React.JSX.Element {
  const [texto, setTexto] = useState<string | null>(null)
  const [modo, setModo] = useState<'ver' | 'editar' | 'ambos'>('ver')
  const [sucio, setSucio] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const mtime = useRef(0)
  const temporizador = useRef<number | null>(null)
  const actual = useRef('')

  useEffect(() => {
    setTexto(null)
    setSucio(false)
    setAviso(null)
    void window.buho.leer(e.ruta).then((l) => {
      setTexto(l.texto)
      actual.current = l.texto
      mtime.current = l.mtime
    })
  }, [e.ruta])
  // Cambio desde fuera (agente, otro editor): si no hay nada sin guardar, se recarga
  useEffect(() => {
    if (!mtime.current || e.mtime <= mtime.current + 5) return
    if (sucio) {
      setAviso('La nota ha cambiado fuera mientras la editabas. Guarda para quedarte con tu versión o recarga.')
      return
    }
    void window.buho.leer(e.ruta).then((l) => {
      setTexto(l.texto)
      actual.current = l.texto
      mtime.current = l.mtime
    })
  }, [e.mtime])

  const guardar = async (): Promise<void> => {
    const r = await window.buho.escribir(e.ruta, actual.current)
    mtime.current = r.mtime
    setSucio(false)
    setAviso(null)
  }
  const cambiar = (v: string): void => {
    setTexto(v)
    actual.current = v
    setSucio(true)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => void guardar(), 900)
  }
  useEffect(() => () => {
    if (temporizador.current) {
      clearTimeout(temporizador.current)
      void window.buho.escribir(e.ruta, actual.current)
    }
  }, [e.ruta])

  if (texto === null) return <div className="muted">Cargando…</div>
  return (
    <div className={`editor-nota modo-${modo}`}>
      <div className="fila entre barra-nota">
        <div className="segmentado">
          <button className={modo === 'ver' ? 'on' : ''} onClick={() => setModo('ver')}>
            <Eye size={14} /> Vista
          </button>
          <button className={modo === 'editar' ? 'on' : ''} onClick={() => setModo('editar')}>
            <Pencil size={14} /> Editar
          </button>
          <button className={modo === 'ambos' ? 'on' : ''} onClick={() => setModo('ambos')}>
            <Columns2 size={14} /> Las dos
          </button>
        </div>
        <span className="muted pequeno">{sucio ? 'Guardando…' : 'Guardado'}</span>
      </div>
      {aviso && (
        <div className="aviso fila entre">
          {aviso}
          <button
            className="btn chico"
            onClick={() =>
              void window.buho.leer(e.ruta).then((l) => {
                setTexto(l.texto)
                actual.current = l.texto
                mtime.current = l.mtime
                setSucio(false)
                setAviso(null)
              })
            }
          >
            <RefreshCw size={13} /> Recargar
          </button>
        </div>
      )}
      <div className="nota-cuerpo">
        {modo !== 'ver' && <textarea className="editor" value={texto} onChange={(ev) => cambiar(ev.target.value)} spellCheck autoFocus={modo === 'editar'} />}
        {modo !== 'editar' && (
          <div className="vista-md" onDoubleClick={() => modo === 'ver' && setModo('ambos')}>
            <Markdown texto={texto} carpeta={padreDe(e.ruta)} idx={idx} abrir={abrir} />
          </div>
        )}
      </div>
    </div>
  )
}

function TextoVista({ e }: { e: Entrada }): React.JSX.Element {
  const [t, setT] = useState<string | null>(null)
  useEffect(() => {
    void window.buho
      .leer(e.ruta)
      .then((l) => setT(l.texto))
      .catch((x) => setT(String(x.message)))
  }, [e.ruta, e.mtime])
  return <pre className="codigo">{t ?? 'Cargando…'}</pre>
}

function ModeloVista({ e }: { e: Entrada }): React.JSX.Element {
  const mini = useMiniatura(e)
  const ext = extDe(e.ruta)
  if (EN_APP.includes(ext)) return <Visor3D url={urlArchivo(e.ruta, e.mtime)} ext={ext} />
  return (
    <div className="sin-visor">
      {mini ? <img src={mini} alt="" /> : <div className="haciendo grande"><Box size={60} />Haciendo la miniatura con Blender…</div>}
      <p className="muted">
        Los {ext} no se pueden girar dentro de la app: la imagen la hace <code>buho-blender</code>. Usa «Abrir en Blender» o exporta un .glb para verlo aquí en 3D.
      </p>
    </div>
  )
}

/** Vista de un archivo según su tipo. */
export function ArchivoVista(p: { e: Entrada; idx: Map<string, Entrada>; hermanos: Entrada[]; abrir: (r: string) => void; nombreProyecto: string }): React.JSX.Element {
  const { e } = p
  const I = ICONO[e.clase]
  let cuerpo: React.ReactNode
  if (e.clase === 'nota') cuerpo = <NotaEditor e={e} idx={p.idx} abrir={p.abrir} />
  else if (e.clase === 'imagen') cuerpo = <div className="imagen-grande"><img src={urlArchivo(e.ruta, e.mtime)} alt={e.nombre} /></div>
  else if (e.clase === 'modelo') cuerpo = <ModeloVista e={e} />
  else if (e.clase === 'audio')
    cuerpo = (
      <div className="audio-grande">
        <I size={64} strokeWidth={1.2} className="c-audio" />
        <audio controls src={urlArchivo(e.ruta, e.mtime)} />
      </div>
    )
  else if (e.clase === 'video') cuerpo = <VideoVista e={e} hermanos={p.hermanos} abrir={p.abrir} />
  else if (e.clase === 'texto') cuerpo = <TextoVista e={e} />
  else cuerpo = <p className="muted">Sin vista previa para este tipo de archivo. Ábrelo con su programa desde el panel de la derecha.</p>
  return (
    <div className={`pagina archivo clase-${e.clase}`}>
      <Migas ruta={e.ruta} nombre={p.nombreProyecto} ir={p.abrir} />
      {e.clase !== 'nota' && (
        <>
          <h1 className="h-pagina">
            <I size={24} className={`c-${e.clase}`} /> {e.titulo || e.nombre}
            {e.titulo && <span className="archivo-real mono">{e.nombre}</span>}
          </h1>
          {e.descripcion && <p className="desc-pagina">{e.descripcion}</p>}
          <Navegacion e={e} hermanos={p.hermanos} abrir={p.abrir} />
        </>
      )}
      {cuerpo}
    </div>
  )
}
