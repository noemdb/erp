# Colores — ERP-TributarioLite

> Inventario preciso de la implementación de color. Objetivo: poder cambiar
> colores o el esquema completo tocando los puntos exactos, sin cazar clases
> por toda la app. Estado: 2026-10-01. Light-only (`color-scheme: light`).

## 1. Dónde viven los colores (7 archivos, ningún otro)

| Archivo | Qué define |
|---|---|
| `src/app/globals.css` | Tokens `:root` + `@theme inline` + `::selection` |
| `src/components/ui/button.tsx` | Fondo/texto/hover por variante |
| `src/components/ui/badge.tsx` | Fondo/texto por variante |
| `src/components/ui/card.tsx` | Fondo/borde/texto base de Card |
| `src/app/landing-content.tsx` | Hero + secciones (53 de 77 hex del proyecto) |
| `src/app/login/page.tsx` + `login-form.tsx` | Panel lateral, inputs, foco |
| `src/app/icon.svg` | Favicon (autocontenido) |

Verificado: ningún otro `.tsx`/`.css` de `src/` contiene hex ni utilidades
de color semántico (`emerald/amber/red/rose/sky`). Las páginas internas
(`/companies`, `/c/[companyId]/*`) heredan de `Button/Badge/Card` + escala
`slate`.

## 2. Tokens (`globals.css` `:root`)

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0f2b46` | Marca: botones, logo, paneles |
| `--ring` | `#0ea5e9` | Foco visible, acentos |
| `--background` / `--foreground` | `#ffffff` / `#0f172a` | Base |
| `--muted` / `--muted-foreground` | `#f1f5f9` / `#64748b` | Fondos suaves, texto secundario |
| `--border` | `#e2e8f0` | Bordes |
| `--card` / `--card-foreground` | `#ffffff` / `#0f172a` | Tarjetas |
| `--popover` / `--popover-foreground` | `#ffffff` / `#0f172a` | (reservado, sin uso actual) |
| `--primary-foreground` | `#ffffff` | Texto sobre primario |
| `--secondary` / `--secondary-foreground` | `#f1f5f9` / `#0f2b46` | Variante secundaria |
| `--accent` / `--accent-foreground` | `#e0f2fe` / `#0f2b46` | Acento suave |
| `--destructive` | `#dc2626` | Errores |
| `--success` | `#059669` | conciliado, emitido, checks |
| `--warning` | `#d97706` | Advertencias |
| `--radius` | `0.375rem` | Radio base (esquinas cuadradas) |

`@theme inline` expone a Tailwind: `--color-primary`, `--color-ring`,
`--color-background`, `--color-foreground`, `--color-muted`, `--color-border`,
`--radius-lg`. `::selection`: fondo `#bae6fd`, texto `#0f2b46`.

## 3. Hex directos (conteo real en `src/`)

| Hex | N° | Significado | Dónde |
|---|---|---|---|
| `#0f2b46` | 53 | Primario marca | botones, degradados, textos hover, rings, favicon |
| `#1e5a96` | 17 | Marca secundaria (hover/fin de degradado) | `hover:bg-[#1e5a96]`, `to-[#1e5a96]`, iconos, favicon |
| `#0ea5e9` | 15 | Acento sky (foco, glows, inicio/fin degradado) | `focus-visible:ring-[#0ea5e9]`, glows `bg-[#0ea5e9]/15–/30`, favicon |
| `#ffffff` | 9 | Blanco (fondos, texto sobre primario) | + `icon.svg` |
| `#0f172a` | 3 | Texto base (= slate-900) | tokens |
| `#f1f5f9` | 2 | slate-100 | tokens |
| `#e2e8f0` | 1 | slate-200 borde | tokens |
| `#e0f2fe` | 1 | sky-100 acento | tokens |
| `#dc2626` | 1 | Rojo error | tokens |
| `#d97706` | 1 | Ámbar advertencia | tokens |
| `#059669` | 1 | Verde éxito | tokens |
| `#64748b` | 1 | slate-500 | tokens |
| `#bae6fd` | 1 | sky-200 selección | `::selection` |

