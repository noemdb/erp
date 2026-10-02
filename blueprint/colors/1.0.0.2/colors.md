# Colores — ERP-TributarioLite

> Inventario preciso de la implementación de color. Objetivo: poder cambiar
> colores o el esquema completo tocando los puntos exactos, sin cazar clases
> por toda la app. Estado: 2026-10-01. Light-only (`color-scheme: light`).

## 1. Dónde viven los colores (7 archivos, ningún otro)

| Archivo | Qué define | 
 | ----- | ----- | 
| `src/app/globals.css` | Tokens `:root` + `@theme inline` + `::selection` | 
| `src/components/ui/button.tsx` | Fondo/texto/hover por variante | 
| `src/components/ui/badge.tsx` | Fondo/texto por variante | 
| `src/components/ui/card.tsx` | Fondo/borde/texto base de Card | 
| `src/app/landing-content.tsx` | Hero + secciones (53 de 77 hex del proyecto) | 
| `src/app/login/page.tsx` + `login-form.tsx` | Panel lateral, inputs, foco | 
| `src/app/icon.svg` | Favicon (autocontenido) | 

Verificado: ningún otro `.tsx`/`.css` de `src/` contiene hex ni utilidades
de color semántico (`emerald/amber/red/rose/sky/icy-aqua/periwinkle`). Las páginas internas
(`/companies`, `/c/[companyId]/*`) heredan de `Button/Badge/Card` + escala
`periwinkle` / `frozen-water`.

## 2. Tokens (`globals.css` `:root`)

| Token | Valor | Escala de Origen | Uso | 
 | ----- | ----- | ----- | ----- | 
| `--primary` | `#120c27` | `slate-blue-900` | Marca: botones, logo, paneles oscuros | 
| `--ring` | `#37c8a1` | `icy-aqua-500` | Foco visible, acentos | 
| `--background` / `--foreground` | `#ffffff` / `#0d0e17` | `white` / `periwinkle-950` | Base de aplicación | 
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
`--radius-lg`. `::selection`: fondo `#d7f4ec` (`icy-aqua-100`), texto `#0b2820` (`icy-aqua-900`).

## 3. Hex directos (conteo real en `src/`)

| Hex | N° | Valor en Paleta | Significado | Dónde | 
 | ----- | ----- | ----- | ----- | ----- | 
| `#120c27` | 53 | `slate-blue-900` | Primario marca | botones, degradados, textos hover, rings, favicon | 
| `#352574` | 17 | `slate-blue-700` | Marca secundaria (hover/fin de degradado) | `hover:bg-[#352574]`, `to-[#352574]`, iconos, favicon | 
| `#37c8a1` | 15 | `icy-aqua-500` | Acento aqua (foco, glows, inicio/fin degradado) | `focus-visible:ring-[#37c8a1]`, glows `bg-[#37c8a1]/15–/30`, favicon | 
| `#ffffff` | 9 | Base white | Blanco (fondos, texto sobre primario) | \+ `icon.svg` | 
| `#0d0e17` | 3 | `periwinkle-950` | Texto base | tokens | 
| `#eef6f4` | 2 | `frozen-water-50` | Fondo muted | tokens | 
| `#deede8` | 1 | `frozen-water-100` | Borde base | tokens | 
| `#ebfaf6` | 1 | `icy-aqua-50` | Acento suave background | tokens | 
| `#dc2626` | 1 | `red-600` | Rojo error | tokens | 
| `#d97706` | 1 | `amber-600` | Ámbar advertencia | tokens | 
| `#2ca081` | 1 | `icy-aqua-600` | Verde/Aqua éxito | tokens | 
| `#494d83` | 1 | `periwinkle-600` | Texto secundario | tokens | 
| `#d7f4ec` | 1 | `icy-aqua-100` | Selección texto | `::selection` | 

Opacidades usadas sobre marca: `#120c27` con `/5 /10 /20 /25`
(rings, sombras `shadow-[#120c27]/20–/25`); `#37c8a1` con `/15 /25 /30`
(glows); `#352574` con `/10`.

## 4. Utilidades Tailwind por familia (solo estas existen)

