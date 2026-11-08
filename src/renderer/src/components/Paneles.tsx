import { useEffect, useState } from 'react'
import { Bot, Box, FolderOpen, FolderPlus, Gamepad2, ImagePlus, Link2, Link2Off, MessageSquare, Plug, Terminal, User, X } from 'lucide-react'
import { ESTADOS, type Ajustes, type Comentario, type Conector, type Entrada, type Evento, type Proyecto } from '@shared/types'
import { fecha } from '@/lib/util'
import { useMiniatura } from '@/lib/miniaturas'
import { ICONO } from './Arbol'
import logo from '../logobuho.png'

/** Portada sin proyecto abierto: crear, abrir carpeta y recientes. */
export function Portada({ ajustes, abierto, recargar, aviso }: { ajustes: Ajustes | null; abierto: (p: Proyecto) => void; recargar: () => void; aviso: (t: string) => void }): React.JSX.Element {
  const [nombre, setNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const intentar = async (f: () => Promise<Proyecto | null>): Promise<void> => {
    try {
      const p = await f()
      if (p) abierto(p)
    } catch (e) {
      aviso(String((e as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }
  return (
    <div className="portada">
      <div className="portada-caja">
        <img src={logo} className="portada-logo" alt="" />
        <div className="kicker">Búho AI · Game Studio</div>
        <h1 className="h-portada">La mesa de trabajo de tu videojuego</h1>
        <p className="entradilla">Cada proyecto es una carpeta de verdad: contexto en Markdown, assets con miniaturas, estados y comentarios. Las personas y los agentes de IA trabajan sobre lo mismo y todo queda firmado.</p>
        <div className="fila portada-botones">
          {creando ? (
            <form
              className="fila"
              onSubmit={(e) => {
                e.preventDefault()
                if (nombre.trim()) void intentar(() => window.buho.nuevoProyecto(nombre.trim()))
              }}
            >
              <input className="campo" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del juego" />
              <button className="btn primario">Elegir dónde y crear</button>
              <button type="button" className="btn" onClick={() => setCreando(false)}>
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <button className="btn primario grande" onClick={() => setCreando(true)}>
                <FolderPlus size={18} /> Nuevo proyecto
              </button>
              <button className="btn grande" onClick={() => void intentar(() => window.buho.elegirCarpeta())}>
                <FolderOpen size={18} /> Abrir carpeta
              </button>
            </>
          )}
        </div>
        <div className="etiqueta" style={{ marginTop: 34 }}>
          Recientes
        </div>
        <ul className="recientes">
          {(ajustes?.recientes ?? []).length === 0 && <li className="muted">Aún no has abierto ningún proyecto.</li>}
          {(ajustes?.recientes ?? []).map((r) => (
            <li key={r.raiz}>
              <button onClick={() => void intentar(() => window.buho.abrirProyecto(r.raiz))}>
                <Gamepad2 size={18} className="c-acc" />
                <span>
                  <b>{r.nombre}</b>
                  <span className="mono muted pequeno">{r.raiz}</span>
                </span>
                <span className="muted pequeno der">{fecha(r.abierto)}</span>
              </button>
              <button className="icono" title="Quitar de recientes" onClick={() => void window.buho.quitarReciente(r.raiz).then(recargar)}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <div className="cli-pista">
          <Terminal size={14} /> Agentes: <code>buho-studio skill</code> · <code>buho-studio abrir "D:\Juegos\Mi juego"</code>
        </div>
      </div>
    </div>
  )
}

function MiniTarjeta({ e, abrir }: { e: Entrada; abrir: (r: string) => void }): React.JSX.Element {
  const mini = useMiniatura(e)
  const I = ICONO[e.clase]
  return (
    <button className="mini-tarjeta" onClick={() => abrir(e.ruta)} title={e.ruta}>
      <span className="mt-img">{e.clase === 'imagen' ? <img src={`estudio://f/${e.ruta.split('/').map(encodeURIComponent).join('/')}`} alt="" /> : mini ? <img src={mini} alt="" /> : <I size={20} className={`c-${e.clase}`} />}</span>
      <span className="mt-txt">
        <b>{e.nombre}</b>
        <span className="muted pequeno mono">{e.ruta.split('/').slice(0, -1).join('/') || '/'}</span>
      </span>
      {e.pendientes ? <span className="globo">{e.pendientes}</span> : null}
    </button>
  )
}

/** Tablero: lo que tiene estado, en columnas idea → en curso → revisar → aprobado. */
export function Tablero({ planos, abrir }: { planos: Entrada[]; abrir: (r: string) => void }): React.JSX.Element {
  return (
    <div className="pagina ancha">
      <h1 className="h-pagina">Tablero</h1>
      <p className="muted">Todo lo que tiene estado. Cámbialo en el panel de la derecha o con «buho-studio estado &lt;ruta&gt; revisar».</p>
      <div className="tablero">
        {ESTADOS.map((s) => {
          const xs = planos.filter((x) => x.estado === s.id)
          return (
            <div key={s.id} className={`columna e-${s.id}`}>
              <div className="col-cabeza">
                <i className={`bola e-${s.id}`} /> {s.nombre} <span className="muted">{xs.length}</span>
              </div>
              {xs.map((x) => (
                <MiniTarjeta key={x.ruta} e={x} abrir={abrir} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Actividad: comentarios abiertos de todo el proyecto e historial firmado (personas, agentes y cambios de fuera). */
export function Actividad({ version, abrir }: { version: number; abrir: (r: string) => void }): React.JSX.Element {
  const [hist, setHist] = useState<Evento[]>([])
  const [coms, setComs] = useState<Comentario[]>([])
  useEffect(() => {
    void window.buho.historial(undefined, 150).then(setHist)
    void window.buho.comentarios().then(setComs)
  }, [version])
  const abiertos = coms.filter((c) => !c.respuestaA && !c.resuelto)
  return (
    <div className="pagina ancha">
      <h1 className="h-pagina">Actividad</h1>
      <div className="dos-col">
        <section>
          <div className="etiqueta">
            <MessageSquare size={12} /> Comentarios abiertos · {abiertos.length}
          </div>
          <ul className="lista-act">
            {abiertos.length === 0 && <li className="muted">Nada pendiente.</li>}
            {abiertos.map((c) => {
              const n = coms.filter((r) => r.respuestaA === c.id).length
              return (
                <li key={c.id}>
                  <button onClick={() => abrir(c.ruta)}>
                    <span className="fila pequeno">
                      {c.origen === 'ia' ? <Bot size={13} className="c-ia" /> : <User size={13} />}
                      <b>{c.autor}</b> en <span className="mono">{c.ruta}</span>
                      <span className="muted der">{fecha(c.fecha)}</span>
                    </span>
                    <span>{c.texto}</span>
                    {n > 0 && <span className="muted pequeno">{n} respuesta(s)</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
        <section>
          <div className="etiqueta">Historial firmado</div>
          <ul className="lista-act">
            {hist.map((h, i) => (
              <li key={i} className={`o-${h.origen}`}>
                <button onClick={() => h.ruta && abrir(h.ruta)}>
                  <span className="fila pequeno">
                    {h.origen === 'ia' ? <Bot size={13} className="c-ia" /> : h.origen === 'externo' ? <FolderOpen size={13} /> : <User size={13} />}
                    <b>{h.autor}</b> {h.accion}
                    <span className="muted der">{fecha(h.fecha)}</span>
                  </span>
                  <span className="mono pequeno">{h.ruta || '/'}</span>
                  {h.detalle && <span className="muted pequeno">{h.detalle}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/** Conectores opcionales (Blender, Unity, ComfyUI) y ajustes de la persona. */
export function Conectores({ proyecto, ajustes, guardarAjustes, aviso, version }: { proyecto: Proyecto; ajustes: Ajustes | null; guardarAjustes: (a: Partial<Ajustes>) => void; aviso: (t: string) => void; version: number }): React.JSX.Element {
  const [cs, setCs] = useState<Conector[]>([])
  const [autor, setAutor] = useState(ajustes?.autor ?? '')
  useEffect(() => {
    void window.buho.conectores().then(setCs)
  }, [version, proyecto.enlaces.unity])
  const ICO = { blender: Box, unity: Gamepad2, comfyui: ImagePlus }
  return (
    <div className="pagina">
      <h1 className="h-pagina">
        <Plug size={24} /> Conectores y ajustes
      </h1>
      <p className="muted">El estudio no depende de ningún motor ni programa. Estos conectores son opcionales: si están instalados, se usan.</p>
      <div className="conectores">
        {cs.map((c) => {
          const I = ICO[c.id]
          return (
            <div key={c.id} className={`conector ${c.disponible ? 'ok' : ''}`}>
              <I size={26} />
              <div className="crece">
                <div className="fila">
                  <b>{c.nombre}</b>
                  <span className={`pastilla ${c.disponible ? 'ok' : ''}`}>{c.disponible ? 'activo' : c.id === 'comfyui' ? 'previsto' : c.enlace ? 'enlazado' : 'no disponible'}</span>
                </div>
                <p className="muted pequeno">{c.detalle}</p>
                {c.id === 'unity' && (
                  <div className="fila" style={{ marginTop: 8 }}>
                    <button
                      className="btn chico"
                      onClick={async () => {
                        try {
                          await window.buho.elegirUnity()
                        } catch (e) {
                          aviso(String((e as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
                        }
                      }}
                    >
                      <Link2 size={13} /> {c.enlace ? 'Cambiar proyecto de Unity' : 'Enlazar proyecto de Unity'}
                    </button>
                    {c.enlace && (
                      <button className="btn chico" onClick={() => void window.buho.enlazarUnity(null)}>
                        <Link2Off size={13} /> Quitar enlace
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <h2 className="h-seccion">Tu firma</h2>
      <p className="muted pequeno">Lo que hagas en la app queda firmado con este nombre en el historial. Los agentes firman con su propio nombre (--autor).</p>
      <form
        className="fila"
        onSubmit={(e) => {
          e.preventDefault()
          guardarAjustes({ autor: autor.trim() || 'Usuario' })
          aviso('Firma guardada')
        }}
      >
        <input className="campo" value={autor} onChange={(e) => setAutor(e.target.value)} />
        <button className="btn primario">Guardar</button>
      </form>
      <h2 className="h-seccion">Carpeta del proyecto</h2>
      <p className="mono">{proyecto.raiz}</p>
      <p className="muted pequeno">Lo interno del estudio (estados, comentarios, historial y miniaturas) está en <code>.buhostudio/</code> dentro de esa carpeta.</p>
    </div>
  )
}
