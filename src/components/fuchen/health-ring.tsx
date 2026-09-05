import { cn } from "@/lib/utils";

export function HealthRing({
  score,
  size = 148,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const tone =
    clamped >= 80 ? "text-ok" : clamped >= 55 ? "text-warn" : "text-destructive";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className="stroke-muted"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            className={cn("transition-[stroke-dasharray] duration-500", tone)}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-3xl font-medium tracking-tight tabular-nums leading-none">
            {Math.round(clamped)}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">整洁指数</span>
    </div>
  );
}
