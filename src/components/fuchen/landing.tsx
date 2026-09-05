import { useEffect, useRef, useState } from "react";
import { FolderOpen, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canPickDirectory } from "@/lib/scan/walker";
import { cn } from "@/lib/utils";
import { useCleaner } from "@/store/cleaner";
import { AutoPilot } from "./auto-pilot";
import { CareList } from "./care-panel";
import { LogoMark } from "./logo";

export function Landing() {
  const startDemoScan = useCleaner((s) => s.startDemoScan);
  const startFolderScan = useCleaner((s) => s.startFolderScan);
  const startInputScan = useCleaner((s) => s.startInputScan);
  const error = useCleaner((s) => s.error);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerOk, setPickerOk] = useState(false);
  const [os, setOs] = useState<"win" | "mac">("win");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPickerOk(canPickDirectory());
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <header className="flex items-center gap-3">
        <LogoMark className="size-9" />
        <div>
          <div className="font-display text-xl font-medium tracking-tight">拂尘</div>
          <div className="text-xs text-muted-foreground">电脑整理 · 可安装</div>
        </div>
      </header>

      <section className="mt-6 stagger-in">
        <h1 className="max-w-2xl font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl">
          装上一次，以后打开就扫。
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          系统垃圾交给存储感知。拂尘专盯重复文件、卸载残留和过期安装包。授权下载和桌面，下次打开会自动扫。删除仍要你确认。
        </p>
      </section>

      {mounted ? (
        <div className="mt-6">
          <AutoPilot />
        </div>
      ) : (
        <div className="mt-6 h-56 rounded-2xl bg-card shadow-[var(--shadow-border)]" />
      )}

      <div className="mt-10 flex gap-1 rounded-full bg-secondary p-1 w-fit">
        <button
          type="button"
          onClick={() => setOs("win")}
          className={cn(
            "h-10 rounded-full px-4 text-sm transition-[background-color,color] duration-150",
            os === "win" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Windows
        </button>
        <button
          type="button"
          onClick={() => setOs("mac")}
          className={cn(
            "h-10 rounded-full px-4 text-sm transition-[background-color,color] duration-150",
            os === "mac" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Mac
        </button>
      </div>

      <section className="mt-6">
        <h2 className="font-display text-lg font-medium tracking-tight">系统清理（手动）</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          回收站、开机项、存储感知、清理建议这些必须在系统设置里点。做完打勾。注册表清洁、SSD 碎片整理软件不要装。
        </p>
        <CareList os={os} />
      </section>

      <section className="mt-10 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-7">
        <h2 className="font-display text-xl font-medium tracking-tight">临时扫一次</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          不想加入自动监视时，也可以只扫一次。选过的文件夹默认会加入监视列表。
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button size="lg" onClick={() => startFolderScan()} className="min-h-12">
            <FolderOpen />
            扫描并监视
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-12"
            onClick={() => inputRef.current?.click()}
          >
            选择文件夹
          </Button>
          <Button size="lg" variant="ghost" onClick={() => startDemoScan()} className="min-h-12">
            <ScanSearch />
            先看示例
          </Button>
        </div>
        {mounted ? (
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            multiple
            {...{ webkitdirectory: "", directory: "" }}
            onChange={(e) => {
              if (e.target.files?.length) void startInputScan(e.target.files);
              e.target.value = "";
            }}
          />
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {pickerOk
            ? "请选「下载」「桌面」这类用户文件夹。不要整盘扫描系统目录。"
            : "弹不出文件夹窗口时，用「选择文件夹」，或先看示例。请用电脑上的 Chrome 或 Edge。"}
        </p>
      </section>
    </div>
  );
}