Opacidades usadas sobre marca: `#0f2b46` con `/5 /10 /20 /25`
(rings, sombras `shadow-[#0f2b46]/20–/25`); `#0ea5e9` con `/15 /25 /30`
(glows); `#1e5a96` con `/10`.

## 4. Utilidades Tailwind por familia (solo estas existen)

- **Slate** (neutros): `text-slate-900/800/700/600/500/400/300/200`,
  `bg-slate-100/50/200`, `bg-slate-50(/80 /60)`, `border-slate-100/200(/70 /80)/300`,
  `shadow-slate-200/60`, `from-slate-50/300`, `to-slate-200`.
- **Sky** (acentos suaves): `bg-sky-100(/70)/50(/90)`, `bg-sky-50/90`,
  `border-sky-200`, `text-sky-700/200`, `from-sky-100/50(/90)`,
  `to-sky-50/60`, `shadow-sky-100`, `via-sky-300`, `hover:bg-sky-50(/60)`.
- **Emerald** (éxito): `bg-emerald-100`, `text-emerald-800/700/600`,
  `border-emerald-600/60`, `from-emerald-500`, `to-emerald-300`.
- **Red** (error): `border-red-200`, `bg-red-50`, `text-red-800`.
- **Amber**: `bg-amber-100`, `text-amber-800` (una fila del comprobante).
- **Blanco**: `bg-white(/85 /90 /95 /5 /10 /15 /20)`, `text-white`,
  `text-slate-100/200/300` sobre fondos oscuros.

## 5. Degradados (todos derivan de la terna de marca)

- Firma fiscal: `from-[#0f2b46] via-[#1e5a96] to-[#0ea5e9]`
  (hairlines `h-0.5`/`h-1`, titular hero `bg-clip-text`, logo, focos).
- Superficies: `from-[#0f2b46] to-[#1e5a96]`
  (botones, CTA final, panel lateral login, totales del comprobante).
- Barras/detalles: `from-[#1e5a96] to-[#0ea5e9]`, `from-sky-300 to-white`,
  `from-sky-100 via-white to-transparent` (glows).

## 6. MUI (sin paleta propia)

`@mui/icons-material` y `CircularProgress` heredan `currentColor` /
`color="inherit"`: toman el color del texto Tailwind que los envuelve.
Cambiar el esquema NO requiere tocar MUI salvo que se quiera usar su
`ThemeProvider` (hoy no se usa; ver ADR-016). Integración intacta:
`AppRouterCacheProvider` + `@layer theme, base, mui, components, utilities`.

## 7. Favicon (`src/app/icon.svg`)

Autocontenido: fondo `url(#sairfi-g)` = `#0f2b46→#1e5a96`, landmark blanco,
barra `#0ea5e9`, base blanca translúcida. Al cambiar marca, editar sus
`<stop>` y la barra.

## 8. Cómo cambiar el esquema (procedimiento)

1. `globals.css`: nuevos valores de `--primary`, `--ring`, `--success`,
   `--warning`, `--destructive` (+ `::selection` si aplica).
2. Reemplazos globales en `src/` (conteo conocido, §3):
   `#0f2b46` (53) → primario nuevo; `#1e5a96` (17) → marca secundaria;
   `#0ea5e9` (15) → acento nuevo. Incluir variantes con `/opacidad`.
3. Familias semánticas si cambian de matiz: `emerald-*` (éxito),
   `amber-*` (aviso puntual), `red-*` (error), `sky-*` (acentos suaves).
   Los `slate-*` son neutros: normalmente no se tocan.
4. `icon.svg`: `<stop>` del degradado + barra de acento.
5. Verificar: `npx tsc --noEmit && npm run build`, abrir `/` y `/login`,
   comprobar focos visibles (`ring`), contrastes sobre primario y badges
   `success/warning/destructive`.

## 9. Restricciones

- Light-only: prohibidos `.dark` / `dark:` (skill `beautiful-ui`).
- Iconos solo `@mui/icons-material`; no introducir librerías de color/MUI
  theme sin ADR nuevo (AGENTS.md §2.6: stack fijo).
- Texto sobre `#0f2b46` siempre `#ffffff` o `slate-100/200/300`
  (contraste); texto secundario sobre blanco: `slate-500/600`.
