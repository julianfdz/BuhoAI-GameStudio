import { useEffect, useMemo, useState } from 'react'
import { Bot, Bug, CheckSquare, ListTodo, MessageSquare, Pencil, Plus, RotateCcw, Search, Square, User, X } from 'lucide-react'
import { ESTADOS_TAREA, GRAVEDADES, REPRODUCE, type DatosTarea, type Entrada, type EstadoTarea, type Tarea } from '@shared/types'
import { fecha } from '@/lib/util'
import { Collage } from './Inicio'
import { IdChip } from './IdChip'
import { Markdown } from './Markdown'

const PRIORIDADES = [
  { id: 'alta', nombre: 'Alta' },
  { id: 'media', nombre: 'Media' },
  { id: 'baja', nombre: 'Baja' }
] as const
const esAgente = (n?: string): boolean => !!n && /claude|codex|gemini|copilot|agente|ia\b|gpt/i.test(n)

function Asignada({ n }: { n?: string }): React.JSX.Element | null {
  if (!n) return null
  return (
    <span className={`asignada ${esAgente(n) ? 'ia' : ''}`} title={`Asignada a ${n}`}>
      {esAgente(n) ? <Bot size={12} /> : <User size={12} />} {n}
    </span>
  )
}

function Avance({ t }: { t: Tarea }): React.JSX.Element | null {
  if (!t.pasos.length) return null
  const pct = Math.round((t.hechos / t.pasos.length) * 100)
  return (
    <span className="avance" title={`${t.hechos} de ${t.pasos.length} pasos`}>
      <span className="avance-barra">
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="pequeno muted">
        {t.hechos}/{t.pasos.length}
      </span>
    </span>
  )
}

