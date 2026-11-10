---
categoria: IA
resumen: El contexto del juego en notas atómicas y la nota ia_context.md para los agentes
---
# Contexto del juego e ia_context.md

La carpeta `Contexto/` es la biblia del juego, en notas Markdown **una por tema**: `Lore.md`, `Historia.md`, `Personajes.md`, `Mecánicas.md`, `Estilo visual.md`, `Objetivos.md`, `Referencias.md`… Así un agente lee solo lo que necesita para cada encargo, sin cargar todo.

## ia_context.md

`Contexto/ia_context.md` es la nota **para la IA**: la que un agente lee primero. Lleva lo que una persona del equipo ya sabe y un agente no:

- qué notas leer según el encargo;
- convenciones (nombres de archivos, carpetas, escalas, formatos);
- qué no tocar y qué hay que pedir antes;
- decisiones tomadas y cómo se prueba el juego.

Si falta, Inicio enseña un aviso con el botón **Crearla** (sale con una plantilla para rellenar). En proyectos nuevos ya viene.

## Cómo leen los agentes el contexto

```
buho-studio leer Contexto/ia_context.md
buho-studio arbol Contexto
buho-studio leer Contexto/Mecánicas.md
```

Consejo: notas cortas y separadas por tema, títulos claros y enlaces `[[Personajes]]` entre ellas.
