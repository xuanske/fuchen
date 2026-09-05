import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatCount } from "@/lib/utils";
import { useCleaner } from "@/store/cleaner";
import { LogoMark } from "./logo";

export function Scanning() {
  const progress = useCleaner((s) => s.progress);
  const cancelScan = useCleaner((s) => s.cancelScan);
  const scanKind = useCleaner((s) => s.scanKind);
  const pct =
    progress.phase === "walk"
      ? Math.min(82, 8 + progress.scanned * 0.7)
      : progress.phase === "hash"
        ? 86
        : 94;
  const auto = scanKind === "auto";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-4 py-16">
      <LogoMark className="size-10" />
      <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
        {auto ? "自动拂过监视夹" : "正在拂过盘面"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {progress.phase === "walk"
          ? auto
            ? "按你授权过的文件夹自动清点，跳过系统目录。"
            : "逐个清点文件，跳过系统目录。"
          : progress.phase === "hash"
            ? "对同样大小的文件做指纹核对，确认是否真重复。"
            : "归类尘余、安装包与陈年下载。"}
      </p>

      <div className="mt-8 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-2xl tabular-nums">{formatCount(progress.scanned)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatBytes(progress.bytes)}</p>
        </div>
        <Progress value={pct} className="mt-4" />
        <p className="mt-3 truncate font-mono text-xs text-muted-foreground">
          {progress.current || "…"}
        </p>
      </div>

      <div className="mt-6">
        <Button variant="ghost" onClick={cancelScan}>
          取消
        </Button>
      </div>
    </div>
  );
}
