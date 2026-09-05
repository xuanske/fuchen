import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Copy,
  Download,
  FileArchive,
  FolderOpen,
  HardDrive,
  Package,
  RotateCcw,
  ScanSearch,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { KIND_LABEL, type DuplicateGroup, type FileKind, type ScannedFile } from "@/lib/scan/types";
import { cn, formatBytes, formatCount } from "@/lib/utils";
import { useCleaner, type ReportTab } from "@/store/cleaner";
import { toast } from "sonner";
import { FileRow } from "./file-row";
import { HealthRing } from "./health-ring";
import { CarePanel } from "./care-panel";
import { LogoMark } from "./logo";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "overview", label: "总览" },
  { id: "dupes", label: "重复" },
  { id: "junk", label: "尘余" },
  { id: "large", label: "大文件" },
  { id: "plan", label: "清理计划" },
  { id: "care", label: "系统养护" },
];

const CHART_COLOR: Record<FileKind, string> = {
  photo: "var(--color-chart-photo)",
  video: "var(--color-chart-video)",
  installer: "var(--color-chart-installer)",
  archive: "var(--color-chart-archive)",
  document: "var(--color-chart-document)",
  cache: "var(--color-chart-cache)",
  audio: "var(--color-chart-audio)",
  other: "var(--color-chart-other)",
};

