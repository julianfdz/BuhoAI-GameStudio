import { useEffect, useRef, useState } from 'react'
import { Bot, Check, CornerDownRight, ExternalLink, FolderSearch, ImageUp, Send, User, Undo2, Box } from 'lucide-react'
import { ESTADOS, type Comentario, type Entrada, type Evento } from '@shared/types'
import { fecha, tam } from '@/lib/util'
import { rehacerMiniatura } from '@/lib/miniaturas'
import { IdChip } from './IdChip'

const Quien = ({ origen }: { origen: string }): React.JSX.Element => (origen === 'ia' ? <Bot size={13} className="c-ia" /> : origen === 'externo' ? <FolderSearch size={13} /> : <User size={13} />)

/** Nombre legible y descripción del asset. Se guarda al salir del campo (o con Ctrl+Enter en la descripción). */
function Ficha({ e }: { e: Entrada }): React.JSX.Element {
  const [titulo, setTitulo] = useState(e.titulo ?? '')
  const [desc, setDesc] = useState(e.descripcion ?? '')
  const foco = useRef<'titulo' | 'desc' | null>(null)
  // Si lo cambia un agente mientras miras, se actualiza (salvo el campo que estás escribiendo)
  useEffect(() => {
    if (foco.current !== 'titulo') setTitulo(e.titulo ?? '')
    if (foco.current !== 'desc') setDesc(e.descripcion ?? '')
  }, [e.ruta, e.titulo, e.descripcion])
  const guardar = (campo: 'titulo' | 'descripcion', v: string): void => {
    foco.current = null
    if (v.trim() === ((campo === 'titulo' ? e.titulo : e.descripcion) ?? '')) return
    void window.buho.ponerFicha(e.ruta, { [campo]: v })
  }
  return (
    <div className="panel-bloque ficha">
      <div className="etiqueta">Ficha</div>
      <label className="campo">
        <span className="pequeno muted">Nombre</span>
        <input
          value={titulo}
          placeholder={e.clase === 'carpeta' ? 'Nombre de la carpeta en el juego…' : 'p. ej. «Ray Gun Búho»'}
          onFocus={() => (foco.current = 'titulo')}
          onChange={(x) => setTitulo(x.target.value)}
          onBlur={(x) => guardar('titulo', x.target.value)}
          onKeyDown={(x) => x.key === 'Enter' && x.currentTarget.blur()}
        />
      </label>
      <label className="campo">
        <span className="pequeno muted">Descripción</span>
        <textarea
          value={desc}
          rows={3}
          placeholder="Qué es, para qué sirve en el juego, de dónde sale…"
          onFocus={() => (foco.current = 'desc')}
          onChange={(x) => setDesc(x.target.value)}
          onBlur={(x) => guardar('descripcion', x.target.value)}
          onKeyDown={(x) => x.key === 'Enter' && (x.ctrlKey || x.metaKey) && x.currentTarget.blur()}
        />
      </label>
    </div>
  )
}

