import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Bot, Bug, Check, CircleHelp, FilePlus2, FolderOpen, FolderPlus, FolderTree, House, KanbanSquare, ListTodo, LogOut, Palette, Plug, Search, Upload, X } from 'lucide-react'
import type { Ajustes, DatosTarea, Entrada, Proyecto, Tarea } from '@shared/types'
import { PLANTILLA_IA_CONTEXT } from '@shared/plantillaIa'
import { guardarLocal, indexar, leerLocal, nombreDe, padreDe } from '@/lib/util'
import { pintarYGuardar, refrescarMiniatura } from '@/lib/miniaturas'
import { Arbol, ICONO, type AccionArbol } from '@/components/Arbol'
import { ArchivoVista, Galeria } from '@/components/Vistas'
import { Panel } from '@/components/Panel'
import { Actividad, Conectores, Portada, Tablero } from '@/components/Paneles'
import { Inicio } from '@/components/Inicio'
import { FormTarea, TareaVista, TareasVista } from '@/components/Tareas'
import { Ayuda } from '@/components/Ayuda'
import { BugsVista } from '@/components/Bugs'
import { IdChip, copiarId } from '@/components/IdChip'
import { Migas } from '@/components/Vistas'
import { TEMAS, aplicarTema } from '@/lib/temas'
import logo from './logobuho.png'

type Vista = 'inicio' | 'archivos' | 'tareas' | 'bugs' | 'tablero' | 'actividad' | 'conectores' | 'ayuda'
type Pregunta = { titulo: string; valor: string; ok: (v: string) => void }
type Menu = { e: Entrada | null; x: number; y: number }
const limpiarError = (e: unknown): string => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')

