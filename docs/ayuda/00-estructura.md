---
categoria: Empezar
resumen: Para qué sirve cada carpeta, qué hay en .buhostudio y cómo se trabaja cada una con el CLI
---
# Estructura del proyecto

Un proyecto es una carpeta con esta forma. Las carpetas son normales: se pueden crear más, renombrar o anidar.

```
Mi juego/
├─ LEEME.md
├─ Sin procesar/        bandeja de entrada
├─ Contexto/            ia_context.md · Lore · Historia · Personajes · Mecánicas · Estilo visual · Objetivos · Referencias
├─ Assets/              Modelos 3D · Mapas · Sonidos · Texturas · Imágenes · Animaciones
├─ Tareas/              una nota por tarea (Kanban) · Hitos · Pendientes
├─ Capturas/            imágenes y gameplays
├─ Builds/              versiones que se prueban
└─ .buhostudio/         lo interno de la app (no se edita a mano)
```

## Para qué es cada carpeta

| Carpeta | Para qué | Con el CLI |
|---|---|---|
| `Sin procesar/` | Bandeja de entrada: lo que llega y aún no se ha trabajado (notas, documentos, ideas, archivos). **Se procesa solo cuando se pide**; al procesarlo se mueve a su sitio. | `buho-studio anadir "Sin procesar" documento.pdf` |
| `Contexto/` | La biblia del juego en notas Markdown, una por tema. `ia_context.md` es la nota para la IA. | `buho-studio leer Contexto/ia_context.md` |
| `Assets/` | Todo lo que entra en el juego. Cada asset con ficha (nombre y descripción) y estado. | `buho-studio anadir "Assets/Modelos 3D" arma.glb --nombre "…" --descripcion "…"` |
| `Assets/Modelos 3D/` | Modelos (.glb, .fbx, .obj, .blend) por subcarpetas: armas, personajes, props… | `buho-studio miniaturas "Assets/Modelos 3D"` |
| `Assets/Mapas/` | Niveles y mapas: datos (.json), escenas y bocetos. |  |
| `Assets/Sonidos/` | Efectos y música (.ogg, .wav, .mp3). |  |
| `Assets/Texturas/` | Texturas y materiales. |  |
| `Assets/Imágenes/` | Concept art, interfaz, retratos y otras imágenes 2D. |  |
| `Assets/Animaciones/` | Animaciones (.fbx de Mixamo, .glb). |  |
| `Tareas/` | Un .md por tarea con cabecera `tipo: tarea` (el Kanban) y notas de hitos. | `buho-studio tarea nueva "Título" --asignada Claude` |
| `Capturas/` | Capturas y gameplays para revisar o enseñar. | `buho-studio anadir Capturas/Gameplay partida.mp4` |
| `Builds/` | Versiones del juego que se prueban y sus notas de cambios. |  |

## Sin procesar: la bandeja de entrada

Para dejar algo «ahí metido» sin gastar tiempo ni tokens ahora: un texto dictado, un documento que te han pasado, una idea suelta. Va como nota o archivo dentro de `Sin procesar/`, con su ficha si hace falta («de quién viene, para qué»).

- Inicio enseña cuántas cosas hay sin procesar.
- Un agente **no** la procesa por su cuenta. Cuando se le pide («procesa lo de Sin procesar sobre terrenos»), lee lo que hay, lo lleva a su sitio (una nota de Contexto, una tarea, un asset) y quita o mueve el original.

```
buho-studio nota "Sin procesar" "Colores de los terrenos" --text "…" --autor Claude
buho-studio anadir "Sin procesar" especificacion.md --nombre "Especificación del juego" --descripcion "Enviada por Ángel el 10/11"
buho-studio arbol "Sin procesar"
```

## .buhostudio: lo interno

| Archivo | Qué guarda |
|---|---|
| `proyecto.json` | nombre, ID del proyecto y enlaces (p. ej. a Unity) |
| `ids.json` | la ID de cada archivo y carpeta |
| `fichas.json` | nombre y descripción de los assets |
| `estados.json` | idea, en curso, revisar, aprobado |
| `comentarios.json` | hilos de comentarios |
| `historial.jsonl` | historial firmado (quién, por dónde, qué, ID) |
| `miniaturas/` | caché de miniaturas (se puede borrar) |

No se editan a mano: se cambian con la app o con el CLI. Las tareas no van aquí: son notas de `Tareas/`.
