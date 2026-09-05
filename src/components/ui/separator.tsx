import { cn } from "@/lib/utils";

export function Separator({ className, decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      className={cn("h-px w-full bg-border", className)}
    />
  );
}
