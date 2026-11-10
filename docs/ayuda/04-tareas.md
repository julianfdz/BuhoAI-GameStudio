---
categoria: Equipo
resumen: Crear tareas, moverlas en el Kanban y cómo las usan los agentes
---
# Tareas

La pestaña **Tareas** es un Kanban con cuatro columnas: **Por hacer**, **En curso**, **Revisar** y **Hecha**. Arrastra una tarjeta para cambiarla de columna.

## Crear una tarea

**Nueva tarea** (o el + de una columna): título, descripción, prioridad (alta, media, baja), a quién se asigna (una persona o un agente, p. ej. «Claude»), assets relacionados (pega sus IDs) y pasos.

Al abrir una tarea ves su estado, prioridad, los assets enlazados con miniatura, la descripción y los **pasos**, que se marcan con un clic. El avance de la tarjeta sale de los pasos marcados. Los comentarios del panel derecho también valen para las tareas.

## Es un archivo

Cada tarea es una nota en `Tareas/` con una cabecera:

```
---
tipo: tarea
id: t-1a2b3c4d
estado: por-hacer
prioridad: alta
asignada: Claude
enlaces: [a-3f9c21b0, c-77aa0011]
creada: 2026-11-10T12:00:00.000Z
autor: Julián
---
# Modelar la Ray Gun en low-poly

Qué hay que hacer y cómo saber que está hecha.

## Pasos

- [x] Boceto
- [ ] Modelo
```

Se puede editar a mano (botón **Markdown**) o con un agente. Las notas de `Tareas/` sin esa cabecera (Hitos, Pendientes) siguen siendo notas normales.

## Desde el CLI (agentes)

```
buho-studio tareas [--estado por-hacer] [--asignada Claude]
buho-studio tarea nueva "Modelar la Ray Gun" --prioridad alta --asignada Claude --enlaces a-3f9c21b0 --pasos "Boceto; Modelo; Exportar"
buho-studio tarea ver t-1a2b3c4d
buho-studio tarea mover t-1a2b3c4d en-curso
buho-studio tarea paso t-1a2b3c4d 2              # marca el paso 2 (--pendiente lo desmarca)
buho-studio tarea paso t-1a2b3c4d --nuevo "Probar en Unity"
buho-studio tarea editar t-1a2b3c4d --prioridad media --asignada Julián
buho-studio comentar t-1a2b3c4d "Hecho el modelo, falta la textura"
```

Cómo trabaja un agente con tareas: coge las suyas (`tareas --asignada Claude --estado por-hacer`), las mueve a **en curso**, marca los pasos según avanza y al terminar las deja en **revisar** con un comentario. **Hecha** la pone una persona.
