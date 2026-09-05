import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 21c5-1 8-8 8-14"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 9c1.2 4.5 4.2 8.4 8.6 10.2"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="22.5" r="1.6" className="fill-primary-foreground" />
    </svg>
  );
}

export function Wordmark({ stacked = false }: { stacked?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", stacked && "flex-col items-start gap-1")}>
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-lg font-medium tracking-tight">拂尘</div>
        <div className="mt-0.5 text-xs tracking-wide text-muted-foreground">电脑整理台</div>
      </div>
    </div>
  );
}