* **Periwinkle / Slate-Blue** (neutros y fríos de UI): `text-periwinkle-950/900/800/700/600/500/400/300/200`,
  `bg-periwinkle-100/50/200`, `bg-periwinkle-50(/80 /60)`, `border-periwinkle-100/200(/70 /80)/300`,
  `shadow-periwinkle-200/60`, `from-periwinkle-50/300`, `to-periwinkle-200`.

* **Icy Aqua / Frozen Water** (acentos frescos y estados de éxito): `bg-icy-aqua-100(/70)/50(/90)`, `bg-icy-aqua-50/90`,
  `border-icy-aqua-200`, `text-icy-aqua-700/200`, `from-icy-aqua-100/50(/90)`,
  `to-icy-aqua-50/60`, `shadow-icy-aqua-100`, `via-icy-aqua-300`, `hover:bg-icy-aqua-50(/60)`.

* **Success / Emerald sustituto (Icy Aqua alto contraste)**: `bg-icy-aqua-100`, `text-icy-aqua-800/700/600`,
  `border-icy-aqua-600/60`, `from-icy-aqua-500`, `to-icy-aqua-300`.

* **Red** (error): `border-red-200`, `bg-red-50`, `text-red-800`.

* **Amber**: `bg-amber-100`, `text-amber-800` (una fila del comprobante).

* **Blanco**: `bg-white(/85 /90 /95 /5 /10 /15 /20)`, `text-white`,
  `text-periwinkle-100/200/300` sobre fondos oscuros.

## 5. Degradados (todos derivan de la terna de marca)

* Firma fiscal: `from-[#120c27] via-[#352574] to-[#37c8a1]`
  (hairlines `h-0.5`/`h-1`, titular hero `bg-clip-text`, logo, focos).

* Superficies: `from-[#120c27] to-[#352574]`
  (botones, CTA final, panel lateral login, totales del comprobante).

* Barras/detalles: `from-[#352574] to-[#37c8a1]`, `from-icy-aqua-300 to-white`,
  `from-icy-aqua-100 via-white to-transparent` (glows).

## 6. MUI (sin paleta propia)

`@mui/icons-material` y `CircularProgress` heredan `currentColor` /
`color="inherit"`: toman el color del texto Tailwind que los envuelve.
Cambiar el esquema NO requiere tocar MUI salvo que se quiera usar su
`ThemeProvider` (hoy no se usa; ver ADR-016). Integración intacta:
`AppRouterCacheProvider` + `@layer theme, base, mui, components, utilities`.

## 7. Favicon (`src/app/icon.svg`)

Autocontenido: fondo `url(#sairfi-g)` = `#120c27→#352574`, landmark blanco,
barra `#37c8a1`, base blanca translúcida. Al cambiar marca, editar sus
`<stop>` y la barra.

## 8. Cómo cambiar el esquema (procedimiento)

1. `globals.css`: actualizar los nuevos valores de `--primary` (`#120c27`), `--ring` (`#37c8a1`), `--success` (`#2ca081`),
   `--warning` (`#d97706`), `--destructive` (`#dc2626`) (+ `::selection` a `#d7f4ec`).

2. Reemplazos globales en `src/` (conteo conocido, §3):
   `#0f2b46` (53) → `#120c27`; `#1e5a96` (17) → `#352574`;
   `#0ea5e9` (15) → `#37c8a1`. Incluir variantes con `/opacidad`.

3. Familias semánticas sustituidas: reemplazar las clases de color Tailwind antiguas por las nuevas utilidades definidas (`icy-aqua-*`, `frozen-water-*`, `periwinkle-*`).

4. `icon.svg`: `<stop>` del degradado (`#120c27` → `#352574`) + barra de acento (`#37c8a1`).

5. Verificar: `npx tsc --noEmit && npm run build`, abrir `/` y `/login`,
   comprobar focos visibles (`ring`), contrastes sobre primario y badges
   `success/warning/destructive`.

## 9. Restricciones

* Light-only: prohibidos `.dark` / `dark:` (skill `beautiful-ui`).

* Iconos solo `@mui/icons-material`; no introducir librerías de color/MUI
  theme sin ADR nuevo (AGENTS.md §2.6: stack fijo).

* Texto sobre `#120c27` siempre `#ffffff` o `periwinkle-100/200/300`
  (contraste); texto secundario sobre blanco: `periwinkle-600/500`.