function exportCleanupList(files: ScannedFile[], folderName: string) {
  const lines = [
    `拂尘清理清单 · ${folderName}`,
    `导出时间 ${new Date().toLocaleString("zh-CN")}`,
    "",
    ...files.map((f) => `${formatBytes(f.size).padEnd(10, " ")}  ${f.path}`),
    "",
    `合计 ${files.length} 个文件，${formatBytes(files.reduce((n, f) => n + f.size, 0))}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "拂尘-清理清单.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export function Report() {
  const report = useCleaner((s) => s.report);
  const tab = useCleaner((s) => s.tab);
  const setTab = useCleaner((s) => s.setTab);
  const selectedIds = useCleaner((s) => s.selectedIds);
  const cleanedIds = useCleaner((s) => s.cleanedIds);
  const toggleSelected = useCleaner((s) => s.toggleSelected);
  const selectSuggested = useCleaner((s) => s.selectSuggested);
  const selectIds = useCleaner((s) => s.selectIds);
  const clearSelection = useCleaner((s) => s.clearSelection);
  const confirmClean = useCleaner((s) => s.confirmClean);
  const reset = useCleaner((s) => s.reset);
  const lastClean = useCleaner((s) => s.lastClean);
  const scanKind = useCleaner((s) => s.scanKind);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ack, setAck] = useState(false);

  const cleaned = useMemo(() => new Set(cleanedIds), [cleanedIds]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const live = useMemo(() => {
    if (!report) return null;
    const remainingSuggested = report.files.filter(
      (f) => report.suggestedIds.includes(f.id) && !cleaned.has(f.id),
    );
    const cleanedBytes = report.files
      .filter((f) => cleaned.has(f.id))
      .reduce((n, f) => n + f.size, 0);
    const recoveredRatio = report.totalBytes > 0 ? cleanedBytes / report.totalBytes : 0;
    const health = Math.min(98, Math.round(report.healthScore + recoveredRatio * 48));
    return {
      recoverable: remainingSuggested.reduce((n, f) => n + f.size, 0),
      cleanedBytes,
      health,
      remainingSuggested,
    };
  }, [report, cleaned]);

  if (!report || !live) return null;

  const selectedFiles = report.files.filter((f) => selected.has(f.id) && !cleaned.has(f.id));
  const selectedBytes = selectedFiles.reduce((n, f) => n + f.size, 0);
  const canDeleteReal = report.source === "folder";
  const scanSource = report.source;

  async function runClean() {
    const result = await confirmClean();
    setConfirmOpen(false);
    setAck(false);
    if (result.ok > 0) {
      toast.success(
        scanSource === "demo"
          ? `已从示例报告中划掉 ${result.ok} 项，约 ${formatBytes(result.bytes)}`
          : scanSource === "input"
            ? `已记录 ${result.ok} 项。此方式不能直接删盘，请按导出清单在资源管理器里处理。`
            : `已删除 ${result.ok} 个文件，腾出 ${formatBytes(result.bytes)}`,
      );
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} 个文件未能删除，可能没有写入权限。`);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={reset} className="flex items-center gap-2.5 text-left">
            <LogoMark className="size-8" />
            <span className="hidden sm:block">
              <span className="block font-display text-base font-medium leading-none">拂尘</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {report.folderName}
                {scanKind === "auto" ? " · 自动扫描" : ""}
              </span>
            </span>
          </button>
          <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-10 shrink-0 rounded-full px-3 text-sm transition-[background-color,color] duration-150",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={reset} className="hidden sm:inline-flex">
            <RotateCcw />
            重新扫描
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-36 sm:px-6 sm:py-8">
        {tab === "overview" ? (
          <Overview report={report} live={live} cleaned={cleaned} onOpenTab={setTab} />
        ) : null}
        {tab === "dupes" ? (
          <DupeList
            groups={report.duplicates}
            selected={selected}
            cleaned={cleaned}
            onToggle={toggleSelected}
            onSelectGroup={(ids, on) => selectIds(ids, on)}
          />
        ) : null}
        {tab === "junk" ? (
          <CategoryList
            title="尘余与残留"
            hint="临时文件、缓存、未下完的下载，以及系统缩略图数据库。"
            files={report.junk}
            selected={selected}
            cleaned={cleaned}
            onToggle={toggleSelected}
          />
        ) : null}
        {tab === "large" ? (
          <LargePanel
            large={report.large}
            installers={report.installers}
            archives={report.archives}
            stale={report.stale}
            selected={selected}
            cleaned={cleaned}
            onToggle={toggleSelected}
          />
        ) : null}
        {tab === "plan" ? (
          <PlanPanel
            report={report}
            live={live}
            selected={selected}
            cleaned={cleaned}
            onToggle={toggleSelected}
            onSuggested={selectSuggested}
            onClear={clearSelection}
          />
        ) : null}
        {tab === "care" ? <CarePanel /> : null}
      </main>

      {selectedFiles.length > 0 || lastClean ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pt-3 pb-4 shadow-[0_-8px_24px_rgba(27,25,21,0.06)] backdrop-blur-sm sm:pr-28">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {selectedFiles.length > 0 ? (
                <>
                  已选{" "}
                  <span className="font-medium tabular-nums">{formatCount(selectedFiles.length)}</span>{" "}
                  项，约{" "}
                  <span className="font-medium tabular-nums">{formatBytes(selectedBytes)}</span>
                </>
              ) : lastClean ? (
                <span className="text-muted-foreground">
                  上次处理 {lastClean.count} 项 · {formatBytes(lastClean.bytes)}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                取消选择
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportCleanupList(selectedFiles.length ? selectedFiles : live.remainingSuggested, report.folderName);
                  toast.success("清单已下载");
                }}
              >
                <Download />
                导出清单
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAck(false);
                  setConfirmOpen(true);
                }}
                disabled={selectedFiles.length === 0}
              >
                <Trash2 />
                {canDeleteReal ? "删除选中" : "划掉选中"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canDeleteReal ? "确认从磁盘删除" : "从报告中划掉这些项"}</DialogTitle>
            <DialogDescription>
              {canDeleteReal
                ? "浏览器删除通常不会进入回收站。请确认这些文件确实可以丢掉。"
                : report.source === "demo"
                  ? "这是示例报告，不会动你电脑上的真实文件，只会在报告里标记已处理。"
                  : "当前扫描方式无法直接删文件。划掉之后，请用导出的清单在资源管理器中自行处理。"}
            </DialogDescription>
          </DialogHeader>
          <p className="mt-3 text-sm">
            {formatCount(selectedFiles.length)} 个文件 · {formatBytes(selectedBytes)}
          </p>
          {canDeleteReal ? (
            <label className="mt-4 flex items-start gap-3 text-sm">
              <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5" />
              <span>我了解这些文件将被永久删除，不会进入回收站。</span>
            </label>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              返回
            </Button>
            <Button
              variant="destructive"
              disabled={canDeleteReal && !ack}
              onClick={() => void runClean()}
            >
              {canDeleteReal ? "永久删除" : "确认划掉"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Overview({
  report,
  live,
  cleaned,
  onOpenTab,
}: {
  report: NonNullable<ReturnType<typeof useCleaner.getState>["report"]>;
  live: { recoverable: number; cleanedBytes: number; health: number };
  cleaned: Set<string>;
  onOpenTab: (tab: ReportTab) => void;
}) {
  const dupeCount = report.duplicates.reduce((n, g) => n + g.files.filter((f) => !cleaned.has(f.id)).length, 0);
  const cards = [
    {
      tab: "dupes" as const,
      label: "重复文件",
      value: formatCount(report.duplicates.length),
      sub: `${formatCount(dupeCount)} 个副本`,
      icon: Copy,
    },
    {
      tab: "junk" as const,
      label: "尘余",
      value: formatCount(report.junk.filter((f) => !cleaned.has(f.id)).length),
      sub: formatBytes(report.junk.filter((f) => !cleaned.has(f.id)).reduce((n, f) => n + f.size, 0)),
      icon: Trash2,
    },
    {
      tab: "large" as const,
      label: "安装包",
      value: formatCount(report.installers.filter((f) => !cleaned.has(f.id)).length),
      sub: formatBytes(report.installers.filter((f) => !cleaned.has(f.id)).reduce((n, f) => n + f.size, 0)),
      icon: Package,
    },
    {
      tab: "large" as const,
      label: "陈年压缩包",
      value: formatCount(report.archives.filter((f) => !cleaned.has(f.id)).length),
      sub: formatBytes(report.archives.filter((f) => !cleaned.has(f.id)).reduce((n, f) => n + f.size, 0)),
      icon: FileArchive,
    },
  ];

  return (
    <div className="stagger-in space-y-8">
      <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-7">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <HealthRing score={live.health} />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {report.source === "demo" ? "示例桌面 · 典型凌乱电脑" : `已扫描 ${report.folderName}`}
              {report.truncated ? " · 达到扫描上限，结果为部分目录" : null}
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
              还可收回 {formatBytes(live.recoverable)}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              共清点 {formatCount(report.fileCount)} 个文件，合计 {formatBytes(report.totalBytes)}。
              系统垃圾走存储感知；这里专盯重复文件、卸载残留和过期安装包。电影和唯一的工作文档请先核对再动。
            </p>
            {live.cleanedBytes > 0 ? (
              <p className="mt-3 text-sm text-ok">已处理 {formatBytes(live.cleanedBytes)}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => onOpenTab("plan")}>查看清理计划</Button>
              <Button variant="outline" onClick={() => onOpenTab("care")}>
                系统养护清单
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => onOpenTab(card.tab)}
            className="rounded-2xl bg-card p-4 text-left shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shadow-border)]"
          >
            <card.icon className="size-4 text-muted-foreground" />
            <p className="mt-3 text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-display text-2xl font-medium tabular-nums tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </button>
        ))}
      </section>

      {report.recommendations.length > 0 ? (
        <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg font-medium">清理建议</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            对照系统自带的清理建议：先看类别，再进清理计划勾选。不会自动删除。
          </p>
          <ul className="mt-4 space-y-3">
            {report.recommendations.map((rec) => (
              <li key={rec.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{rec.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm tabular-nums">{formatBytes(rec.bytes)}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">{formatCount(rec.count)} 项</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg font-medium">空间构成</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.byType}
                  dataKey="bytes"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                >
                  {report.byType.map((slice) => (
                    <Cell key={slice.kind} fill={CHART_COLOR[slice.kind]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => formatBytes(Number(value ?? 0))}
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 space-y-1.5">
            {report.byType.slice(0, 6).map((slice) => (
              <li key={slice.kind} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: CHART_COLOR[slice.kind] }}
                  />
                  {slice.label}
                </span>
                <span className="tabular-nums text-muted-foreground">{formatBytes(slice.bytes)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-display text-lg font-medium">最占地方的目录</h2>
          <p className="mt-1 text-xs text-muted-foreground">先看体积最大的文件夹，再决定扫哪里。</p>
          <ul className="mt-4 space-y-3">
            {report.topFolders.map((folder) => {
              const pct = report.totalBytes > 0 ? (folder.bytes / report.totalBytes) * 100 : 0;
              return (
                <li key={folder.path}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{folder.path}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatBytes(folder.bytes)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <HardDrive className="mt-0.5 size-3.5 shrink-0" />
            建议先扫「下载」「桌面」「微信文件」。系统盘和 Program Files 不要整目录删除。
          </p>
        </div>
      </section>
    </div>
  );
}

function DupeList({
  groups,
  selected,
  cleaned,
  onToggle,
  onSelectGroup,
}: {
  groups: DuplicateGroup[];
  selected: Set<string>;
  cleaned: Set<string>;
  onToggle: (id: string) => void;
  onSelectGroup: (ids: string[], on: boolean) => void;
}) {
  if (groups.length === 0) {
    return <EmptyState title="没有发现重复文件" body="同一大小、同一文件名或相近文档名都没有成组。" />;
  }
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-medium tracking-tight">重复文件</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          每组建议只留一份。默认勾选带「(1)」或「副本」的文件。
        </p>
      </header>
      {groups.map((group) => {
        const visible = group.files;
        const leftover = visible.filter((f) => !cleaned.has(f.id));
        const ids = leftover.map((f) => f.id);
        const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
        return (
          <section key={group.id} className="rounded-2xl bg-card p-2 shadow-[var(--shadow-border)] sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{group.label}</p>
                <p className="text-xs text-muted-foreground">
                  {visible.length} 份 · 可收回 {formatBytes(group.wastedBytes)}
                  {group.reason === "near-name" ? " · 近名文档" : group.reason === "fingerprint" ? " · 内容指纹相同" : " · 同名同大小"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectGroup(ids, !allOn)}
              >
                {allOn ? "取消本组" : "勾选本组"}
              </Button>
            </div>
            <Separator />
            <div className="divide-y divide-border">
              {visible.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  cleaned={cleaned.has(file.id)}
                  checked={selected.has(file.id)}
                  onCheckedChange={() => onToggle(file.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CategoryList({
  title,
  hint,
  files,
  selected,
  cleaned,
  onToggle,
}: {
  title: string;
  hint: string;
  files: ScannedFile[];
  selected: Set<string>;
  cleaned: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (files.length === 0) {
    return <EmptyState title={`没有${title}`} body="这一类是干净的。" />;
  }
  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-4 divide-y divide-border rounded-2xl bg-card p-2 shadow-[var(--shadow-border)]">
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            cleaned={cleaned.has(file.id)}
            checked={selected.has(file.id)}
            onCheckedChange={() => onToggle(file.id)}
          />
        ))}
      </div>
    </div>
  );
}

function LargePanel({
  large,
  installers,
  archives,
  stale,
  selected,
  cleaned,
  onToggle,
}: {
  large: ScannedFile[];
  installers: ScannedFile[];
  archives: ScannedFile[];
  stale: ScannedFile[];
  selected: Set<string>;
  cleaned: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      <CategoryList
        title="超大文件"
        hint="大于约 80 MB 的文件。电影、课程录像请先确认不是唯一拷贝。"
        files={large}
        selected={selected}
        cleaned={cleaned}
        onToggle={onToggle}
      />
      <CategoryList
        title="安装包"
        hint="软件装完就可以丢掉。浏览器会把安装包一留再留。"
        files={installers}
        selected={selected}
        cleaned={cleaned}
        onToggle={onToggle}
      />
      <CategoryList
        title="陈年压缩包"
        hint="下载或桌面上超过半年的 zip / rar / iso。"
        files={archives}
        selected={selected}
        cleaned={cleaned}
        onToggle={onToggle}
      />
      <CategoryList
        title="一年未动的下载"
        hint="不一定能删，但很适合从桌面挪到归档盘。"
        files={stale}
        selected={selected}
        cleaned={cleaned}
        onToggle={onToggle}
      />
    </div>
  );
}

function PlanPanel({
  report,
  live,
  selected,
  cleaned,
  onToggle,
  onSuggested,
  onClear,
}: {
  report: NonNullable<ReturnType<typeof useCleaner.getState>["report"]>;
  live: { remainingSuggested: ScannedFile[]; recoverable: number };
  selected: Set<string>;
  cleaned: Set<string>;
  onToggle: (id: string) => void;
  onSuggested: () => void;
  onClear: () => void;
}) {
  const steps = [
    {
      n: "01",
      title: "先收重复",
      body: "照片、安装包、压缩包每组只留一份。优先删带 (1)、副本的那个。",
    },
    {
      n: "02",
      title: "再扫尘余",
      body: "tmp、log、cache、Thumbs.db、未下完的 crdownload，一般可直接丢掉。",
    },
    {
      n: "03",
      title: "安装包与旧压缩包",
      body: "软件装好后安装包没有用。半年没解压的资料包，多半已经在别处。",
    },
    {
      n: "04",
      title: "最后才动大视频",
      body: "唯一的课程、影片不要放进自动勾选。确认有备份再删。",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
        <p className="text-sm text-muted-foreground">建议处理</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
          {formatBytes(live.recoverable)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {formatCount(live.remainingSuggested.length)} 个文件已被标为可安全下手的候选。大视频和唯一文档没有自动勾选。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSuggested}>
            <ScanSearch />
            按建议勾选
          </Button>
          <Button variant="outline" onClick={onClear}>
            清空选择
          </Button>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.n} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
            <p className="font-mono text-xs text-muted-foreground">{step.n}</p>
            <h2 className="mt-2 font-display text-lg font-medium">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="divide-y divide-border rounded-2xl bg-card p-2 shadow-[var(--shadow-border)]">
        {live.remainingSuggested.slice(0, 40).map((file) => (
          <FileRow
            key={file.id}
            file={file}
            cleaned={cleaned.has(file.id)}
            checked={selected.has(file.id)}
            onCheckedChange={() => onToggle(file.id)}
          />
        ))}
        {live.remainingSuggested.length > 40 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">
            其余 {live.remainingSuggested.length - 40} 项已包含在「按建议勾选」里。
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        分类标签来自扩展名与路径，不会打开文件内容。指纹核对只读取同大小文件的开头一小段。
      </p>
      <p className="sr-only">{KIND_LABEL.other}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card px-6 py-16 text-center shadow-[var(--shadow-border)]">
      <p className="font-display text-xl font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
