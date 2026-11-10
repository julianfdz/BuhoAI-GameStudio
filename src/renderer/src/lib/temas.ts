/**
 * Estilos de la app (botón de la paleta en la barra). Cada tema es un juego de variables CSS: barra, lateral,
 * fondo, paneles, acento, botones principales y el «escenario» (fondo de visores 3D, vídeo y código), que va
 * siempre oscuro para que los modelos y los gameplays se vean bien. Los colores de los estados no cambian.
 */
export interface Tema {
  id: string
  nombre: string
  descripcion: string
  oscuro?: boolean
  /** Colores para la muestra del selector */
  muestra: string[]
  vars: Record<string, string>
}

const SANS = "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"
const ARCADE = "Bahnschrift, 'Segoe UI Variable Display', 'Segoe UI', sans-serif"

export const TEMAS: Tema[] = [
  {
    id: 'buho',
    nombre: 'Búho',
    descripcion: 'Navy y turquesa, la marca de Búho AI',
    muestra: ['#0a1f3a', '#00c1b8', '#f4f7fa', '#14304f'],
    vars: {
      '--bg': '#f4f7fa', '--panel': '#ffffff', '--fg': '#0a1f3a', '--muted': '#5b6b80', '--line': '#d5dde7', '--line-soft': '#e8edf3', '--soft': '#eef3f8', '--input': '#ffffff',
      '--acc': '#00c1b8', '--acc-2': '#00a39b', '--acc-suave': '#d8f6f4', '--acc-fg': '#0a1f3a',
      '--barra': '#0a1f3a', '--barra-fg': '#ffffff', '--barra-linea': 'linear-gradient(90deg, #00c1b8 0, #00c1b8 22%, #0a8f8c 22%, #0a8f8c 24%, #0b5c66 24%, #14304f 100%)',
      '--side': '#0d2340', '--side-2': '#14304f', '--side-3': '#1d3d63', '--side-fg': '#dbe6f2', '--side-muted': '#8aa1bb', '--side-fuerte': '#ffffff',
      '--sel-bg': '#00c1b8', '--sel-fg': '#0a1f3a', '--primario': '#0a1f3a', '--primario-fg': '#ffffff',
      '--escenario': '#0d2340', '--escenario-2': '#1d3d63', '--sombra': 'rgba(10, 31, 58, 0.12)', '--titulos': SERIF
    }
  },
  {
    id: 'noche',
    nombre: 'Búho noche',
    descripcion: 'Oscuro azul con turquesa, para trabajar de noche',
    oscuro: true,
    muestra: ['#070d18', '#111a2b', '#00c1b8', '#e3ebf5'],
    vars: {
      '--bg': '#0b1220', '--panel': '#111a2b', '--fg': '#e3ebf5', '--muted': '#8ea0b8', '--line': '#24324a', '--line-soft': '#1b2638', '--soft': '#172236', '--input': '#0e1727',
      '--acc': '#00c1b8', '--acc-2': '#2dd4cc', '--acc-suave': '#0f3a3a', '--acc-fg': '#04201f',
      '--barra': '#070d18', '--barra-fg': '#ffffff', '--barra-linea': 'linear-gradient(90deg, #00c1b8, #0b5c66 40%, transparent)',
      '--side': '#0a1322', '--side-2': '#132036', '--side-3': '#1e2e48', '--side-fg': '#cfdbea', '--side-muted': '#7f93ad', '--side-fuerte': '#ffffff',
      '--sel-bg': '#00c1b8', '--sel-fg': '#04201f', '--primario': '#00c1b8', '--primario-fg': '#04201f',
      '--escenario': '#060b14', '--escenario-2': '#13213a', '--sombra': 'rgba(0, 0, 0, 0.45)', '--titulos': SERIF
    }
  },
  {
    id: 'claude',
    nombre: 'Claude',
    descripcion: 'Crema cálido y terracota',
    muestra: ['#faf9f5', '#f0eee6', '#d97757', '#141413'],
    vars: {
      '--bg': '#faf9f5', '--panel': '#ffffff', '--fg': '#141413', '--muted': '#73726c', '--line': '#e0dccf', '--line-soft': '#ebe8de', '--soft': '#f0eee6', '--input': '#ffffff',
      '--acc': '#d97757', '--acc-2': '#c15f3c', '--acc-suave': '#f6e3da', '--acc-fg': '#ffffff',
      '--barra': '#f0eee6', '--barra-fg': '#141413', '--barra-linea': 'linear-gradient(90deg, #d97757, #d97757 18%, transparent 18%)',
      '--side': '#f5f4ee', '--side-2': '#ffffff', '--side-3': '#e0dccf', '--side-fg': '#3d3d3a', '--side-muted': '#8a877f', '--side-fuerte': '#141413',
      '--sel-bg': '#e8e4d8', '--sel-fg': '#141413', '--primario': '#d97757', '--primario-fg': '#ffffff',
      '--escenario': '#1f1e1d', '--escenario-2': '#3a3936', '--sombra': 'rgba(20, 20, 19, 0.08)', '--titulos': SERIF
    }
  },
  {
    id: 'buho-ai',
    nombre: 'Búho AI tinta',
    descripcion: 'Negro tinta, crema y dorado',
    muestra: ['#0f0f0f', '#f2efe3', '#dfc290', '#fbf9f3'],
    vars: {
      '--bg': '#f8f6f2', '--panel': '#fffdf8', '--fg': '#0f0f0f', '--muted': '#5e5a50', '--line': '#ddd8c9', '--line-soft': '#ebe7da', '--soft': '#f2efe3', '--input': '#ffffff',
      '--acc': '#c9a25c', '--acc-2': '#9c7a37', '--acc-suave': '#f1e4c8', '--acc-fg': '#0f0f0f',
      '--barra': '#0f0f0f', '--barra-fg': '#f2efe3', '--barra-linea': 'linear-gradient(90deg, #dfc290, #dfc290 22%, transparent 22%)',
      '--side': '#161614', '--side-2': '#24231f', '--side-3': '#34322c', '--side-fg': '#ebe7d8', '--side-muted': '#9b968a', '--side-fuerte': '#ffffff',
      '--sel-bg': '#dfc290', '--sel-fg': '#0f0f0f', '--primario': '#0f0f0f', '--primario-fg': '#dfc290',
      '--escenario': '#161512', '--escenario-2': '#2c2a24', '--sombra': 'rgba(15, 15, 15, 0.1)', '--titulos': SERIF
    }
  },
  {
    id: 'arcade',
    nombre: 'Arcade',
    descripcion: 'Neón magenta y cian sobre morado noche',
    oscuro: true,
    muestra: ['#0e0b1f', '#ff3ea5', '#36e3ff', '#2c2358'],
    vars: {
      '--bg': '#0e0b1f', '--panel': '#17122e', '--fg': '#f1ecff', '--muted': '#a79cc9', '--line': '#2e2552', '--line-soft': '#221b40', '--soft': '#1d1739', '--input': '#120e26',
      '--acc': '#ff3ea5', '--acc-2': '#36e3ff', '--acc-suave': '#3a1440', '--acc-fg': '#ffffff',
      '--barra': '#0a0718', '--barra-fg': '#ffffff', '--barra-linea': 'linear-gradient(90deg, #ff3ea5, #a855f7 50%, #36e3ff)',
      '--side': '#0c0920', '--side-2': '#1a1438', '--side-3': '#2c2358', '--side-fg': '#d9d0ff', '--side-muted': '#8b80b8', '--side-fuerte': '#ffffff',
      '--sel-bg': '#ff3ea5', '--sel-fg': '#ffffff', '--primario': '#ff3ea5', '--primario-fg': '#ffffff',
      '--escenario': '#07051a', '--escenario-2': '#1c1640', '--sombra': 'rgba(255, 62, 165, 0.18)', '--titulos': ARCADE
    }
  },
  {
    id: 'bn',
    nombre: 'Blanco y negro',
    descripcion: 'Sin color: blanco, negro y grises',
    muestra: ['#ffffff', '#000000', '#e4e4e4', '#8a8a8a'],
    vars: {
      '--bg': '#ffffff', '--panel': '#ffffff', '--fg': '#000000', '--muted': '#6b6b6b', '--line': '#cfcfcf', '--line-soft': '#e8e8e8', '--soft': '#f4f4f4', '--input': '#ffffff',
      '--acc': '#000000', '--acc-2': '#000000', '--acc-suave': '#e4e4e4', '--acc-fg': '#ffffff',
      '--barra': '#000000', '--barra-fg': '#ffffff', '--barra-linea': '#000000', '--barra-acento': '#ffffff',
      '--side': '#ffffff', '--side-2': '#f4f4f4', '--side-3': '#000000', '--side-fg': '#1a1a1a', '--side-muted': '#7a7a7a', '--side-fuerte': '#000000',
      '--sel-bg': '#000000', '--sel-fg': '#ffffff', '--primario': '#000000', '--primario-fg': '#ffffff',
      '--escenario': '#111111', '--escenario-2': '#2a2a2a', '--sombra': 'rgba(0, 0, 0, 0.1)', '--titulos': SANS
    }
  }
]

export const temaDe = (id?: string): Tema => TEMAS.find((t) => t.id === id) ?? TEMAS[0]

/** Pone el tema en la página y le dice al proceso principal de qué color pintar los botones de la ventana. */
export function aplicarTema(id?: string): Tema {
  const t = temaDe(id)
  const root = document.documentElement
  root.style.setProperty('--barra-acento', t.vars['--acc'])
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v)
  root.style.colorScheme = t.oscuro ? 'dark' : 'light'
  root.dataset.tema = t.id
  void window.buho.colorVentana(t.vars['--barra'], t.vars['--barra-fg'])
  return t
}
