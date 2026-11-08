import type { Entrada } from '@shared/types'

/** URL de un archivo del proyecto para <img>, <audio> o three.js. `v` evita la caché cuando cambia el archivo. */
export const urlArchivo = (ruta: string, v?: number): string => `estudio://f/${ruta.split('/').map(encodeURIComponent).join('/')}${v ? `?v=${v}` : ''}`

export const padreDe = (ruta: string): string => (ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/')) : '')
export const nombreDe = (ruta: string): string => ruta.split('/').pop() ?? ruta
export const sinExt = (n: string): string => n.replace(/\.[^.]+$/, '')

export function indexar(ns: Entrada[]): Map<string, Entrada> {
  const m = new Map<string, Entrada>()
  const ir = (xs: Entrada[]): void =>
    xs.forEach((x) => {
      m.set(x.ruta, x)
      ir(x.hijos ?? [])
    })
  ir(ns)
  return m
}

export function tam(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export function fecha(iso: string | number): string {
  const d = new Date(iso)
  const hoy = new Date()
  const mismoDia = d.toDateString() === hoy.toDateString()
  return mismoDia ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Cuántos archivos hay debajo de una carpeta. */
export const contar = (e: Entrada): number => (e.hijos ?? []).reduce((n, h) => n + (h.clase === 'carpeta' ? contar(h) : 1), 0)

export const leerLocal = (k: string): string | null => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
export const guardarLocal = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* sin almacenamiento */
  }
}
