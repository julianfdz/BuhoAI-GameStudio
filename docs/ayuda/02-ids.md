---
categoria: Empezar
resumen: Cada archivo, carpeta y tarea tiene una ID para hablar con la IA con propiedad
---
# IDs: hablar con la IA con propiedad

Todo lo que hay en el proyecto tiene una **ID** corta y estable:

| Empieza por | Es |
|---|---|
| `a-` | un archivo (modelo, imagen, sonido, nota…), p. ej. `a-3f9c21b0` |
| `c-` | una carpeta |
| `t-` | una tarea |

La ID **no cambia** aunque renombres o muevas el archivo, desde la app o desde el Explorador. Por eso es la forma segura de decirle a la IA de qué hablas.

## Copiar una ID

- **Clic derecho** en cualquier archivo, carpeta o tarjeta (en el árbol, en la galería, en Inicio o en Tareas) → **Copiar ID**.
- En el panel de la derecha, debajo del nombre, el botón con la ID la copia. Con **Mayús** copia también el nombre y la ruta.
- En la cabecera de cada archivo y carpeta también sale la ID.

## Usarla con la IA

Pega la ID en el chat: «cambia el asset `a-3f9c21b0` para que tenga la culata en madera», «crea una tarea para revisar `c-77aa0011`». El agente la usa con el CLI:

```
buho-studio id a-3f9c21b0              # qué es: ruta, ficha, estado, comentarios
buho-studio leer a-3f9c21b0            # cualquier orden acepta una ID donde va una ruta
buho-studio estado-de a-3f9c21b0 revisar
```

Si la ID es de otro proyecto reciente, `buho-studio id` te dice cuál es para abrirlo.

## Cómo se guarda

En `.buhostudio/ids.json`. Si un archivo desaparece (por ejemplo, mientras Drive sincroniza), su ID se guarda 30 días por si vuelve. Si se mueve desde fuera, se reconoce por nombre y tamaño, y su estado, ficha y comentarios van con él.
