# Colores — ERP-TributarioLite

> Inventario preciso de la implementación de color. Objetivo: poder cambiar
> colores o el esquema completo tocando los puntos exactos, sin cazar clases
> por toda la app. Esquema vigente: **1.0.0.2**
> (`blueprint/colors/1.0.0.2/colors.md`, escalas en `escalas.md`).
> Estado: 2026-10-01. Light-only (`color-scheme: light`).

## 1. Dónde viven los colores (7 archivos, ningún otro)

| Archivo | Qué define |
|---|---|
| `src/app/globals.css` | Escalas `@theme` + tokens `:root` + `::selection` |
| `src/components/ui/button.tsx` | Fondo/texto/hover por variante |
| `src/components/ui/badge.tsx` | Fondo/texto por variante |
| `src/components/ui/card.tsx` | Fondo/borde/texto base de Card |
| `src/app/landing-content.tsx` | Hero + secciones (mayoría de hex del proyecto) |
| `src/app/login/page.tsx` + `login-form.tsx` | Panel lateral, inputs, foco |
| `src/app/icon.svg` | Favicon (autocontenido) |

Verificado: ningún otro `.tsx`/`.css` de `src/` contiene hex ni utilidades
de color semántico (`icy-aqua/emerald/amber/red`). Las páginas internas
(`/companies`, `/c/[companyId]/*`) heredan de `Button/Badge/Card` + escala
`periwinkle`.

## 2. Escalas custom (`globals.css` `@theme`, verbatim de `escalas.md`)

`icy-aqua` 50–950, `frozen-water` 50–950, `periwinkle` 50–950,
`soft-periwinkle` 50–950 (definida, sin uso actual), `slate-blue` 50–950.
En uso como utilidades: `periwinkle-*` (neutros, ex-`slate-*` 1:1 por número),
`icy-aqua-*` (acentos, ex-`sky-*`/`emerald-*` 1:1 por número).
`red-*` y `amber-*` estándar de Tailwind se conservan (error, aviso puntual).

## 3. Tokens (`globals.css` `:root`)

| Token | Valor | Escala de origen | Uso |
|---|---|---|---|
| `--primary` | `#120c27` | `slate-blue-900` | Marca: botones, logo, paneles oscuros |
| `--ring` | `#37c8a1` | `icy-aqua-500` | Foco visible, acentos |
| `--background` / `--foreground` | `#ffffff` / `#0d0e17` | `white` / `periwinkle-950` | Base |
| `--muted` / `--muted-foreground` | `#eef6f4` / `#494d83` | `frozen-water-50` / `periwinkle-600` | Fondos suaves, texto secundario |
| `--border` | `#deede8` | `frozen-water-100` | Bordes y divisores |
| `--card` / `--card-foreground` | `#ffffff` / `#0d0e17` | `white` / `periwinkle-950` | Tarjetas |
| `--popover` / `--popover-foreground` | `#ffffff` / `#0d0e17` | `white` / `periwinkle-950` | (reservado, sin uso actual) |
| `--primary-foreground` | `#ffffff` | `white` | Texto sobre primario |
| `--secondary` / `--secondary-foreground` | `#eef6f4` / `#120c27` | `frozen-water-50` / `slate-blue-900` | Variante secundaria |
| `--accent` / `--accent-foreground` | `#ebfaf6` / `#0b2820` | `icy-aqua-50` / `icy-aqua-900` | Acento suave |
| `--destructive` | `#dc2626` | `red-600` | Errores |
| `--success` | `#2ca081` | `icy-aqua-600` | conciliado, emitido, checks |
| `--warning` | `#d97706` | `amber-600` | Advertencias |
| `--radius` | `0.375rem` | Base | Radio base (esquinas cuadradas) |

`@theme inline` expone a Tailwind: `--color-primary`, `--color-ring`,
`--color-background`, `--color-foreground`, `--color-muted`, `--color-border`,
`--radius-lg`. `::selection`: fondo `#d7f4ec` (`icy-aqua-100`), texto
`#0b2820` (`icy-aqua-900`).

## 4. Hex directos (conteo real en `src/`)

| Hex | N° | Escala | Significado | Dónde |
|---|---|---|---|---|
| `#120c27` | 52 | `slate-blue-900` | Primario marca | botones, degradados, hovers, rings, favicon |
| `#352574` | 18 | `slate-blue-700` | Marca secundaria | `hover:bg`, `to-*`, iconos, favicon (+1 def. `@theme`) |
| `#37c8a1` | 16 | `icy-aqua-500` | Acento aqua | focos, glows `/15–/30`, favicon (+1 def. `@theme`) |
| `#ffffff` | 9 | `white` | Blanco | fondos, texto sobre primario, `icon.svg` |
| `#0d0e17` | 4 | `periwinkle-950` | Texto base | tokens (+1 def. `@theme`) |
| `#eef6f4` | 3 | `frozen-water-50` | Fondo muted | tokens (+1 def. `@theme`) |
| `#0b2820` | 3 | `icy-aqua-900` | Texto secundario oscuro | `::selection`, tokens (+1 def. `@theme`) |
| `#ebfaf6` | 2 | `icy-aqua-50` | Acento suave | tokens (+1 def. `@theme`) |
| `#deede8` | 2 | `frozen-water-100` | Borde base | tokens (+1 def. `@theme`) |
| `#d7f4ec` | 2 | `icy-aqua-100` | Selección | `::selection` (+1 def. `@theme`) |
| `#494d83` | 2 | `periwinkle-600` | Texto secundario | tokens (+1 def. `@theme`) |
| `#2ca081` | 2 | `icy-aqua-600` | Éxito | tokens (+1 def. `@theme`) |
| `#dc2626` / `#d97706` | 1 c/u | `red-600` / `amber-600` | Error / aviso | tokens |
| resto escalas | 1 c/u | — | Definiciones `@theme` | `globals.css` (ver `escalas.md`) |