/** Panel de la derecha: datos, ficha, estado, comentarios (con respuestas) e historial firmado del elemento elegido. */
export function Panel({ e, esTarea, version, nombreProyecto, aviso }: { e: Entrada | null; esTarea?: boolean; version: number; nombreProyecto: string; aviso: (t: string) => void }): React.JSX.Element {
  const ruta = e?.ruta ?? ''
  const [coms, setComs] = useState<Comentario[]>([])
  const [hist, setHist] = useState<Evento[]>([])
  const [nuevo, setNuevo] = useState('')
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [verResueltos, setVerResueltos] = useState(false)

  useEffect(() => {
    void window.buho.comentarios(ruta).then((cs) => setComs(cs.filter((c) => c.ruta === ruta)))
    void window.buho.historial(ruta || undefined, 25).then(setHist)
  }, [ruta, version])

  const hilos = coms.filter((c) => !c.respuestaA).sort((a, b) => Number(!!a.resuelto) - Number(!!b.resuelto) || b.fecha.localeCompare(a.fecha))
  const respuestas = (id: string): Comentario[] => coms.filter((c) => c.respuestaA === id).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const visibles = hilos.filter((h) => verResueltos || !h.resuelto)

  return (
    <aside className="panel">
      <div className="panel-bloque">
        <div className="etiqueta">{e ? (esTarea ? 'Tarea' : e.clase === 'carpeta' ? 'Carpeta' : 'Archivo') : 'Proyecto'}</div>
        <h3 className="panel-titulo">{e?.titulo || e?.nombre || nombreProyecto}</h3>
        {e?.titulo && <div className="pequeno">{e.nombre}</div>}
        {e?.id && (
          <div className="fila" style={{ margin: '6px 0 2px' }}>
            <IdChip id={e.id} ruta={e.ruta} nombre={e.titulo ?? e.nombre} grande />
            <span className="muted pequeno">pégala en el chat con la IA</span>
          </div>
        )}
        <div className="mono muted pequeno ruta">{ruta || '/'}</div>
        {e && e.clase !== 'carpeta' && (
          <div className="muted pequeno">
            {tam(e.tam)} · modificado {fecha(e.mtime)}
          </div>
        )}
        {e && (
          <div className="fila acciones-panel">
            <button className="btn chico" onClick={() => void window.buho.revelar(ruta)} title="Mostrar en el Explorador">
              <FolderSearch size={13} /> Explorador
            </button>
            {e.clase !== 'carpeta' && (
              <button className="btn chico" onClick={() => void window.buho.abrirFuera(ruta)} title="Abrir con el programa de Windows">
                <ExternalLink size={13} /> Abrir fuera
              </button>
            )}
            {e.clase === 'modelo' && (
              <>
                <button
                  className="btn chico"
                  onClick={async () => {
                    aviso('Abriendo en Blender…')
                    const r = await window.buho.abrirEnBlender(ruta)
                    aviso(r.ok ? 'Abierto en Blender' : `Blender: ${r.error}`)
                  }}
                >
                  <Box size={13} /> Abrir en Blender
                </button>
                <button className="btn chico" onClick={() => rehacerMiniatura(e)} title="Volver a hacer la miniatura">
                  <ImageUp size={13} /> Miniatura
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {e && !esTarea && <Ficha e={e} />}

      {e && !esTarea && (
        <div className="panel-bloque">
          <div className="etiqueta">Estado</div>
          <div className="estados">
            {ESTADOS.map((s) => (
              <button key={s.id} className={`estado-btn e-${s.id} ${e.estado === s.id ? 'on' : ''}`} onClick={() => void window.buho.ponerEstado(ruta, e.estado === s.id ? null : s.id)}>
                <i className={`bola e-${s.id}`} />
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {e && (
        <div className="panel-bloque crece">
          <div className="fila entre">
            <div className="etiqueta">Comentarios {hilos.filter((h) => !h.resuelto).length ? `· ${hilos.filter((h) => !h.resuelto).length} abiertos` : ''}</div>
            {hilos.some((h) => h.resuelto) && (
              <label className="pequeno muted fila">
                <input type="checkbox" checked={verResueltos} onChange={(x) => setVerResueltos(x.target.checked)} /> resueltos
              </label>
            )}
          </div>
          <div className="comentarios">
            {visibles.length === 0 && <p className="muted pequeno">Sin comentarios. Los agentes los leen con «buho-studio comentarios --pendientes» y contestan aquí.</p>}
            {visibles.map((h) => (
              <div key={h.id} className={`hilo ${h.resuelto ? 'resuelto' : ''}`}>
                {[h, ...respuestas(h.id)].map((c) => (
                  <div key={c.id} className={`comentario ${c.respuestaA ? 'resp' : ''} o-${c.origen}`}>
                    <div className="fila entre pequeno">
                      <b className="fila" style={{ gap: 4 }}>
                        {c.respuestaA && <CornerDownRight size={12} />}
                        <Quien origen={c.origen} /> {c.autor}
                      </b>
                      <span className="muted">{fecha(c.fecha)}</span>
                    </div>
                    <div className="texto-com">{c.texto}</div>
                  </div>
                ))}
                <div className="fila pequeno acciones-hilo">
                  <button className="enlace" onClick={() => setRespondiendo(respondiendo === h.id ? null : h.id)}>
                    Responder
                  </button>
                  <button className="enlace" onClick={() => void window.buho.resolver(h.id, !h.resuelto)}>
                    {h.resuelto ? (
                      <>
                        <Undo2 size={12} /> Reabrir
                      </>
                    ) : (
                      <>
                        <Check size={12} /> Resolver
                      </>
                    )}
                  </button>
                </div>
                {respondiendo === h.id && (
                  <form
                    className="caja-com"
                    onSubmit={async (x) => {
                      x.preventDefault()
                      if (!respuesta.trim()) return
                      await window.buho.comentar(ruta, respuesta, h.id)
                      setRespuesta('')
                      setRespondiendo(null)
                    }}
                  >
                    <input autoFocus value={respuesta} onChange={(x) => setRespuesta(x.target.value)} placeholder="Tu respuesta…" />
                    <button className="icono" title="Enviar">
                      <Send size={15} />
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
          <form
            className="caja-com nueva"
            onSubmit={async (x) => {
              x.preventDefault()
              if (!nuevo.trim()) return
              await window.buho.comentar(ruta, nuevo)
              setNuevo('')
            }}
          >
            <textarea
              value={nuevo}
              onChange={(x) => setNuevo(x.target.value)}
              placeholder="Comenta este archivo (p. ej. «la textura se ve plana de cerca»)…"
              rows={2}
              onKeyDown={(x) => {
                if (x.key === 'Enter' && (x.ctrlKey || x.metaKey)) (x.currentTarget.form as HTMLFormElement).requestSubmit()
              }}
            />
            <button className="btn chico primario">
              <Send size={13} /> Comentar
            </button>
          </form>
        </div>
      )}

      <div className="panel-bloque">
        <div className="etiqueta">Historial {e ? '' : 'del proyecto'}</div>
        <ul className="historial">
          {hist.length === 0 && <li className="muted pequeno">Sin cambios registrados.</li>}
          {hist.map((h, i) => (
            <li key={i} className={`o-${h.origen}`}>
              <Quien origen={h.origen} />
              <div>
                <div>
                  <b>{h.autor}</b> {h.accion} {(!e || h.ruta !== ruta) && <span className="mono pequeno">{h.ruta || '/'}</span>}
                </div>
                <div className="muted pequeno">
                  {fecha(h.fecha)} · {h.canal}
                  {h.origen === 'ia' && h.usuario ? ` · en el equipo de ${h.usuario}` : ''}
                  {h.detalle ? ` · ${h.detalle}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
