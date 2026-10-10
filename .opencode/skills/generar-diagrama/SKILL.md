---
name: generar-diagrama
version: 1.0.0
description: "Genera diagramas de flujo interactivos para /docs y /casos-uso del ERP: un HTML autónomo clicable (nodos, historias paso a paso, modos, panel lateral) más su .md compañero, registrado en _flows.tsx y cableado al botón Ver flujo. Úsalo cuando el usuario pida visualizar un proceso del sistema: flujo de cierre, libro, comprobante, importación, retención, período o caso de uso R-O/R-E. Natural-language triggers: 'generar-diagrama', 'diagrama del flujo', 'ver flujo', 'ilustra el caso'. No lo uses para diagramas estáticos inline (Mermaid), slides ni PDF."
license: MIT
---

# Generar diagrama de flujo (ERP-TributarioLite)

Produce un diagrama interactivo del sistema de `/docs` (botón **Ver flujo** → diálogo con iframe),
igual que los existentes en `public/docs/flujos/*.html` (ej. `libro-compras.html`,
`r-o1-libro-compras.html`). Todo en español llano (tú/tus), cifras y terceros 100% ficticios.

## Destino y registro (no Omitir)

| Pieza | Dónde |
|---|---|
| Diagrama | `public/docs/flujos/<id>.html` (id kebab-case, ej. `r-o1-libro-compras`) |
| Compañero | `public/docs/flujos/<id>.md` (título + cómo abrir + Lo que ves + Modos + Historias) |
| Registro | `src/app/docs/_flows.tsx`: `FlowProcess` + entrada en `FLOWS` (id, process, subtitle, footer) |
| Botón | Tarjeta del caso en `src/app/casos-uso/casos.ts` (`flow: "<id>"` en el `Caso`) — la página ya renderiza `FlowButton` si existe |

El iframe carga `/docs/flujos/<id>.html` (mismo origen, permitido en `next.config.ts` para esa ruta).

## Procedimiento

### 1. Copia la plantilla viva más cercana

```bash
cp public/docs/flujos/<base>.html public/docs/flujos/<id>.html
```

Elige `<base>` por parecido (ej. `libro-compras` para reportes, `iva` para comprobantes).
No partas del skill genérico: la copia viva ya trae tema, player y panel probados.

### 2. Edita solo estas 9 regiones (el resto no se toca)

1. `<title>` → `<id legible> · ERP-TributarioLite`.
2. `header`: `eyebrow` (`ERP-TributarioLite · <código caso>`), `h1` (+ `span.accent`), `p.sub` (una frase).
3. `.modepick`: 2 botones `data-mode` snake_case (ej. `offline`/`online` con etiquetas
   `Mes abierto/carga` y `Mes cerrado/cierre`). Las claves alimentan el JS:
   payloads `payload<Key>`/`chips<Key>` (ej. `payloadOnline`), y campos de nodo
   `data-label-<modo>`/`data-tech-<modo>`/`data-port-<modo>` **con guion**
   (ej. `data-tech-online`; `data-techOnline` NO funciona: el parser minúsculas
   no casa con el `dataset` camelCase que lee el JS).
4. `.legend`: un `.item` por rol usado (máx. 6 roles).
5. `.flowtabs`: un `.flowtab` por historia (`data-flow` = clave del objeto `flows`); máx. 3–6.
6. `#flowName`: nombre de la primera historia.
7. `.node`: uno por concepto (`data-id` snake_case, `data-role`, `left/top` en %).
   Cadena principal en horizontal; ramas en vertical corta. Sin cruces de cables.
   Nodo solo visible en un modo → `data-modes="<modo>"`.
8. Objeto `flows`: una entrada por historia (`name`, `note`, `steps[]` con
   `{from, to, color, title, route, desc, payload, chips}`; `color` = var del rol destino;
   máx. 3 chips). Historia de un solo modo → `onlyMode: "<modo>"`.
9. `state.flow` (primera historia), `CONFIG.fallbackFlow`, `CONFIG.keyboardFlowOrder`,
   `CONFIG.toggleModes` (los 2 modos).

### 3. Roles y contenido

| Rol | Color | Uso aquí |
|---|---|---|
| `user` | mint | Tú (siempre a la izquierda) |
| `orch` | sky | Período / pantalla que agrupa |
| `compute` | magenta | Documentos que se transforman |
| `embed` | amber | Validación / revisión intermedia |
| `vector` | violet | Libro / reporte (destino de lectura) |
| `seed` | orange | Paquete / descarga congelada |

Cada paso narra UN traspaso (X envía Y a Z). Último paso entrega resultado al usuario.
Sin `</script>` dentro de payloads (rompe el HTML). Sin PII ni datos reales.

### 4. Validación obligatoria (antes de entregar)

```bash
grep -c "{{" public/docs/flujos/<id>.html                      # debe dar 0
grep -n "se_arma_solo\|data-id=\"docs\"" public/docs/flujos/<id>.html  # sin restos de la base
python3 -c "import re; h=open('public/docs/flujos/<id>.html').read(); \
 ids=set(re.findall(r'data-id=\"([^\"]+)\"',h)); \
 bad=[(a,b) for a,b in re.findall(r'from:\"([^\"]+)\",\s*to:\"([^\"]+)\"',h) if a not in ids or b not in ids]; \
 print('nodos:',sorted(ids),'mal:',bad)"                          # mal debe ser []
```

Sintaxis JS + humo en Chromium (playwright está instalado):

```bash
python3 -c "import re; h=open('public/docs/flujos/<id>.html').read(); \
 open('/tmp/opencode/dg.js','w').write('\n'.join(re.findall(r'<script>(.*?)</script>',h,re.S)))"
node --check /tmp/opencode/dg.js && echo JS_OK
```

Y captura: abrir el `file:///.../<id>.html`, clic a cada `data-flow`, comprobar
`#flowName`, `#stepIdx`, `#panelMode` sin errores de consola, screenshot para layout.

### 5. Cierre del bloque (AGENTS.md)

- `typecheck` + `lint` 0 en tocados; fila en `docs/TODO.md` con aceptación;
  entrada en `docs/CHANGELOG.md`. Sin API nueva, sin ADR (contenido didáctico).
- Presentar: qué historias cubre, dónde quedó el botón y la captura si se tomó.