/** Kanban de tareas: por hacer, en curso, revisar y hecha. Las tarjetas se arrastran entre columnas. */
export function TareasVista(p: { tareas: Tarea[]; idx: Map<string, Entrada>; abrir: (r: string) => void; aviso: (t: string) => void; menu: (e: Entrada, x: number, y: number) => void }): React.JSX.Element {
  const [q, setQ] = useState('')
  const [quien, setQuien] = useState('')
  const [tipo, setTipo] = useState<'' | 'tarea' | 'bug'>('')
  const [nueva, setNueva] = useState<EstadoTarea | null>(null)
  const [sobre, setSobre] = useState<EstadoTarea | null>(null)
  const personas = useMemo(() => [...new Set(p.tareas.map((t) => t.asignada).filter(Boolean) as string[])].sort(), [p.tareas])
  const visibles = p.tareas.filter(
    (t) => (!tipo || t.tipo === tipo) && (!quien || t.asignada === quien) && (!q.trim() || `${t.titulo} ${t.descripcion} ${t.id} ${t.asignada ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
  )
  const mover = async (id: string, estado: EstadoTarea): Promise<void> => {
    try {
      await window.buho.editarTarea(id, { estado })
    } catch (e) {
      p.aviso(String((e as Error).message))
    }
  }
  return (
    <div className="pagina ancha tareas-pagina">
      <div className="cabecera">
        <div>
          <h1 className="h-pagina">
            <ListTodo size={26} className="c-acc" /> Tareas
          </h1>
          <p className="muted">
            Cada tarea es una nota en <span className="mono">Tareas/</span>. Las crean personas y agentes (<span className="mono">buho-studio tarea nueva</span>) y se mueven
            arrastrándolas.
          </p>
        </div>
        <div className="fila">
          <span className="buscador-claro">
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tarea o ID…" />
          </span>
          <select className="selector" value={tipo} onChange={(e) => setTipo(e.target.value as '' | 'tarea' | 'bug')}>
            <option value="">Tareas y bugs</option>
            <option value="tarea">Solo tareas</option>
            <option value="bug">Solo bugs</option>
          </select>
          {personas.length > 0 && (
            <select className="selector" value={quien} onChange={(e) => setQuien(e.target.value)}>
              <option value="">Todas las personas</option>
              {personas.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
          <button className="btn primario" onClick={() => setNueva('por-hacer')}>
            <Plus size={15} /> Nueva tarea
          </button>
        </div>
      </div>
      <div className="kanban">
        {ESTADOS_TAREA.map((col) => {
          const xs = visibles.filter((t) => t.estado === col.id)
          return (
            <div
              key={col.id}
              className={`kan-col t-${col.id} ${sobre === col.id ? 'sobre' : ''}`}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('text/x-buho-tarea')) return
                e.preventDefault()
                setSobre(col.id)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null)
              }}
              onDrop={(e) => {
                setSobre(null)
                const id = e.dataTransfer.getData('text/x-buho-tarea')
                if (id && p.tareas.find((t) => t.id === id)?.estado !== col.id) void mover(id, col.id)
              }}
            >
              <div className="kan-cabeza">
                <i className={`bola t-${col.id}`} />
                <b>{col.nombre}</b>
                <span className="muted pequeno">{xs.length}</span>
                <button className="icono der" title={`Nueva tarea en «${col.nombre}»`} onClick={() => setNueva(col.id)}>
                  <Plus size={15} />
                </button>
              </div>
              {xs.map((t) => (
                <button
                  key={t.id}
                  className={`kan-tarjeta pri-${t.prioridad} ${t.tipo === 'bug' ? `es-bug g-${t.gravedad}` : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/x-buho-tarea', t.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onClick={() => p.abrir(t.ruta)}
                  onContextMenu={(e) => {
                    const en = p.idx.get(t.ruta)
                    if (!en) return
                    e.preventDefault()
                    p.menu(en, e.clientX, e.clientY)
                  }}
                >
                  <span className="fila entre" style={{ flexWrap: 'nowrap' }}>
                    {t.tipo === 'bug' ? (
                      <span className={`sello-g g-${t.gravedad}`} title={`Bug ${t.gravedad}${t.build ? ` · build ${t.build}` : ''}`}>
                        <Bug size={11} /> {GRAVEDADES.find((g) => g.id === t.gravedad)?.nombre}
                      </span>
                    ) : (
                      <span className={`pri pri-${t.prioridad}`} title={`Prioridad ${t.prioridad}`}>
                        {t.prioridad}
                      </span>
                    )}
                    <IdChip id={t.id} ruta={t.ruta} nombre={t.titulo} />
                  </span>
                  <b className="kan-titulo">{t.titulo}</b>
                  {t.descripcion && <span className="extracto">{t.descripcion.replace(/[#*`>_[\]]/g, '').slice(0, 140)}</span>}
                  {t.enlaces.length > 0 && (
                    <span className="kan-enlaces">
                      {t.enlaces.slice(0, 4).map((id) => {
                        const en = [...p.idx.values()].find((x) => x.id === id)
                        return en ? (
                          <span key={id} className="kan-enlace" title={`${en.titulo ?? en.nombre} · ${id}`}>
                            <Collage e={en} />
                          </span>
                        ) : (
                          <span key={id} className="kan-enlace roto" title={`${id}: ya no existe`}>
                            ?
                          </span>
                        )
                      })}
                      {t.enlaces.length > 4 && <span className="muted pequeno">+{t.enlaces.length - 4}</span>}
                    </span>
                  )}
                  <span className="fila entre" style={{ flexWrap: 'nowrap' }}>
                    <Asignada n={t.asignada} />
                    <span className="fila" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      {t.pendientes ? (
                        <span className="pequeno c-com">
                          <MessageSquare size={12} /> {t.pendientes}
                        </span>
                      ) : null}
                      <Avance t={t} />
                    </span>
                  </span>
                </button>
              ))}
              {xs.length === 0 && <p className="muted pequeno kan-vacia">{col.id === 'por-hacer' ? 'Nada pendiente. Crea una tarea con +.' : 'Arrastra aquí una tarea.'}</p>}
            </div>
          )
        })}
      </div>
      {nueva && (
        <FormTarea
          titulo="Nueva tarea"
          inicial={{ estado: nueva }}
          idx={p.idx}
          cerrar={() => setNueva(null)}
          guardar={async (d) => {
            const t = await window.buho.crearTarea(d)
            p.aviso(`Tarea creada: ${t.id}`)
          }}
        />
      )}
    </div>
  )
}