export default function App(): React.JSX.Element {
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [cargado, setCargado] = useState(false)
  const [ajustes, setAjustes] = useState<Ajustes | null>(null)
  const [arbol, setArbol] = useState<Entrada[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>('inicio')
  const [verTemas, setVerTemas] = useState(false)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [formTarea, setFormTarea] = useState<DatosTarea | null>(null)
  const [verTexto, setVerTexto] = useState<string | null>(null)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [recientes, setRecientes] = useState<Set<string>>(new Set())
  const [version, setVersion] = useState(0)
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ ruta: string; nombre: string; clase: Entrada['clase']; fragmento?: string }[]>([])
  const [avisos, setAvisos] = useState<{ id: number; texto: string; ia?: boolean }[]>([])
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [api, setApi] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<string>('')
  const clave = (p: Proyecto | null): string => `estudio:abiertos:${p?.raiz ?? ''}`

  const aviso = useCallback((texto: string, ia = false) => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a.slice(-3), { id, texto, ia }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), ia ? 5200 : 3800)
  }, [])

  useEffect(() => {
    const f = (e: Event): void => aviso(String((e as CustomEvent).detail))
    window.addEventListener('buho-aviso', f)
    return () => window.removeEventListener('buho-aviso', f)
  }, [aviso])

  const cargarArbol = useCallback(async () => setArbol(await window.buho.arbol()), [])
  const cargarEstado = useCallback(async () => {
    const e = await window.buho.estado()
    setProyecto(e.proyecto)
    setApi(e.api)
    const a = await window.buho.ajustes()
    setAjustes(a)
    aplicarTema(a.tema)
    if (e.proyecto) {
      try {
        setAbiertos(new Set(JSON.parse(leerLocal(clave(e.proyecto)) ?? '["Contexto","Assets"]')))
      } catch {
        setAbiertos(new Set())
      }
      await cargarArbol()
    } else setArbol([])
    setCargado(true)
  }, [cargarArbol])

  useEffect(() => {
    void cargarEstado()
  }, [cargarEstado])

  // Cambios en vivo: de la propia app, de agentes por el CLI o de fuera (Explorador, Blender, git…)
  useEffect(
    () =>
      window.buho.onCambio(async (c) => {
        if (c.tipo === 'proyecto') {
          setVista('inicio')
          setSel(null)
          return void cargarEstado()
        }
        if (c.tipo === 'pedir-miniatura' && c.ruta) {
          pintarYGuardar(c.ruta, undefined, c.peticion).catch((e) => console.error('miniatura', c.ruta, e))
          return
        }
        if (c.tipo === 'miniatura' && c.ruta) return refrescarMiniatura(c.ruta)
        if (c.tipo === 'abrir') {
          setVista('archivos')
          setSel(c.ruta ?? '')
          if (c.ruta) {
            const partes = c.ruta.split('/')
            setAbiertos((a) => new Set([...a, ...partes.slice(0, -1).map((_, i) => partes.slice(0, i + 1).join('/'))]))
          }
          return
        }
        await cargarArbol()
        setVersion((v) => v + 1)
        const rutas = c.rutas ?? []
        if (rutas.length) {
          setRecientes(new Set(rutas))
          setTimeout(() => setRecientes(new Set()), 3600)
        }
        if (c.origen === 'ia') {
          // Lo que hace un agente se ve: se abren las carpetas para enseñarlo y sale un aviso firmado
          setAbiertos((a) => {
            const n = new Set(a)
            for (const r of rutas) {
              const ps = r.split('/')
              for (let i = 1; i < ps.length; i++) n.add(ps.slice(0, i).join('/'))
            }
            return n
          })
          aviso(`${c.autor ?? 'IA'}: ${rutas.slice(0, 2).join(', ') || 'proyecto'}${rutas.length > 2 ? ` y ${rutas.length - 2} más` : ''}`, true)
          setUltimo(`${c.autor ?? 'IA'} · ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
        } else if (c.origen === 'externo') setUltimo(`cambio externo · ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
      }),
    [cargarArbol, cargarEstado, aviso]
  )

  useEffect(() => {
    if (proyecto) guardarLocal(clave(proyecto), JSON.stringify([...abiertos]))
  }, [abiertos, proyecto])

  // Buscador
  useEffect(() => {
    if (!q.trim() || !proyecto) return setRes([])
    const t = setTimeout(() => void window.buho.buscar(q).then(setRes), 160)
    return () => clearTimeout(t)
  }, [q, proyecto, version])

  useEffect(() => {
    if (!proyecto) return setTareas([])
    void window.buho.tareas().then(setTareas)
  }, [proyecto, version, arbol])

  // Al cambiar de archivo o de vista, el centro vuelve arriba
  useEffect(() => {
    document.querySelector('.principal')?.scrollTo(0, 0)
    setVerTexto(null)
  }, [sel, vista])

  const idx = useMemo(() => indexar(arbol), [arbol])
  const planos = useMemo(() => [...idx.values()], [idx])
  const elegido = sel ? idx.get(sel) ?? null : null

  const alternar = (r: string): void =>
    setAbiertos((a) => {
      const n = new Set(a)
      if (n.has(r)) n.delete(r)
      else n.add(r)
      return n
    })
  const ir = (r: string): void => {
    setVista(r ? 'archivos' : 'inicio')
    setQ('')
    setSel(r || null)
    const ps = r.split('/')
    setAbiertos((a) => new Set([...a, ...ps.slice(0, -1).map((_, i) => ps.slice(0, i + 1).join('/'))]))
  }
  const intentar = async (f: () => Promise<unknown>): Promise<void> => {
    try {
      await f()
    } catch (e) {
      aviso(limpiarError(e))
    }
  }
  const carpetaDe = (e: Entrada | null): string => (!e ? '' : e.clase === 'carpeta' ? e.ruta : padreDe(e.ruta))
  const nuevaNota = (c: string): void =>
    setPregunta({
      titulo: `Nueva nota en ${c || '/'}`,
      valor: '',
      ok: (t) =>
        void intentar(async () => {
          const n = await window.buho.crearNota(c, t)
          ir(n.ruta)
        })
    })
  const nuevaCarpeta = (c: string): void =>
    setPregunta({
      titulo: `Nueva carpeta en ${c || '/'}`,
      valor: '',
      ok: (t) =>
        void intentar(async () => {
          const n = await window.buho.crearCarpeta(c, t)
          ir(n.ruta)
        })
    })
  const subir = (c: string): void => void intentar(async () => {
    const xs = await window.buho.elegirArchivos(c)
    if (xs.length) aviso(`${xs.length} archivo(s) copiados a ${c || '/'}`)
  })
  const soltar = (c: string, fs: string[]): void => void intentar(async () => {
    const xs = await window.buho.anadir(c, fs)
    aviso(`${xs.length} archivo(s) copiados a ${c || '/'}`)
  })
  const mover = (r: string, d: string): void => void intentar(async () => {
    const x = await window.buho.mover(r, d)
    if (sel === r) setSel(x.ruta)
  })

  const abrirMenu = (e: Entrada, x: number, y: number): void => setMenu({ e, x, y })
  const accionArbol = (a: AccionArbol): void => {
    if (a.tipo === 'menu') setMenu({ e: a.e, x: a.x, y: a.y })
    else if (a.tipo === 'mover') mover(a.ruta, a.destino)
    else soltar(a.destino, a.archivos)
  }

  if (!cargado) return <div className="cargando" />

  const barra = (
    <header className="barra">
      <img src={logo} alt="" />
      <b>Búho Game Studio</b>
      {proyecto && <span className="proyecto-nombre">{proyecto.nombre}</span>}
      {proyecto && (
        <nav className="pestanas">
          {(
            [
              ['inicio', House, 'Inicio'],
              ['archivos', FolderTree, 'Archivos'],
              ['tareas', ListTodo, 'Tareas'],
              ['bugs', Bug, 'Bugs'],
              ['tablero', KanbanSquare, 'Estados'],
              ['actividad', Activity, 'Actividad'],
              ['conectores', Plug, 'Conectores'],
              ['ayuda', CircleHelp, 'Ayuda']
            ] as const
          ).map(([v, I, t]) => (
            <button key={v} className={`bb ${vista === v ? 'on' : ''}`} onClick={() => setVista(v)}>
              <I size={15} /> {t}
            </button>
          ))}
        </nav>
      )}
      <div className="acciones">
        <div className="temas-caja">
          <button className={`bb ${verTemas ? 'on' : ''}`} onClick={() => setVerTemas((x) => !x)} title="Estilo de la app">
            <Palette size={15} /> Estilo
          </button>
          {verTemas && (
            <>
              <div className="velo-menu" onClick={() => setVerTemas(false)} />
              <div className="temas">
                <div className="etiqueta">Estilo de la app</div>
                {TEMAS.map((t) => (
                  <button
                    key={t.id}
                    className={`tema ${(ajustes?.tema ?? 'claude') === t.id ? 'on' : ''}`}
                    onClick={() => {
                      aplicarTema(t.id)
                      void window.buho.guardarAjustes({ tema: t.id }).then(setAjustes)
                    }}
                  >
                    <span className="muestras">
                      {t.muestra.map((c) => (
                        <i key={c} style={{ background: c }} />
                      ))}
                    </span>
                    <span className="tema-txt">
                      <b>{t.nombre}</b>
                      <span className="pequeno muted">{t.descripcion}</span>
                    </span>
                    {(ajustes?.tema ?? 'claude') === t.id && <Check size={16} className="c-acc" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button className="bb" onClick={() => void intentar(async () => (await window.buho.elegirCarpeta()) && (await cargarEstado()))} title="Abrir otra carpeta como proyecto">
          <FolderOpen size={15} /> Abrir carpeta
        </button>
        {proyecto && (
          <button
            className="bb"
            title="Cerrar el proyecto y volver a la portada"
            onClick={() =>
              void window.buho.cerrarProyecto().then(() => {
                setSel(null)
                void cargarEstado()
              })
            }
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </header>
  )

  if (!proyecto)
    return (
      <div className="app sin-proyecto">
        {barra}
        <Portada ajustes={ajustes} abierto={() => void cargarEstado()} recargar={() => void cargarEstado()} aviso={aviso} />
        <Avisos avisos={avisos} />
      </div>
    )

  const tareaElegida = elegido ? tareas.find((t) => t.ruta === elegido.ruta) ?? null : null
  const hijosDe = (r: string): Entrada[] => (r ? idx.get(r)?.hijos ?? [] : arbol)
  let centro: React.ReactNode
  if (q.trim())
    centro = (
      <div className="pagina">
        <h1 className="h-pagina">Buscar «{q}»</h1>
        <ul className="resultados">
          {res.length === 0 && <li className="muted">Nada encontrado.</li>}
          {res.map((r) => {
            const I = ICONO[r.clase]
            return (
              <li key={r.ruta}>
                <button onClick={() => ir(r.ruta)}>
                  <I size={16} className={`c-${r.clase}`} />
                  <span>
                    <b>{r.nombre}</b> <span className="mono muted pequeno">{r.ruta}</span>
                    {r.fragmento && <span className="frag">…{r.fragmento}…</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  else if (vista === 'inicio')
    centro = (
      <Inicio
        proyecto={proyecto}
        arbol={arbol}
        planos={planos}
        version={version}
        ir={ir}
        irVista={(v) => setVista(v)}
        menu={abrirMenu}
        tareasAbiertas={tareas.filter((t) => t.tipo !== 'bug' && t.estado !== 'hecha').length}
        bugsAbiertos={tareas.filter((t) => t.tipo === 'bug' && t.estado !== 'hecha')}
        crearIaContext={() =>
          void intentar(async () => {
            await window.buho.escribir('Contexto/ia_context.md', PLANTILLA_IA_CONTEXT(proyecto.nombre))
            ir('Contexto/ia_context.md')
          })
        }
      />
    )
  else if (vista === 'tareas') centro = <TareasVista tareas={tareas} idx={idx} abrir={ir} aviso={aviso} menu={abrirMenu} />
  else if (vista === 'ayuda') centro = <Ayuda />
  else if (vista === 'bugs') centro = <BugsVista tareas={tareas} idx={idx} abrir={ir} menu={abrirMenu} nuevo={() => setFormTarea({ tipo: 'bug', estado: 'por-hacer' })} />
  else if (vista === 'tablero') centro = <Tablero planos={planos} abrir={ir} />
  else if (vista === 'actividad') centro = <Actividad version={version} abrir={ir} />
  else if (vista === 'conectores')
    centro = (
      <Conectores
        proyecto={proyecto}
        ajustes={ajustes}
        version={version}
        aviso={aviso}
        guardarAjustes={(a) => void window.buho.guardarAjustes(a).then(setAjustes)}
      />
    )
  else if (elegido && tareaElegida && verTexto !== elegido.ruta)
    centro = (
      <div className="pagina archivo">
        <Migas ruta={elegido.ruta} nombre={proyecto.nombre} ir={ir} />
        <h1 className="h-pagina">
          {tareaElegida.tipo === 'bug' ? <Bug size={24} className="c-bug" /> : <ListTodo size={24} className="c-acc" />} {tareaElegida.titulo}
          <IdChip id={tareaElegida.id} ruta={tareaElegida.ruta} nombre={tareaElegida.titulo} />
        </h1>
        <TareaVista t={tareaElegida} idx={idx} abrir={ir} aviso={aviso} editarTexto={() => setVerTexto(elegido.ruta)} />
      </div>
    )
  else if (elegido && elegido.clase !== 'carpeta')
    centro = (
      <ArchivoVista
        key={elegido.ruta}
        e={elegido}
        idx={idx}
        hermanos={(padreDe(elegido.ruta) ? idx.get(padreDe(elegido.ruta))?.hijos ?? [] : arbol).filter((h) => h.clase !== 'carpeta')}
        abrir={ir}
        nombreProyecto={proyecto.nombre}
      />
    )
  else
    centro = (
      <Galeria
        carpeta={elegido}
        hijos={hijosDe(elegido?.ruta ?? '')}
        nombreProyecto={proyecto.nombre}
        ir={ir}
        sel={sel}
        nuevaNota={nuevaNota}
        nuevaCarpeta={nuevaCarpeta}
        subir={subir}
        soltar={soltar}
        mover={mover}
        menu={abrirMenu}
      />
    )

  return (
    <div className={`app vista-${vista}`}>
      {barra}
      <aside className="lateral">
        <div className="buscador">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el proyecto…" />
          {q && (
            <button className="icono" onClick={() => setQ('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="herramientas">
          <button className={`inicio ${vista === 'inicio' ? 'on' : ''}`} onClick={() => ir('')} title="Inicio del proyecto">
            {proyecto.nombre}
          </button>
          <button className="icono" title="Nueva nota" onClick={() => nuevaNota(carpetaDe(elegido))}>
            <FilePlus2 size={16} />
          </button>
          <button className="icono" title="Nueva carpeta" onClick={() => nuevaCarpeta(carpetaDe(elegido))}>
            <FolderPlus size={16} />
          </button>
          <button className="icono" title="Subir archivos" onClick={() => subir(carpetaDe(elegido))}>
            <Upload size={16} />
          </button>
        </div>
        <Arbol nodos={arbol} sel={sel} abiertos={abiertos} recientes={recientes} alternar={alternar} elegir={ir} accion={accionArbol} />
      </aside>
      <main className="principal">{centro}</main>
      <Panel e={vista === 'archivos' && !q ? elegido : null} esTarea={!!tareaElegida} version={version} nombreProyecto={proyecto.nombre} aviso={aviso} />
      <footer className="estado">
        <span className="mono">{proyecto.raiz}</span>
        <span>{planos.filter((x) => x.clase !== 'carpeta').length} archivos</span>
        {proyecto.enlaces.unity && <span title={proyecto.enlaces.unity}>Unity enlazado</span>}
        {ultimo && (
          <span>
            <Bot size={12} /> {ultimo}
          </span>
        )}
        <span className="der">
          <i className={`punto ${api ? 'ok' : ''}`} /> {api ? `API ${api.replace('http://', '')} · buho-studio` : 'API apagada'}
        </span>
      </footer>
      {menu && (
        <>
          <div className="velo-menu" onClick={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))} />
          <div className="menu" style={{ left: Math.min(menu.x, window.innerWidth - 250), top: Math.min(menu.y, window.innerHeight - 280) }} onClick={() => setMenu(null)}>
            {menu.e?.id && (
              <>
                <button onClick={() => void copiarId(menu.e!.id)}>
                  Copiar ID <span className="mono muted pequeno der">{menu.e.id}</span>
                </button>
                <button onClick={() => void copiarId(menu.e!.id, `${menu.e!.id} · ${menu.e!.titulo ?? menu.e!.nombre} · ${menu.e!.ruta}`)}>Copiar ID con nombre y ruta</button>
                <button onClick={() => setFormTarea({ enlaces: [menu.e!.id], estado: 'por-hacer' })}>Nueva tarea con esto…</button>
                <button onClick={() => setFormTarea({ enlaces: [menu.e!.id], estado: 'por-hacer', tipo: 'bug' })}>Nuevo bug con esto…</button>
                <hr />
              </>
            )}
            <button onClick={() => nuevaNota(carpetaDe(menu.e))}>Nueva nota</button>
            <button onClick={() => nuevaCarpeta(carpetaDe(menu.e))}>Nueva carpeta</button>
            <button onClick={() => subir(carpetaDe(menu.e))}>Subir archivos…</button>
            {menu.e && (
              <>
                <hr />
                <button
                  onClick={() => {
                    const e = menu.e!
                    setPregunta({
                      titulo: `Renombrar «${e.nombre}»`,
                      valor: e.nombre,
                      ok: (n) =>
                        void intentar(async () => {
                          const x = await window.buho.renombrar(e.ruta, n)
                          if (sel === e.ruta) setSel(x.ruta)
                        })
                    })
                  }}
                >
                  Renombrar
                </button>
                <button onClick={() => void window.buho.revelar(menu.e!.ruta)}>Mostrar en el Explorador</button>
                <hr />
                <button
                  className="peligro"
                  onClick={() => {
                    const e = menu.e!
                    if (confirm(`¿Enviar «${e.nombre}» a la papelera de Windows?`))
                      void intentar(async () => {
                        await window.buho.borrar(e.ruta)
                        if (sel === e.ruta) setSel(null)
                        aviso(`«${nombreDe(e.ruta)}» está en la papelera`)
                      })
                  }}
                >
                  Enviar a la papelera
                </button>
              </>
            )}
          </div>
        </>
      )}
      {pregunta && <Preguntar p={pregunta} cerrar={() => setPregunta(null)} />}
      {formTarea && (
        <FormTarea
          titulo={formTarea.tipo === 'bug' ? 'Nuevo bug' : 'Nueva tarea'}
          inicial={formTarea}
          idx={idx}
          cerrar={() => setFormTarea(null)}
          guardar={async (d) => {
            const t = await window.buho.crearTarea(d)
            aviso(`${t.tipo === 'bug' ? 'Bug abierto' : 'Tarea creada'}: ${t.id}`)
          }}
        />
      )}
      <Avisos avisos={avisos} />
    </div>
  )
}

function Preguntar({ p, cerrar }: { p: Pregunta; cerrar: () => void }): React.JSX.Element {
  const [v, setV] = useState(p.valor)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const i = ref.current
    if (!i) return
    i.focus()
    // Al renombrar, se selecciona el nombre sin la extensión
    const punto = p.valor.lastIndexOf('.')
    i.setSelectionRange(0, punto > 0 ? punto : p.valor.length)
  }, [p.valor])
  return (
    <div className="velo" onMouseDown={cerrar}>
      <form
        className="dialogo"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!v.trim()) return
          p.ok(v.trim())
          cerrar()
        }}
      >
        <h3>{p.titulo}</h3>
        <input ref={ref} className="campo" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && cerrar()} />
        <div className="fila fin">
          <button type="button" className="btn" onClick={cerrar}>
            Cancelar
          </button>
          <button className="btn primario">Aceptar</button>
        </div>
      </form>
    </div>
  )
}

function Avisos({ avisos }: { avisos: { id: number; texto: string; ia?: boolean }[] }): React.JSX.Element {
  return (
    <div className="avisos">
      {avisos.map((a) => (
        <div key={a.id} className={`toast ${a.ia ? 'ia' : ''}`}>
          {a.ia && <Bot size={15} />} {a.texto}
        </div>
      ))}
    </div>
  )
}
