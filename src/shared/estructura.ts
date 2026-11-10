/**
 * Para qué sirve cada carpeta de la plantilla. Lo usan la app (cabeceras de Inicio y de la galería), la plantilla
 * del LEEME y la ayuda, para que personas y agentes sepan dónde va cada cosa. Si una carpeta tiene ficha propia
 * (descripción), manda la ficha.
 */
export const CARPETAS: { ruta: string; para: string; cli?: string }[] = [
  { ruta: 'Contexto', para: 'La biblia del juego en notas Markdown, una por tema (lore, historia, personajes, mecánicas, estilo…). ia_context.md es la nota para la IA.', cli: 'buho-studio leer Contexto/ia_context.md' },
  { ruta: 'Assets', para: 'Todo lo que entra en el juego: modelos, mapas, sonidos, texturas, imágenes y animaciones. Cada asset con ficha (nombre y descripción) y estado.', cli: 'buho-studio anadir "Assets/Modelos 3D" arma.glb --nombre "…" --descripcion "…"' },
  { ruta: 'Assets/Modelos 3D', para: 'Modelos (.glb, .fbx, .obj, .blend) por subcarpetas: armas, personajes, props…' },
  { ruta: 'Assets/Mapas', para: 'Niveles y mapas: datos (.json), escenas y bocetos de distribución.' },
  { ruta: 'Assets/Sonidos', para: 'Efectos y música (.ogg, .wav, .mp3).' },
  { ruta: 'Assets/Texturas', para: 'Texturas y materiales (.png, .jpg…).' },
  { ruta: 'Assets/Imágenes', para: 'Concept art, interfaz, retratos y otras imágenes 2D.' },
  { ruta: 'Assets/Animaciones', para: 'Animaciones (.fbx de Mixamo, .glb) para los personajes.' },
  { ruta: 'Tareas', para: 'Las tareas del Kanban (un .md por tarea, con cabecera tipo: tarea) y notas de hitos.', cli: 'buho-studio tarea nueva "Título" --asignada Claude' },
  { ruta: 'Capturas', para: 'Capturas y gameplays del juego para revisar o enseñar. Los vídeos se ven con el reproductor.' },
  { ruta: 'Builds', para: 'Versiones del juego que se prueban (ejecutables o enlaces) y sus notas de cambios.' },
  { ruta: 'Sin procesar', para: 'Bandeja de entrada: lo que llega y aún no se ha trabajado (notas, documentos, ideas, archivos). Se procesa solo cuando se pide; al procesarlo se mueve a su sitio.', cli: 'buho-studio anadir "Sin procesar" documento.pdf' }
]

export const paraQue = (ruta: string): string | undefined => CARPETAS.find((c) => c.ruta.toLowerCase() === ruta.toLowerCase())?.para