Opacidades sobre marca: `#120c27` con `/5 /10 /20 /25`
(rings, `shadow-[#120c27]/20–/25`); `#37c8a1` con `/15 /25 /30` (glows);
`#352574` con `/10`.

## 5. Utilidades Tailwind por familia (solo estas existen)

- **Periwinkle** (neutros, ex-slate 1:1): `text-periwinkle-950→200`,
  `bg-periwinkle-100/50/200`, `bg-periwinkle-50(/80 /60)`,
  `border-periwinkle-100/200(/70 /80)/300`, `shadow-periwinkle-200/60`,
  `from-periwinkle-50/300`, `to-periwinkle-200`.
- **Icy Aqua** (acentos, ex-sky/emerald 1:1): `bg-icy-aqua-100(/70)/50(/90)`,
  `border-icy-aqua-200`, `text-icy-aqua-700/200/800/600`,
  `from-icy-aqua-100/500`, `to-icy-aqua-300`, `via-icy-aqua-300`,
  `shadow-icy-aqua-100`, `hover:bg-icy-aqua-50(/60)`,
  `border-icy-aqua-600/60`.
- **Red** (error): `border-red-200`, `bg-red-50`, `text-red-800`.
- **Amber**: `bg-amber-100`, `text-amber-800` (una fila del comprobante).
- **Blanco**: `bg-white(/85 /90 /95 /5 /10 /15 /20)`, `text-white`,
  `text-periwinkle-100/200/300` sobre fondos oscuros.

## 6. Degradados (todos derivan de la terna de marca)

- Firma fiscal: `from-[#120c27] via-[#352574] to-[#37c8a1]`
  (hairlines `h-0.5`/`h-1`, titular hero `bg-clip-text`, logo).
- Superficies: `from-[#120c27] to-[#352574]`
  (botones, CTA final, panel lateral login, totales del comprobante).
- Detalles: `from-[#352574] to-[#37c8a1]`, `from-icy-aqua-300 to-white`,
  `from-icy-aqua-100 via-white to-transparent` (glows).

## 7. MUI (sin paleta propia)

`@mui/icons-material` y `CircularProgress` heredan `currentColor` /
`color="inherit"`: toman el color del texto Tailwind que los envuelve.
Cambiar el esquema NO requiere tocar MUI salvo que se quiera usar su
`ThemeProvider` (hoy no se usa; ver ADR-016). Integración intacta:
`AppRouterCacheProvider` + `@layer theme, base, mui, components, utilities`.

## 8. Favicon (`src/app/icon.svg`)

Autocontenido: fondo `url(#sairfi-g)` = `#120c27→#352574`, landmark blanco,
barra `#37c8a1`, base blanca translúcida. Al cambiar marca, editar sus
`<stop>` y la barra.

## 9. Cómo cambiar el esquema (procedimiento)

1. `globals.css`: tokens `:root` + bloque `@theme` (fuente: `escalas.md` del
   esquema) + `::selection`.
2. Reemplazos globales en `src/`: hex de marca (incluir `/opacidad`) y
   prefijos de utilidad (`slate-→…`, `sky-→…`), cuidando falsos positivos
   (`translate-*` contiene `slate`).
3. Familias semánticas si cambian de matiz (`icy-aqua-*` éxito/acentos,
   `red-*` error, `amber-*` aviso). Los neutros normalmente no se tocan.
4. `icon.svg`: `<stop>` del degradado + barra de acento.
5. Verificar: `npx tsc --noEmit && npm run build`, abrir `/` y `/login`,
   comprobar focos visibles (`ring`), contrastes sobre primario y badges
   `success/warning/destructive`.

## 10. Restricciones

- Light-only: prohibidos `.dark` / `dark:` (skill `beautiful-ui`).
- Iconos solo `@mui/icons-material`; no introducir librerías de color/MUI
  theme sin ADR nuevo (AGENTS.md §2.6: stack fijo).
- Texto sobre `#120c27` siempre `#ffffff` o `periwinkle-100/200/300`
  (contraste); texto secundario sobre blanco: `periwinkle-600/500`.
- Historial: el esquema anterior (azul `#0f2b46/#1e5a96/#0ea5e9`, familias
  `slate/sky/emerald`) fue reemplazado por el 1.0.0.2 con mapeo 1:1
  (hex→hex, `slate-→periwinkle-`, `sky-→icy-aqua-`, `emerald-→icy-aqua-`).
