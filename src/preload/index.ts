import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { BuhoStudioApi, Cambio } from '@shared/types'

const i = (canal: string) => (...a: unknown[]) => ipcRenderer.invoke(canal, ...a)

const api: BuhoStudioApi = {
  estado: i('estado') as BuhoStudioApi['estado'],
  ajustes: i('ajustes') as BuhoStudioApi['ajustes'],
  guardarAjustes: i('guardarAjustes') as BuhoStudioApi['guardarAjustes'],
  elegirCarpeta: i('elegirCarpeta') as BuhoStudioApi['elegirCarpeta'],
  nuevoProyecto: i('nuevoProyecto') as BuhoStudioApi['nuevoProyecto'],
  abrirProyecto: i('abrirProyecto') as BuhoStudioApi['abrirProyecto'],
  cerrarProyecto: i('cerrarProyecto') as BuhoStudioApi['cerrarProyecto'],
  quitarReciente: i('quitarReciente') as BuhoStudioApi['quitarReciente'],
  arbol: i('arbol') as BuhoStudioApi['arbol'],
  leer: i('leer') as BuhoStudioApi['leer'],
  escribir: i('escribir') as BuhoStudioApi['escribir'],
  crearNota: i('crearNota') as BuhoStudioApi['crearNota'],
  crearCarpeta: i('crearCarpeta') as BuhoStudioApi['crearCarpeta'],
  anadir: i('anadir') as BuhoStudioApi['anadir'],
  elegirArchivos: i('elegirArchivos') as BuhoStudioApi['elegirArchivos'],
  mover: i('mover') as BuhoStudioApi['mover'],
  renombrar: i('renombrar') as BuhoStudioApi['renombrar'],
  borrar: i('borrar') as BuhoStudioApi['borrar'],
  ponerEstado: i('ponerEstado') as BuhoStudioApi['ponerEstado'],
  ponerFicha: i('ponerFicha') as BuhoStudioApi['ponerFicha'],
  colorVentana: i('colorVentana') as BuhoStudioApi['colorVentana'],
  copiar: i('copiar') as BuhoStudioApi['copiar'],
  tareas: i('tareas') as BuhoStudioApi['tareas'],
  crearTarea: i('crearTarea') as BuhoStudioApi['crearTarea'],
  editarTarea: i('editarTarea') as BuhoStudioApi['editarTarea'],
  pasoTarea: i('pasoTarea') as BuhoStudioApi['pasoTarea'],
  anadirPasoTarea: i('anadirPasoTarea') as BuhoStudioApi['anadirPasoTarea'],
  comentarios: i('comentarios') as BuhoStudioApi['comentarios'],
  comentar: i('comentar') as BuhoStudioApi['comentar'],
  resolver: i('resolver') as BuhoStudioApi['resolver'],
  historial: i('historial') as BuhoStudioApi['historial'],
  buscar: i('buscar') as BuhoStudioApi['buscar'],
  miniatura: i('miniatura') as BuhoStudioApi['miniatura'],
  guardarMiniatura: i('guardarMiniatura') as BuhoStudioApi['guardarMiniatura'],
  conectores: i('conectores') as BuhoStudioApi['conectores'],
  enlazarUnity: i('enlazarUnity') as BuhoStudioApi['enlazarUnity'],
  elegirUnity: i('elegirUnity') as BuhoStudioApi['elegirUnity'],
  abrirEnBlender: i('abrirEnBlender') as BuhoStudioApi['abrirEnBlender'],
  revelar: i('revelar') as BuhoStudioApi['revelar'],
  abrirFuera: i('abrirFuera') as BuhoStudioApi['abrirFuera'],
  /** Ruta real de un archivo arrastrado desde el Explorador */
  rutaDeArchivo: (f) => webUtils.getPathForFile(f),
  onCambio: (cb) => {
    const h = (_e: unknown, c: Cambio): void => cb(c)
    ipcRenderer.on('cambio', h)
    return () => ipcRenderer.removeListener('cambio', h)
  }
}

contextBridge.exposeInMainWorld('buho', api)
