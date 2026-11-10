/** Plantilla de Contexto/ia_context.md: la nota que leen primero los agentes. */
export const PLANTILLA_IA_CONTEXT = (nombre: string): string => `# ia_context · ${nombre}

Nota para la IA: léela antes de trabajar en este proyecto. El resto del contexto está en las notas de \`Contexto/\`, una por tema.

## Qué leer según el encargo

| Encargo | Notas |
|---|---|
| Arte, modelos, texturas | [[Estilo visual]], [[Referencias]] |
| Personajes | [[Personajes]], [[Lore]] |
| Diseño de juego, niveles | [[Mecánicas]], [[Objetivos]] |
| Historia, textos | [[Historia]], [[Lore]] |

## Convenciones

- Nombres de archivo:
- Escala y unidades de los modelos:
- Formatos (modelos, texturas, sonidos):
- Cada asset nuevo lleva ficha (nombre y descripción) y estado «revisar».

## No tocar sin preguntar

-

## Decisiones tomadas

-

## Cómo se prueba el juego

-
`