/** Formulario de tarea (nueva o editar). Los enlaces se pegan como IDs (Copiar ID en cualquier asset). */
export function FormTarea(p: { titulo: string; inicial: DatosTarea; idx: Map<string, Entrada>; cerrar: () => void; guardar: (d: DatosTarea) => Promise<void> }): React.JSX.Element {
  const [d, setD] = useState<DatosTarea>({ ...(p.inicial.tipo === 'bug' ? { gravedad: 'menor', reproduce: 'sin-probar' } : { prioridad: 'media' }), ...p.inicial })
  const esBug = d.tipo === 'bug'
  const [reproducir, setReproducir] = useState('')
  const [pasos, setPasos] = useState((p.inicial.pasos ?? []).join('\n'))
  const [enlaces, setEnlaces] = useState((p.inicial.enlaces ?? []).join(', '))
  const [error, setError] = useState('')
  const ids = enlaces.split(/[\s,;]+/).filter(Boolean)
  const porId = useMemo(() => new Map([...p.idx.values()].map((x) => [x.id, x])), [p.idx])
  return (
    <div className="velo" onMouseDown={p.cerrar}>
      <form
        className="dialogo ancho"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!d.titulo?.trim()) return setError('Ponle un título')
          try {
            await p.guardar({
              ...d,
              enlaces: ids,
              ...(p.inicial.titulo === undefined ? { pasos: pasos.split('\n').map((x) => x.trim()).filter(Boolean) } : {}),
              ...(esBug && p.inicial.titulo === undefined ? { reproducir: reproducir.split('\n').map((x) => x.trim()).filter(Boolean) } : {})
            })
            p.cerrar()
          } catch (x) {
            setError(String((x as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
          }
        }}
      >
        <div className="fila entre">
          <h3>{p.titulo}</h3>
          <button type="button" className="icono" onClick={p.cerrar}>
            <X size={16} />
          </button>
        </div>
        <input
          autoFocus
          className="campo"
          placeholder={esBug ? 'Qué falla, en corto (p. ej. «El build se cierra al salir con -autoquit»)' : 'Título (p. ej. «Modelar la Ray Gun en low-poly»)'}
          value={d.titulo ?? ''}
          onChange={(e) => setD({ ...d, titulo: e.target.value })}
        />
        {esBug && p.inicial.titulo === undefined ? (
          <>
            <div className="form-fila">
              <label>
                <span className="pequeno muted">Gravedad</span>
                <select className="selector" value={d.gravedad ?? 'menor'} onChange={(e) => setD({ ...d, gravedad: e.target.value })}>
                  {GRAVEDADES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="pequeno muted">Build o versión</span>
                <input className="campo" placeholder="v0.3" value={d.build ?? ''} onChange={(e) => setD({ ...d, build: e.target.value })} />
              </label>
              <label className="crece">
                <span className="pequeno muted">¿Se reproduce?</span>
                <select className="selector" value={d.reproduce ?? 'sin-probar'} onChange={(e) => setD({ ...d, reproduce: e.target.value })}>
                  {REPRODUCE.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span className="pequeno muted">Cómo reproducirlo (un paso por línea)</span>
              <textarea className="campo" rows={3} placeholder={'Abrir el juego\nEmpezar partida\nPulsar Esc'} value={reproducir} onChange={(e) => setReproducir(e.target.value)} />
            </label>
            <div className="form-fila">
              <label className="crece">
                <span className="pequeno muted">Qué pasa</span>
                <textarea className="campo" rows={2} value={d.pasa ?? ''} onChange={(e) => setD({ ...d, pasa: e.target.value })} />
              </label>
              <label className="crece">
                <span className="pequeno muted">Qué debería pasar</span>
                <textarea className="campo" rows={2} value={d.deberia ?? ''} onChange={(e) => setD({ ...d, deberia: e.target.value })} />
              </label>
            </div>
          </>
        ) : (
          <textarea className="campo" rows={4} placeholder="Descripción: qué hay que hacer y cómo saber que está hecha (Markdown)" value={d.descripcion ?? ''} onChange={(e) => setD({ ...d, descripcion: e.target.value })} />
        )}
        <div className="form-fila">
          <label>
            <span className="pequeno muted">Estado</span>
            <select className="selector" value={d.estado ?? 'por-hacer'} onChange={(e) => setD({ ...d, estado: e.target.value })}>
              {ESTADOS_TAREA.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="pequeno muted">Prioridad</span>
            <select className="selector" value={d.prioridad ?? 'media'} onChange={(e) => setD({ ...d, prioridad: e.target.value })}>
              {PRIORIDADES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="crece">
            <span className="pequeno muted">Asignada a (persona o agente)</span>
            <input className="campo" placeholder="Julián, Claude…" value={d.asignada ?? ''} onChange={(e) => setD({ ...d, asignada: e.target.value })} />
          </label>
        </div>
        <label>
          <span className="pequeno muted">{esBug ? 'Dónde falla: assets, escenas, vídeo o captura (pega sus IDs)' : 'Assets relacionados: pega sus IDs (clic derecho → Copiar ID)'}</span>
          <input className="campo mono" placeholder="a-3f9c21b0, c-77aa0011" value={enlaces} onChange={(e) => setEnlaces(e.target.value)} />
        </label>
        {ids.length > 0 && (
          <div className="fila pequeno">
            {ids.map((id) => {
              const en = porId.get(id.toLowerCase())
              return (
                <span key={id} className={`chip ${en ? '' : 'roto'}`}>
                  {en ? (en.titulo ?? en.nombre) : `${id}: no existe`}
                </span>
              )
            })}
          </div>
        )}
        {p.inicial.titulo === undefined && (
          <label>
            <span className="pequeno muted">{esBug ? 'Pasos para arreglarlo (opcional, uno por línea)' : 'Pasos (uno por línea, opcional)'}</span>
            <textarea className="campo" rows={3} placeholder={'Bocetar\nModelar\nExportar a Unity'} value={pasos} onChange={(e) => setPasos(e.target.value)} />
          </label>
        )}
        {error && <p className="peligro pequeno">{error}</p>}
        <div className="fila fin">
          <button type="button" className="btn" onClick={p.cerrar}>
            Cancelar
          </button>
          <button className="btn primario">Guardar</button>
        </div>
      </form>
    </div>
  )
}

/** Detalle de una tarea: estado, prioridad, asignada, enlaces con miniatura, descripción y pasos marcables. */
export function TareaVista(p: { t: Tarea; idx: Map<string, Entrada>; abrir: (r: string) => void; aviso: (t: string) => void; editarTexto: () => void }): React.JSX.Element {
  const { t } = p
  const [editar, setEditar] = useState(false)
  const [paso, setPaso] = useState('')
  const porId = useMemo(() => new Map([...p.idx.values()].map((x) => [x.id, x])), [p.idx])
  const intentar = async (f: () => Promise<unknown>): Promise<void> => {
    try {
      await f()
    } catch (e) {
      p.aviso(String((e as Error).message).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }
  useEffect(() => setPaso(''), [t.id])
  return (
    <div className="tarea-vista">
      <div className="fila tarea-barra">
        <span className="segmentado">
          {ESTADOS_TAREA.map((x) => (
            <button key={x.id} className={t.estado === x.id ? 'on' : ''} onClick={() => void intentar(() => window.buho.editarTarea(t.id, { estado: x.id }))}>
              <i className={`bola t-${x.id}`} /> {x.nombre}
            </button>
          ))}
        </span>
        <span className={`pri pri-${t.prioridad}`}>prioridad {t.prioridad}</span>
        <Asignada n={t.asignada} />
        {t.reabierta ? (
          <span className="pequeno c-bug">
            <RotateCcw size={12} /> reabierta {t.reabierta} {t.reabierta === 1 ? 'vez' : 'veces'}
          </span>
        ) : null}
        <span className="der fila">
          <button className="btn chico" onClick={() => setEditar(true)}>
            <Pencil size={13} /> Editar
          </button>
          <button className="btn chico" onClick={p.editarTexto} title="Abrir el Markdown de la tarea">
            Markdown
          </button>
        </span>
      </div>
      {t.tipo === 'bug' && (
        <div className="fila barra-bug">
          <Bug size={16} className="c-bug" />
          <span className="segmentado">
            {GRAVEDADES.map((g) => (
              <button key={g.id} className={t.gravedad === g.id ? `on g-${g.id}` : ''} onClick={() => void intentar(() => window.buho.editarTarea(t.id, { gravedad: g.id }))}>
                {g.nombre}
              </button>
            ))}
          </span>
          <select className="selector" value={t.reproduce ?? 'sin-probar'} onChange={(e) => void intentar(() => window.buho.editarTarea(t.id, { reproduce: e.target.value }))}>
            {REPRODUCE.map((r) => (
              <option key={r.id} value={r.id}>
                Se reproduce: {r.nombre.toLowerCase()}
              </option>
            ))}
          </select>
          <label className="fila pequeno">
            Build
            <input
              className="campo build-campo"
              defaultValue={t.build ?? ''}
              key={t.build ?? ''}
              placeholder="v0.3"
              onBlur={(e) => e.target.value.trim() !== (t.build ?? '') && void intentar(() => window.buho.editarTarea(t.id, { build: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          </label>
        </div>
      )}
      <p className="muted pequeno">
        {t.tipo === 'bug' ? 'Abierto' : 'Creada'} {t.creada ? fecha(t.creada) : '—'}
        {t.autor ? ` por ${t.autor}` : ''}
        {t.cerrada ? ` · cerrada ${fecha(t.cerrada)}` : ''} · <span className="mono">{t.ruta}</span>
      </p>

      {t.enlaces.length > 0 && (
        <>
          <div className="etiqueta" style={{ marginTop: 18 }}>
            Assets relacionados
          </div>
          <div className="rejilla-enlaces">
            {t.enlaces.map((id) => {
              const en = porId.get(id)
              return en ? (
                <button key={id} className="seccion-tarjeta" onClick={() => p.abrir(en.ruta)}>
                  <Collage e={en} />
                  <span className="seccion-pie">
                    <b>{en.titulo ?? en.nombre}</b>
                    <span className="mono pequeno muted">{id}</span>
                  </span>
                </button>
              ) : (
                <div key={id} className="seccion-tarjeta roto">
                  <span className="seccion-pie">
                    <b className="mono">{id}</b>
                    <span className="pequeno muted">Ya no existe en el proyecto</span>
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {t.descripcion && (
        <div className="vista-md" style={{ marginTop: 18 }}>
          <Markdown texto={t.descripcion} carpeta={t.ruta.slice(0, t.ruta.lastIndexOf('/'))} idx={p.idx} abrir={p.abrir} />
        </div>
      )}

      <div className="etiqueta" style={{ marginTop: 18 }}>
        Pasos {t.pasos.length ? `· ${t.hechos} de ${t.pasos.length}` : ''}
      </div>
      <Avance t={t} />
      <ul className="pasos">
        {t.pasos.map((x, i) => (
          <li key={i} className={x.hecho ? 'hecho' : ''}>
            <button className="icono" onClick={() => void intentar(() => window.buho.pasoTarea(t.id, i + 1, !x.hecho))}>
              {x.hecho ? <CheckSquare size={18} className="c-acc" /> : <Square size={18} />}
            </button>
            <span>{x.texto}</span>
          </li>
        ))}
      </ul>
      <form
        className="caja-com"
        onSubmit={(e) => {
          e.preventDefault()
          if (!paso.trim()) return
          void intentar(async () => {
            await window.buho.anadirPasoTarea(t.id, paso)
            setPaso('')
          })
        }}
      >
        <input value={paso} onChange={(e) => setPaso(e.target.value)} placeholder="Añadir un paso…" />
        <button className="btn chico">
          <Plus size={13} /> Paso
        </button>
      </form>

      {editar && (
        <FormTarea
          titulo="Editar tarea"
          inicial={{ titulo: t.titulo, descripcion: t.descripcion, estado: t.estado, prioridad: t.prioridad, asignada: t.asignada ?? '', enlaces: t.enlaces, tipo: t.tipo }}
          idx={p.idx}
          cerrar={() => setEditar(false)}
          guardar={async (d) => {
            await window.buho.editarTarea(t.id, d)
          }}
        />
      )}
    </div>
  )
}
