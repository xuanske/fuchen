import { useEffect, useState } from "react";
import { Bell, Download, FolderPlus, MonitorUp, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hoursUntilNextScan,
  isStandaloneApp,
  loadAutoSettings,
  saveAutoSettings,
  type AutoSettings,
} from "@/lib/scan/auto-settings";
import { canPickDirectory } from "@/lib/scan/walker";
import {
  describeWatched,
  removeWatched,
  requestHandlePermission,
  saveWatched,
  type WatchedStatus,
} from "@/lib/scan/watched";
import { cn, formatBytes, formatCount } from "@/lib/utils";
import { useCleaner } from "@/store/cleaner";

function formatWhen(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 60_000) return "刚刚";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(ts),
  );
}

export function AutoPilot() {
  const scanWatched = useCleaner((s) => s.scanWatched);
  const maybeAutoStart = useCleaner((s) => s.maybeAutoStart);
  const busy = useCleaner((s) => s.busy);
  const [settings, setSettings] = useState<AutoSettings>(() => loadAutoSettings());
  const [folders, setFolders] = useState<WatchedStatus[]>([]);
  const [installed, setInstalled] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pickerOk, setPickerOk] = useState(false);
  const [busyLocal, setBusyLocal] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function refreshFolders() {
    setFolders(await describeWatched());
  }

  useEffect(() => {
    setPickerOk(canPickDirectory());
    setInstalled(isStandaloneApp());
    setSettings(loadAutoSettings());
    void refreshFolders();
    void maybeAutoStart();

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [maybeAutoStart]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void maybeAutoStart();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [maybeAutoStart]);

  function patch(next: Partial<AutoSettings>) {
    setSettings(saveAutoSettings(next));
  }

  async function addFolder() {
    if (!canPickDirectory()) {
      setNote("请用电脑上的 Chrome 或 Edge 授权文件夹。");
      return;
    }
    setBusyLocal(true);
    setNote(null);
    try {
      const handle = await window.showDirectoryPicker!({
        mode: "readwrite",
        id: "fuchen-watch",
        startIn: "downloads",
      });
      const perm = await requestHandlePermission(handle);
      if (perm === "denied") {
        setNote("没有获得读取权限，换一个用户文件夹再试。");
        return;
      }
      await saveWatched(handle);
      patch({ autoScanOnOpen: true });
      await refreshFolders();
    } catch (err) {
      if ((err as DOMException).name === "AbortError" || (err as DOMException).name === "NotAllowedError") return;
      setNote("无法监视这个文件夹。");
    } finally {
      setBusyLocal(false);
    }
  }

  async function dropFolder(id: string) {
    await removeWatched(id);
    await refreshFolders();
  }

  async function restore(folder: WatchedStatus) {
    const perm = await requestHandlePermission(folder.handle);
    if (perm !== "granted") {
      setNote(`「${folder.name}」需要再点一次允许。`);
    }
    await refreshFolders();
  }

  async function enableNotify(on: boolean) {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    patch({ notify: on });
  }

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvt(null);
  }

  const granted = folders.filter((f) => f.permission === "granted").length;
  const waiting = folders.filter((f) => f.permission !== "granted");
  const nextHours = hoursUntilNextScan(settings);
  const summary = settings.lastSummary;

  return (
    <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary">自动运作</p>
          <h2 className="mt-1 font-display text-xl font-medium tracking-tight">装到电脑，打开就扫</h2>
        </div>
        {installed ? (
          <span className="inline-flex h-9 items-center rounded-full bg-accent px-3 text-xs text-accent-foreground">
            已安装 · 独立窗口
          </span>
        ) : installEvt ? (
          <Button size="sm" onClick={() => void install()}>
            <MonitorUp />
            安装到电脑
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.assign("?install=1");
            }}
          >
            <Download />
            安装说明
          </Button>
        )}
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        授权「下载」「桌面」一次。之后每次打开拂尘，会自动扫这些文件夹并勾选建议清理项。
        删除仍要你确认。关掉窗口后，浏览器没法在后台偷偷删文件。系统级临时文件请开 Windows「存储感知」。
      </p>

      {!installed && !installEvt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Chrome / Edge：地址栏右侧「安装」，或菜单 → 安装拂尘。装好后从开始菜单打开，权限更稳。
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {folders.length === 0 ? (
          <p className="rounded-xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
            还没有监视的文件夹。先授权一个，自动扫描才会开始。
          </p>
        ) : (
          folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{folder.name}</p>
                <p className="text-xs text-muted-foreground">
                  {folder.permission === "granted"
                    ? "已授权，打开即可自动扫"
                    : "权限过期，点一下恢复"}
                </p>
              </div>
              {folder.permission !== "granted" ? (
                <Button size="sm" variant="outline" onClick={() => void restore(folder)}>
                  恢复
                </Button>
              ) : null}
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-destructive"
                aria-label={`停止监视 ${folder.name}`}
                onClick={() => void dropFolder(folder.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => void addFolder()} disabled={busyLocal || !pickerOk} className="min-h-11">
          <FolderPlus />
          授权并监视文件夹
        </Button>
        <Button
          variant="outline"
          disabled={busy || granted === 0}
          onClick={() => void scanWatched("manual")}
          className="min-h-11"
        >
          <RefreshCw />
          立即扫描监视夹
        </Button>
      </div>

      {waiting.length > 0 ? (
        <p className="mt-3 text-xs text-warn">有 {waiting.length} 个文件夹需要再点一次允许，自动扫描才会继续。</p>
      ) : null}

      <label className="mt-5 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={settings.autoScanOnOpen}
          onChange={(e) => patch({ autoScanOnOpen: e.target.checked })}
          className="mt-0.5 size-5 shrink-0 rounded-sm border border-border bg-card accent-primary"
        />
        <span>
          打开应用时自动扫描
          <span className="mt-0.5 block text-xs text-muted-foreground">
            同一轮最多每 {settings.intervalHours} 小时自动跑一次，避免反复扫。
          </span>
        </span>
      </label>

      <label className="mt-3 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={settings.notify}
          onChange={(e) => void enableNotify(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 rounded-sm border border-border bg-card accent-primary"
        />
        <span className="flex items-center gap-1.5">
          <Bell className="size-3.5" />
          发现可清理空间时通知我
        </span>
      </label>

      {summary ? (
        <p className={cn("mt-4 text-xs tabular-nums text-muted-foreground")}>
          上次扫描 {formatWhen(summary.at)} · {summary.folderName} · {formatCount(summary.fileCount)} 个文件 ·
          可清理 {formatBytes(summary.recoverableBytes)}
          {settings.autoScanOnOpen && nextHours > 0.05
            ? ` · 约 ${nextHours < 1 ? `${Math.round(nextHours * 60)} 分钟` : `${nextHours.toFixed(1)} 小时`} 后再次自动扫`
            : null}
        </p>
      ) : null}

      {note ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {note}
        </p>
      ) : null}
    </section>
  );
}
