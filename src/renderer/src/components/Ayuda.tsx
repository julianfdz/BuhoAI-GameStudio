import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import { Markdown } from './Markdown'

/**
 * Ayuda de la app: una página por tema en docs/ayuda/ (el número del nombre da el orden y el primer «#» el título;
 * la cabecera YAML lleva `categoria` y `resumen`). Va dentro de la app, sin conexión. Los agentes leen las mismas
 * páginas con `buho-studio ayuda <tema>`. Para añadir un tema basta con añadir un .md a esa carpeta.
 */
const ARCHIVOS = import.meta.glob('../../../../docs/ayuda/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const sinTildes = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const PAGINAS = Object.entries(ARCHIVOS)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([ruta, bruto]) => {
    const id = ruta.split('/').pop()!.replace(/\.md$/, '').replace(/^\d+-/, '')
    const cab = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(bruto)
    const campo = (k: string): string => new RegExp(`^${k}:\\s*(.+)$`, 'm').exec(cab?.[1] ?? '')?.[1].trim() ?? ''
    const texto = cab ? bruto.slice(cab[0].length) : bruto
    return { id, titulo: /^#\s+(.+)$/m.exec(texto)?.[1].trim() ?? id, categoria: campo('categoria') || 'Otros', resumen: campo('resumen'), texto, plano: sinTildes(texto) }
  })
const CATEGORIAS = [...new Set(PAGINAS.map((x) => x.categoria))]

export function Ayuda({ inicial }: { inicial?: string }): React.JSX.Element {
  const [id, setId] = useState(PAGINAS.some((x) => x.id === inicial) ? inicial! : PAGINAS[0]?.id ?? '')
  const [q, setQ] = useState('')
  const cuerpo = useRef<HTMLDivElement>(null)
  const pagina = PAGINAS.find((x) => x.id === id) ?? PAGINAS[0]
  const b = sinTildes(q.trim())
  const resultados = useMemo(() => (b ? PAGINAS.filter((x) => x.plano.includes(b) || sinTildes(x.titulo).includes(b)) : []), [b])
  useEffect(() => {
    cuerpo.current?.scrollTo(0, 0)
  }, [id])
  return (
    <div className="ayuda">
      <aside className="ayuda-indice">
        <div className="buscador-claro">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la ayuda…" />
          {q && (
            <button className="icono" onClick={() => setQ('')}>
              <X size={13} />
            </button>
          )}
        </div>
        {b ? (
          <ul>
            {resultados.length === 0 && <li className="muted pequeno">Nada encontrado.</li>}
            {resultados.map((x) => (
              <li key={x.id}>
                <button className={x.id === id ? 'on' : ''} onClick={() => setId(x.id)}>
                  {x.titulo}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          CATEGORIAS.map((c) => (
            <div key={c}>
              <div className="etiqueta">{c}</div>
              <ul>
                {PAGINAS.filter((x) => x.categoria === c).map((x) => (
                  <li key={x.id}>
                    <button className={x.id === id ? 'on' : ''} onClick={() => setId(x.id)} title={x.resumen}>
                      {x.titulo}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <p className="muted pequeno ayuda-cli">
          <BookOpen size={13} /> Los agentes leen esta misma ayuda con <span className="mono">buho-studio ayuda</span>.
        </p>
      </aside>
      <div className="ayuda-cuerpo" ref={cuerpo}>
        {pagina && (
          <div className="vista-md">
            <Markdown texto={pagina.texto} carpeta="" idx={new Map()} abrir={() => {}} />
          </div>
        )}
      </div>
    </div>
  )
}
