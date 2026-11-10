---
categoria: Equipo
resumen: Bugs con gravedad, build y reproducción, su vista propia con histórico y cómo los abren los agentes
---
# Bugs

Un **bug** es una tarea con `tipo: bug`: se guarda en `Tareas/Bugs/`, tiene ID `t-…`, se mueve en el Kanban de **Tareas** como cualquier otra (tarjeta roja) y además tiene su pestaña **Bugs** con el histórico.

## Lo que lleva un bug

| Campo | Para qué |
|---|---|
| **Gravedad** | bloqueante, grave, menor o cosmético. Si no se da prioridad, sale de la gravedad (bloqueante y grave → alta) |
| **Build** | la versión donde aparece (`v0.3`) |
| **¿Se reproduce?** | siempre, a veces, no se reproduce o sin probar |
| **Cómo reproducirlo** | los pasos, numerados |
| **Qué pasa / qué debería pasar** | el fallo y lo esperado |
| **Enlaces** | IDs de lo que falla o lo enseña: el asset, la escena, el vídeo o la captura del fallo |

Al pasarlo a **Hecha** se apunta la fecha de cierre; si se saca de Hecha, cuenta como **reabierto**.

## Abrir un bug

- Pestaña **Bugs** → **Nuevo bug**.
- Clic derecho en un asset, vídeo o captura → **Nuevo bug con esto…** (ya va enlazado).
- Un agente: `buho-studio bug nuevo …` (abajo).

## La vista Bugs

- **Cifras:** abiertos por gravedad, cerrados en los últimos 30 días, tiempo medio de arreglo, el abierto más antiguo y cuántos se han reabierto.
- **Por semana:** abiertos y cerrados de las últimas 10 semanas, y la línea de bugs vivos.
- **Por build:** cuántos bugs tiene cada versión (abiertos sobre el total). Clic para filtrar.
- **Zonas calientes:** los assets enlazados a más bugs abiertos: dónde se rompe el juego.
- **Lista:** abiertos, cerrados o todos; filtro por gravedad, build y texto o ID. Clic para abrir el bug.

## Desde el CLI (agentes)

```
buho-studio bug nuevo "El build se cierra al salir" --gravedad grave --build v0.3 --reproducir "Abrir; Jugar; Salir" --pasa "Se cierra con 0xC0000005" --deberia "Salir limpio" --enlaces a-3f9c21b0 --autor Claude
buho-studio bugs                      # resumen y lista
buho-studio bugs --abiertos --gravedad bloqueante
buho-studio bug mover t-1a2b3c4d en-curso
buho-studio bug editar t-1a2b3c4d --reproduce si --build v0.4
buho-studio comentar t-1a2b3c4d "Causa: el puente de Unity no se cierra antes de salir"
buho-studio bug mover t-1a2b3c4d revisar     # arreglado: lo cierra una persona (hecha)
```

Un agente que encuentra un fallo (en un log, una prueba con bots o un comentario) abre el bug con lo que ha visto, enlaza la captura o el vídeo y no lo cierra: lo deja en **revisar** cuando lo arregla.
