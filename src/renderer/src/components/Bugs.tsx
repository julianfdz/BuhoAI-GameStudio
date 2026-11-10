import { useMemo, useState } from 'react'
import { Bug, Flame, MessageSquare, Plus, RotateCcw, Search } from 'lucide-react'
import { ESTADOS_TAREA, GRAVEDADES, REPRODUCE, type Entrada, type Tarea } from '@shared/types'
import { Collage } from './Inicio'
import { IdChip } from './IdChip'

const DIA = 864e5
const dias = (a?: string, b?: string | number): number => (a ? ((b ? new Date(b).getTime() : Date.now()) - new Date(a).getTime()) / DIA : 0)
const fmtDias = (d: number): string => (d * 24 < 1 ? '<1 h' : d < 1 ? `${Math.round(d * 24)} h` : `${d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d)} d`)
const lunes = (f: Date): Date => {
  const d = new Date(f.getFullYear(), f.getMonth(), f.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

/** Abiertos y cerrados por semana (últimas 10) y abiertos acumulados al final de cada una. */
function Semanas({ bugs }: { bugs: Tarea[] }): React.JSX.Element {
  const semanas = useMemo(() => {
    const hoy = lunes(new Date())
    return Array.from({ length: 10 }, (_, i) => {
      const ini = new Date(hoy.getTime() - (9 - i) * 7 * DIA)
      const fin = new Date(ini.getTime() + 7 * DIA)
      const entre = (f?: string): boolean => !!f && new Date(f) >= ini && new Date(f) < fin
      return {
        etiqueta: ini.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        abiertos: bugs.filter((b) => entre(b.creada)).length,
        cerrados: bugs.filter((b) => entre(b.cerrada)).length,
        vivos: bugs.filter((b) => b.creada && new Date(b.creada) < fin && (!b.cerrada || new Date(b.cerrada) >= fin)).length
      }
    })
  }, [bugs])
  const max = Math.max(1, ...semanas.flatMap((s) => [s.abiertos, s.cerrados, s.vivos]))
  const W = 620
  const H = 150
  const col = W / semanas.length
  const y = (v: number): number => H - 18 - (v / max) * (H - 34)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafica-semanas" role="img" aria-label="Bugs abiertos y cerrados por semana">
      {semanas.map((s, i) => (
        <g key={i} transform={`translate(${i * col},0)`}>
          <rect x={col * 0.18} y={y(s.abiertos)} width={col * 0.3} height={H - 18 - y(s.abiertos)} className="barra-abre" rx="3">
            <title>{`Semana del ${s.etiqueta}: ${s.abiertos} abiertos, ${s.cerrados} cerrados, ${s.vivos} vivos al final`}</title>
          </rect>
          <rect x={col * 0.52} y={y(s.cerrados)} width={col * 0.3} height={H - 18 - y(s.cerrados)} className="barra-cierra" rx="3" />
          <text x={col / 2} y={H - 4} textAnchor="middle" className="eje">
            {s.etiqueta}
          </text>
        </g>
      ))}
      <polyline className="linea-vivos" fill="none" points={semanas.map((s, i) => `${i * col + col / 2},${y(s.vivos)}`).join(' ')} />
      {semanas.map((s, i) => (
        <circle key={i} cx={i * col + col / 2} cy={y(s.vivos)} r="3" className="punto-vivos" />
      ))}
    </svg>
  )
}

/** Vista de Bugs: cifras, histórico semanal, por build, zonas calientes y la lista con filtros. */
export function BugsVista(p: { tareas: Tarea[]; idx: Map<string, Entrada>; abrir: (r: string) => void; nuevo: () => void; menu: (e: Entrada, x: number, y: number) => void }): React.JSX.Element {
  const bugs = useMemo(() => p.tareas.filter((t) => t.tipo === 'bug'), [p.tareas])
  const [ver, setVer] = useState<'abiertos' | 'cerrados' | 'todos'>('abiertos')
  const [gravedad, setGravedad] = useState('')
  const [build, setBuild] = useState('')
  const [q, setQ] = useState('')
  const porId = useMemo(() => new Map([...p.idx.values()].map((x) => [x.id, x])), [p.idx])

  const abiertos = bugs.filter((b) => b.estado !== 'hecha')
  const cerrados = bugs.filter((b) => b.estado === 'hecha')
  const recientes = cerrados.filter((b) => dias(b.cerrada) <= 30)
  const conTiempo = cerrados.filter((b) => b.creada && b.cerrada)
  const medio = conTiempo.length ? conTiempo.reduce((s, b) => s + dias(b.creada, b.cerrada), 0) / conTiempo.length : null
  const viejo = [...abiertos].sort((a, b) => (a.creada ?? '').localeCompare(b.creada ?? ''))[0]
  const reabiertos = bugs.filter((b) => b.reabierta).length
  const builds = [...new Set(bugs.map((b) => b.build).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a, 'es', { numeric: true }))
  const calientes = useMemo(() => {
    const m = new Map<string, { abiertos: number; total: number }>()
    for (const b of bugs) for (const id of b.enlaces) {
      const x = m.get(id) ?? { abiertos: 0, total: 0 }
      x.total++
      if (b.estado !== 'hecha') x.abiertos++
      m.set(id, x)
    }
    return [...m.entries()].sort((a, b) => b[1].abiertos - a[1].abiertos || b[1].total - a[1].total).slice(0, 6)
  }, [bugs])

  const lista = bugs
    .filter((b) => (ver === 'todos' ? true : ver === 'abiertos' ? b.estado !== 'hecha' : b.estado === 'hecha'))
    .filter((b) => (!gravedad || b.gravedad === gravedad) && (!build || b.build === build))
    .filter((b) => !q.trim() || `${b.titulo} ${b.id} ${b.descripcion} ${b.asignada ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => GRAVEDADES.findIndex((g) => g.id === a.gravedad) - GRAVEDADES.findIndex((g) => g.id === b.gravedad) || (a.creada ?? '').localeCompare(b.creada ?? ''))

  return (
    <div className="pagina ancha bugs-pagina">
      <div className="cabecera">
        <div>
          <h1 className="h-pagina">
            <Bug size={26} className="c-bug" /> Bugs
          </h1>
          <p className="muted">
            Cada bug es una tarea con <span className="mono">tipo: bug</span> en <span className="mono">Tareas/Bugs/</span>: se mueve en el Kanban como cualquier tarea y aquí se ve
            su histórico.
          </p>
        </div>
        <button className="btn primario" onClick={p.nuevo}>
          <Plus size={15} /> Nuevo bug
        </button>
      </div>

      <section className="cifras-bugs">
        <div className="cifra-bug grande">
          <b>{abiertos.length}</b>
          <span>abiertos</span>
          <span className="gravedades">
            {GRAVEDADES.map((g) => (
              <i key={g.id} className={`g-${g.id}`} title={g.nombre}>
                {abiertos.filter((b) => b.gravedad === g.id).length} {g.nombre.toLowerCase()}
              </i>
            ))}
          </span>
        </div>
        <div className="cifra-bug">
          <b>{recientes.length}</b>
          <span>cerrados en 30 días</span>
        </div>
        <div className="cifra-bug">
          <b>{medio === null ? '—' : fmtDias(medio)}</b>
          <span>tiempo medio de arreglo</span>
        </div>
        <button className="cifra-bug" disabled={!viejo} onClick={() => viejo && p.abrir(viejo.ruta)} title={viejo?.titulo}>
          <b>{viejo ? fmtDias(dias(viejo.creada)) : '—'}</b>
          <span>el abierto más antiguo</span>
        </button>
        <div className="cifra-bug">
          <b>{reabiertos}</b>
          <span>
            <RotateCcw size={11} /> reabiertos alguna vez
          </span>
        </div>
      </section>

      <div className="bugs-paneles">
        <div className="panel-bug">
          <div className="etiqueta">Por semana · <i className="ley abre" /> abiertos <i className="ley cierra" /> cerrados <i className="ley vivos" /> vivos</div>
          <Semanas bugs={bugs} />
        </div>
        <div className="panel-bug">
          <div className="etiqueta">Por build</div>
          {builds.length === 0 && <p className="muted pequeno">Ningún bug tiene build todavía (campo «Build» al crearlo).</p>}
          <ul className="por-build">
            {builds.slice(0, 8).map((b) => {
              const xs = bugs.filter((x) => x.build === b)
              const ab = xs.filter((x) => x.estado !== 'hecha').length
              return (
                <li key={b}>
                  <button className={build === b ? 'on' : ''} onClick={() => setBuild(build === b ? '' : b)}>
                    <span className="mono">{b}</span>
                    <span className="barrita">
                      <i className="ab" style={{ flex: ab }} />
                      <i className="ce" style={{ flex: xs.length - ab }} />
                    </span>
                    <span className="pequeno muted">
                      {ab}/{xs.length}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="panel-bug">
          <div className="etiqueta">
            <Flame size={13} /> Zonas calientes
          </div>
          {calientes.length === 0 && <p className="muted pequeno">Enlaza assets a los bugs (sus IDs) y aquí salen los que más fallan.</p>}
          <ul className="calientes">
            {calientes.map(([id, n]) => {
              const en = porId.get(id)
              return (
                <li key={id}>
                  <button onClick={() => en && p.abrir(en.ruta)} disabled={!en}>
                    <span className="mini-caliente">{en ? <Collage e={en} /> : '?'}</span>
                    <span className="crece">
                      <b>{en ? en.titulo ?? en.nombre : id}</b>
                      <span className="mono pequeno muted">{id}</span>
                    </span>
                    <span className="pequeno">
                      <b className="c-bug">{n.abiertos}</b> / {n.total}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="fila filtros" style={{ marginTop: 18 }}>
        <span className="segmentado">
          {(['abiertos', 'cerrados', 'todos'] as const).map((v) => (
            <button key={v} className={ver === v ? 'on' : ''} onClick={() => setVer(v)}>
              {v === 'abiertos' ? `Abiertos (${abiertos.length})` : v === 'cerrados' ? `Cerrados (${cerrados.length})` : `Todos (${bugs.length})`}
            </button>
          ))}
        </span>
        {GRAVEDADES.map((g) => (
          <button key={g.id} className={`chip ${gravedad === g.id ? 'on' : ''}`} onClick={() => setGravedad(gravedad === g.id ? '' : g.id)}>
            <i className={`bola g-${g.id}`} /> {g.nombre}
          </button>
        ))}
        {build && (
          <button className="chip on" onClick={() => setBuild('')}>
            build {build} ×
          </button>
        )}
        <span className="buscador-claro der">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar bug o ID…" />
        </span>
      </div>

      <table className="tabla-bugs">
        <thead>
          <tr>
            <th>Gravedad</th>
            <th>Bug</th>
            <th>Estado</th>
            <th>Build</th>
            <th>Se reproduce</th>
            <th>Asignado</th>
            <th>{ver === 'cerrados' ? 'Tardó' : 'Abierto hace'}</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 && (
            <tr>
              <td colSpan={7} className="muted vacio-tabla">
                {bugs.length ? 'Ningún bug con este filtro.' : 'Sin bugs todavía. «Nuevo bug», clic derecho en un asset → «Nuevo bug con esto…» o buho-studio bug nuevo.'}
              </td>
            </tr>
          )}
          {lista.map((b) => (
            <tr
              key={b.id}
              onClick={() => p.abrir(b.ruta)}
              onContextMenu={(e) => {
                const en = p.idx.get(b.ruta)
                if (!en) return
                e.preventDefault()
                p.menu(en, e.clientX, e.clientY)
              }}
            >
              <td>
                <span className={`sello-g g-${b.gravedad}`}>{GRAVEDADES.find((g) => g.id === b.gravedad)?.nombre}</span>
              </td>
              <td>
                <div className="fila" style={{ gap: 8, flexWrap: 'nowrap' }}>
                  <b className="titulo-bug">{b.titulo}</b>
                  <IdChip id={b.id} ruta={b.ruta} nombre={b.titulo} />
                  {b.reabierta ? (
                    <span className="pequeno c-bug" title={`Reabierto ${b.reabierta} veces`}>
                      <RotateCcw size={11} /> {b.reabierta}
                    </span>
                  ) : null}
                  {b.pendientes ? (
                    <span className="pequeno c-com">
                      <MessageSquare size={12} /> {b.pendientes}
                    </span>
                  ) : null}
                </div>
              </td>
              <td>
                <span className="fila pequeno" style={{ gap: 5 }}>
                  <i className={`bola t-${b.estado}`} /> {ESTADOS_TAREA.find((e) => e.id === b.estado)?.nombre}
                </span>
              </td>
              <td className="mono pequeno">{b.build ?? '—'}</td>
              <td className="pequeno">{REPRODUCE.find((r) => r.id === b.reproduce)?.nombre ?? '—'}</td>
              <td className="pequeno">{b.asignada ?? '—'}</td>
              <td className="pequeno">{b.estado === 'hecha' ? (b.cerrada && b.creada ? fmtDias(dias(b.creada, b.cerrada)) : '—') : fmtDias(dias(b.creada))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
