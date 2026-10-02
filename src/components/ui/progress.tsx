import CircularProgress from "@mui/material/CircularProgress";
import { cn } from "@/lib/utils";

/**
 * Indicadores de progreso (shadcn-style, esquinas cuadradas).
 *
 * - `Spinner`: trabajo restante DESCONOCIDO (mutaciones, validaciones).
 *   Indeterminado: `role="progressbar"` sin `aria-valuenow` (lo pone MUI),
 *   con `aria-label` siempre.
 * - `ProgressRing`: fracción CONOCIDA en espacio compacto (arco circular).
 * - `ProgressBar`: fracción CONOCIDA con espacio para pista legible
 *   (`<progress>` nativo). El % visible y el accesible salen del mismo valor.
 */

/** Spinner indeterminado. Solo para trabajo sin fracción medible. */
export function Spinner({
  label = "Cargando…",
  size = 16,
  className,
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <CircularProgress
      size={size}
      color="inherit"
      aria-label={label}
      className={className}
    />
  );
}

function toPercent(value: number, max: number): {
  clamped: number;
  safeMax: number;
  pct: number;
} {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const clamped = Math.min(
    Math.max(Number.isFinite(value) ? value : 0, 0),
    safeMax
  );
  return { clamped, safeMax, pct: Math.round((clamped / safeMax) * 100) };
}

/** Anillo determinado. `value/max` → mismo % visible y accesible. */
export function ProgressRing({
  value,
  max = 100,
  size = 64,
  label,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  label: string;
  className?: string;
}) {
  const { pct } = toPercent(value, max);
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-periwinkle-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="stroke-[#352574] transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-periwinkle-700">
        {pct} %
      </span>
    </div>
  );
}

/** Barra lineal determinada (`<progress>` nativo). */
export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const { clamped, safeMax, pct } = toPercent(value, max);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-periwinkle-600">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-periwinkle-900">
          {pct} %
        </span>
      </div>
      <progress
        max={safeMax}
        value={clamped}
        aria-label={`${label}: ${pct} por ciento`}
        className="h-2 w-full appearance-none overflow-hidden rounded-md bg-periwinkle-100 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-md [&::-webkit-progress-value]:bg-[#352574] [&::-moz-progress-bar]:rounded-md [&::-moz-progress-bar]:bg-[#352574]"
      />
    </div>
  );
}
