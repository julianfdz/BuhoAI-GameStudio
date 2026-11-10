---
categoria: IA
resumen: Referencia del CLI buho-studio para agentes y personas
---
# El CLI buho-studio

El CLI habla con la app abierta (la abre si está cerrada). Todo lo que hace aparece al momento en la app y queda firmado con `--autor`. Todas las órdenes aceptan `--json`. Donde va una ruta vale una **ID**.

## Mirar

```
buho-studio estado                      # proyecto abierto y recuentos
buho-studio arbol [<ruta|id>] [--profundidad 2]   # con IDs, estados y comentarios
buho-studio id <id|ruta>                # qué es una ID
buho-studio leer <ruta|id>
buho-studio buscar "texto"              # por nombre, ficha, ID y dentro de notas
```

## Escribir

```
buho-studio nota Contexto "Facciones" --file facciones.md --autor Claude
buho-studio escribir <ruta|id> --text "…" [--anadir]
buho-studio anadir "Assets/Modelos 3D" silla.glb --nombre "Silla" --descripcion "…"
buho-studio mover <ruta|id> <carpeta|id> · renombrar <ruta|id> "Nombre" · borrar <ruta|id>
buho-studio ficha <ruta|id> --nombre "…" --descripcion "…"
buho-studio fichas [<carpeta>] --faltan
```

## Equipo

```
buho-studio estado-de <ruta|id> revisar
buho-studio comentarios --pendientes · comentar <ruta|id> "…" · responder <k-id> "…" --resolver
buho-studio historial [<ruta|id>]
buho-studio tareas · tarea nueva|ver|mover|editar|paso   (mira «Tareas»)
```

## Modelos y conectores

```
buho-studio miniaturas [<carpeta>] · blender <ruta|id>
buho-studio unity -- <orden de buho-unity>
buho-studio mostrar <ruta|id>           # la app enseña ese archivo
```

## Ayuda

```
buho-studio ayuda [tema]                # estas mismas páginas
buho-studio skill                       # guía completa para agentes
```
