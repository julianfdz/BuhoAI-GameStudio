/** Tipos compartidos entre el proceso principal, el preload y la interfaz de Búho Game Studio. */

/** Estado de un asset o una nota en el flujo del equipo. */
export type EstadoAsset = 'idea' | 'en-curso' | 'revisar' | 'aprobado'
export const ESTADOS: { id: EstadoAsset; nombre: string }[] = [
  { id: 'idea', nombre: 'Idea' },
  { id: 'en-curso', nombre: 'En curso' },
  { id: 'revisar', nombre: 'Revisar' },
  { id: 'aprobado', nombre: 'Aprobado' }
]

/** Qué tipo de archivo es, para saber cómo enseñarlo. */
export type Clase = 'carpeta' | 'nota' | 'imagen' | 'modelo' | 'audio' | 'video' | 'texto' | 'otro'

export interface Entrada {
  /** Ruta relativa a la carpeta del proyecto, con «/». La raíz es «». */
  ruta: string
  nombre: string
  clase: Clase
  ext: string
  tam: number
  mtime: number
  estado?: EstadoAsset
  /** Nombre legible del asset (ficha). El archivo sigue llamándose `nombre`. */
  titulo?: string
  /** Para qué es, de dónde sale, cómo se usa en el juego (ficha). */
  descripcion?: string
  /** Comentarios sin resolver */
  pendientes?: number
  hijos?: Entrada[]
}

/** Ficha de un asset: nombre legible y descripción (.buhostudio/fichas.json). */
export interface Ficha {
  titulo?: string
  descripcion?: string
  autor: string
  fecha: string
}

export interface Proyecto {
  id: string
  nombre: string
  descripcion?: string
  creado: string
  version: 1
  /** Ruta absoluta de la carpeta (no se guarda en el json: se rellena al abrir) */
  raiz?: string
  /** Enlaces a otras herramientas: carpeta del proyecto de Unity, etc. Todos opcionales. */
  enlaces: { unity?: string; [k: string]: string | undefined }
  /** Ajustes de conectores (ComfyUI previsto). */
  conectores?: { comfyui?: { url?: string } }
}

export interface Comentario {
  id: string
  ruta: string
  texto: string
  autor: string
  origen: 'persona' | 'ia'
  fecha: string
  /** id del comentario al que responde */
  respuestaA?: string
  resuelto?: boolean
}

/** Una línea del historial firmado (.buhostudio/historial.jsonl). */
export interface Evento {
  fecha: string
  /** Quién firma: el nombre de la persona o del agente (--autor) */
  autor: string
  /** Usuario de la app (Ajustes) */
  usuario: string
  origen: 'persona' | 'ia' | 'externo'
  canal: 'app' | 'cli' | 'externo'
  equipo: string
  accion: string
  ruta: string
  detalle?: string
}

export interface Reciente {
  raiz: string
  nombre: string
  abierto: string
}

export interface Ajustes {
  /** Nombre con el que firma la persona que usa la app */
  autor: string
  recientes: Reciente[]
  ultimo?: string
}

export interface Conector {
  id: 'blender' | 'unity' | 'comfyui'
  nombre: string
  disponible: boolean
  detalle: string
  enlace?: string
}

export interface Cambio {
  tipo: 'arbol' | 'proyecto' | 'abrir' | 'comentarios' | 'miniatura' | 'pedir-miniatura'
  rutas?: string[]
  origen?: 'app' | 'ia' | 'externo'
  autor?: string
  ruta?: string
  peticion?: string
}

export interface Lectura {
  ruta: string
  texto: string
  mtime: number
}

export interface BuhoStudioApi {
  estado: () => Promise<{ proyecto: Proyecto | null; version: string; api: string | null }>
  ajustes: () => Promise<Ajustes>
  guardarAjustes: (a: Partial<Ajustes>) => Promise<Ajustes>
  elegirCarpeta: () => Promise<Proyecto | null>
  nuevoProyecto: (nombre: string) => Promise<Proyecto | null>
  abrirProyecto: (raiz: string) => Promise<Proyecto>
  cerrarProyecto: () => Promise<void>
  quitarReciente: (raiz: string) => Promise<Ajustes>
  arbol: () => Promise<Entrada[]>
  leer: (ruta: string) => Promise<Lectura>
  escribir: (ruta: string, texto: string) => Promise<Entrada>
  crearNota: (carpeta: string, titulo: string) => Promise<Entrada>
  crearCarpeta: (padre: string, nombre: string) => Promise<Entrada>
  anadir: (destino: string, archivos: string[]) => Promise<Entrada[]>
  elegirArchivos: (destino: string) => Promise<Entrada[]>
  mover: (ruta: string, destino: string) => Promise<Entrada>
  renombrar: (ruta: string, nombre: string) => Promise<Entrada>
  borrar: (ruta: string) => Promise<{ ok: boolean }>
  ponerEstado: (ruta: string, estado: string | null) => Promise<Entrada>
  ponerFicha: (ruta: string, cambios: { titulo?: string; descripcion?: string }) => Promise<Entrada>
  comentarios: (ruta?: string) => Promise<Comentario[]>
  comentar: (ruta: string, texto: string, respuestaA?: string) => Promise<Comentario>
  resolver: (id: string, resuelto: boolean) => Promise<Comentario>
  historial: (ruta?: string, max?: number) => Promise<Evento[]>
  buscar: (q: string) => Promise<{ ruta: string; nombre: string; clase: Clase; fragmento?: string }[]>
  miniatura: (ruta: string, forzar?: boolean) => Promise<string | null>
  guardarMiniatura: (ruta: string, png: string, peticion?: string) => Promise<string>
  conectores: () => Promise<Conector[]>
  enlazarUnity: (ruta: string | null) => Promise<Proyecto>
  elegirUnity: () => Promise<Proyecto | null>
  abrirEnBlender: (ruta: string) => Promise<{ ok: boolean; error?: string }>
  revelar: (ruta: string) => Promise<void>
  abrirFuera: (ruta: string) => Promise<void>
  rutaDeArchivo: (f: File) => string
  onCambio: (cb: (c: Cambio) => void) => () => void
}
