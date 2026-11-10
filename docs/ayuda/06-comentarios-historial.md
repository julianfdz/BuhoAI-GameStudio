---
categoria: Equipo
resumen: Comentarios por archivo, respuestas de los agentes e historial firmado
---
# Comentarios e historial

## Comentarios

Cada archivo, carpeta o tarea tiene su hilo de comentarios en el panel derecho: escribe, responde y marca como **resuelto**. Los agentes leen lo pendiente y contestan:

```
buho-studio comentarios --pendientes
buho-studio responder k-1a2b3c4d "Hecho: textura nueva" --resolver
```

## Historial firmado

Todo cambio queda apuntado: **quién** (persona 👤, agente 🤖 con su nombre, o cambio externo 📁), **por dónde** (app o CLI) y **qué**, con la ID de lo que se tocó. Se ve por archivo en el panel derecho y entero en **Actividad**.

```
buho-studio historial a-3f9c21b0 --max 20
```
