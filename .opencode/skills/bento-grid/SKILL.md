---
name: bento-grid
description: Construye secciones Bento Grid (grilla 4 columnas con celdas de spans variados). Úsala cuando el usuario pida bento grid, grilla de features con celdas de distintos tamaños, o rediseñar una sección de tarjetas en composición bento.
---

# bento-grid

Composición bento para secciones de features: una sola caja redondeada con
compartimentos de distintos tamaños, sin saturar.

## Estructura obligatoria

- Un solo `grid`: `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`
  (`grid-template-columns: repeat(4, 1fr)` en desktop, **un** gap consistente).
- Caja contenedora que se lee como un solo bloque:
  `rounded-lg border border-periwinkle-200 bg-periwinkle-50 p-3`
  (el `p-3` iguala al `gap-3`).
- Celdas con `span` variado vía `grid-column`:
  anchas `sm:col-span-2`, completas `sm:col-span-2 lg:col-span-4`,
  el resto 1 celda. Nunca `lg:grid-cols-5` ni gaps distintos por fila.

## Celdas

- Todas mismo radio `rounded-md` y fondo **opaco**:
  blancas `border border-periwinkle-200 bg-white`,
  destacada `bg-gradient-to-br from-[#120c27] to-[#352574] text-white`.
- Altura completa: `li` con `h-full` + celda `flex h-full flex-col`.
- Número/etiqueta: pill `rounded-md px-2.5 py-1 text-xs font-bold`
  (degradado marca en claras, `bg-white/15 text-white` en oscura).
- Texto secundario: `text-periwinkle-600` en claras,
  `text-periwinkle-200` en oscura.
- Hover sutil y parejo: `hover:-translate-y-0.5 hover:shadow-md`.
- Sin saturar: máximo un visual por celda ancha (chips `text-[11px]`,
  línea `font-mono text-xs`, o flujo horizontal con separadores).

## Patrón de datos

```tsx
const items = [
  { n: "01", title: "...", text: "...", wide: true, chips: ["A", "B"] },
  { n: "02", title: "...", text: "..." },
  { n: "03", title: "...", text: "...", wide: true, dark: true, mono: "N° …" },
  { n: "04", title: "...", text: "...", full: true, dark: true, flow: ["A", "B", "C"] },
];
// wide → "sm:col-span-2" · full → "sm:col-span-2 lg:col-span-4"
```

Campo opcional ausente = celda simple (TS infiere `prop?: undefined`,
verificado con `tsc --noEmit`).

## Reglas de contenido

- Tono fiscal/contable, cero jerga de programación
  (`rule_version_id`, `snapshot`, `sha256`, `drill-down`, `staging` prohibidos
  en textos visibles; decir *constancia de la regla*, *huella digital*,
  *desglose*, *revisión por lotes*).
- Iconos solo `@mui/icons-material` (imports individuales).
- Preservar strings exigidos por tests al rediseñar
  (ver skill `beautiful-ui` §5).

## Verificación

```bash
npx tsc --noEmit
npx eslint <archivos tocados>
npm run build
```

## No hacer

- No mezclar radios (`rounded-lg` y `rounded-md`) dentro de las celdas.
- No fondos translúcidos en celdas (`bg-white/xx` salvo la celda oscura,
  que es opaca por su degradado).
- No más de una celda oscura por composición.
- No `Card` de `@/components/ui/card` dentro del bento
  (su `rounded-lg` + sombra rompe la caja única); usar `article` + clases.
