import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Entrada } from '@shared/types'
import { urlArchivo } from '@/lib/util'

marked.setOptions({ gfm: true, breaks: false })

/** Resuelve una ruta relativa a la carpeta de la nota («../Assets/x.png») a una ruta del proyecto. */
function resolver(src: string, carpeta: string): string {
  const partes = carpeta ? carpeta.split('/') : []
  for (const t of decodeURI(src).split('/')) {
    if (t === '..') partes.pop()
    else if (t && t !== '.') partes.push(t)
  }
  return partes.join('/')
}

/**
 * Pinta el Markdown de una nota. Imágenes y enlaces relativos («../Assets/Imágenes/x.png») se cargan del proyecto;
 * [[Nombre]] (como en Obsidian) abre el archivo del proyecto que se llame así.
 */
export function Markdown({ texto, carpeta, idx, abrir }: { texto: string; carpeta: string; idx: Map<string, Entrada>; abrir: (ruta: string) => void }): React.JSX.Element {
  const html = useMemo(() => {
    const porNombre = new Map<string, string>()
    for (const e of idx.values()) {
      porNombre.set(e.nombre.toLowerCase(), e.ruta)
      porNombre.set(e.nombre.replace(/\.[^.]+$/, '').toLowerCase(), e.ruta)
    }
    const conEnlaces = texto.replace(/(```[\s\S]*?```|`[^`\n]*`)|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, codigo?: string, destino?: string, alias?: string) => {
      if (codigo || !destino) return m
      const r = idx.has(destino) ? destino : porNombre.get(destino.trim().toLowerCase())
      const etq = (alias ?? destino).replace(/[<>]/g, '')
      return r ? `<a href="#" data-ruta="${encodeURIComponent(r)}" class="interno">${etq}</a>` : `<span class="roto" title="No existe en el proyecto">${etq}</span>`
    })
    const limpio = DOMPurify.sanitize(marked.parse(conEnlaces, { async: false }) as string, {
      ADD_ATTR: ['data-ruta'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|estudio|data|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
    })
    const doc = new DOMParser().parseFromString(`<div>${limpio}</div>`, 'text/html')
    doc.querySelectorAll('img[src]').forEach((im) => {
      const s = im.getAttribute('src')!
      if (!/^(https?:|data:|blob:|estudio:)/i.test(s)) im.setAttribute('src', urlArchivo(resolver(s, carpeta)))
    })
    doc.querySelectorAll('a[href]').forEach((a) => {
      const h = a.getAttribute('href')!
      if (!/^(https?:|mailto:|#|estudio:)/i.test(h)) {
        const r = resolver(h, carpeta)
        a.setAttribute('href', '#')
        a.setAttribute('data-ruta', encodeURIComponent(r))
        a.classList.add('interno')
      }
    })
    return doc.body.firstElementChild!.innerHTML
  }, [texto, carpeta, idx])

  return (
    <div
      className="md"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a')
        if (!a) return
        const r = a.getAttribute('data-ruta')
        if (r) {
          e.preventDefault()
          abrir(decodeURIComponent(r))
        } else if (a.getAttribute('href')?.startsWith('#')) e.preventDefault()
      }}
    />
  )
}
