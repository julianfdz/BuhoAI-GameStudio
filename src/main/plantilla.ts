import { PLANTILLA_IA_CONTEXT } from '@shared/plantillaIa'

/**
 * Plantilla estándar de un proyecto nuevo. Las claves que acaban en «/» son carpetas vacías; el resto, archivos.
 * Después todo es personalizable: son carpetas normales.
 */
export function PLANTILLA(nombre: string): Record<string, string> {
  const nota = (t: string, cuerpo: string): string => `# ${t}\n\n${cuerpo.trim()}\n`
  return {
    'LEEME.md': nota(
      nombre,
      `
Proyecto de **Búho Game Studio**. Es una carpeta normal: puedes abrirla con el Explorador, Blender, VS Code o git.

| Carpeta | Para qué |
|---|---|
| \`Contexto/\` | Lore, historia, personajes, estilo, objetivos y referencias, en Markdown |
| \`Assets/\` | Modelos 3D, mapas, sonidos, texturas, imágenes y animaciones |
| \`Tareas/\` | Hitos y lista de pendientes del equipo |
| \`Capturas/\` | Capturas del juego para revisar o enseñar |
| \`Builds/\` | Ejecutables o enlaces a las versiones que se prueban |
| \`Sin procesar/\` | Bandeja de entrada: lo que llega y aún no se ha trabajado; se procesa cuando se pide |

Cada archivo puede tener un **estado** (idea → en curso → revisar → aprobado) y **comentarios**. Los agentes de IA trabajan
con el CLI \`buho-studio\` y lo que hacen aparece al momento en la app.
`
    ),
    'Contexto/ia_context.md': PLANTILLA_IA_CONTEXT(nombre),
    'Contexto/Lore.md': nota('Lore', `
El mundo del juego: qué pasó antes, cómo funciona, qué reglas tiene.

- **Época y lugar:**
- **Qué ha pasado:**
- **Facciones o grupos:**
- **Reglas del mundo** (magia, tecnología, infección…):
`),
    'Contexto/Historia.md': nota('Historia', `
La historia que vive el jugador.

## Premisa

## Actos o capítulos

1.
2.
3.

## Final
`),
    'Contexto/Personajes.md': nota('Personajes', `
| Personaje | Papel | Rasgos | Aspecto |
|---|---|---|---|
| | Protagonista | | |
| | Antagonista | | |
`),
    'Contexto/Estilo visual.md': nota('Estilo visual', `
- **Tono:**
- **Paleta:**
- **Iluminación:**
- **Referencias** (juegos, películas, artistas):
- **Lo que NO queremos:**
`),
    'Contexto/Objetivos.md': nota('Objetivos', `
## Visión en una frase

## Público

## Plataformas

## Objetivos del proyecto

- [ ] Prototipo jugable
- [ ] Primer mapa completo
- [ ] Versión para probar con amigos
`),
    'Contexto/Mecánicas.md': nota('Mecánicas', `
## Bucle principal

## Controles

## Progresión
`),
    'Contexto/Referencias.md': nota('Referencias', `
Enlaces, juegos y documentos de inspiración. Las imágenes van en \`Assets/Imágenes/Referencias\`.
`),
    'Assets/Modelos 3D/': '',
    'Assets/Mapas/': '',
    'Assets/Sonidos/': '',
    'Assets/Texturas/': '',
    'Assets/Imágenes/': '',
    'Assets/Animaciones/': '',
    'Tareas/Hitos.md': nota('Hitos', `
| Hito | Fecha | Estado |
|---|---|---|
| Prototipo | | idea |
`),
    'Tareas/Pendientes.md': nota('Pendientes', `
- [ ]
`),
    'Capturas/': '',
    'Sin procesar/': '',
    'Builds/': ''
  }
}
