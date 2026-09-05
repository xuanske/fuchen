import { create } from "zustand";
import { analyze } from "@/lib/scan/analyze";
import { loadAutoSettings, saveAutoSettings, shouldAutoScanNow } from "@/lib/scan/auto-settings";
import { DEMO_FOLDER, DEMO_WALK_PATHS, getDemoFiles } from "@/lib/scan/demo-data";
import type { RawFile, ScanProgress, ScanReport, ScanSource } from "@/lib/scan/types";
import { canPickDirectory, filesFromList, walkDirectoryHandle, walkDirectoryHandles } from "@/lib/scan/walker";
import { grantedHandles, saveWatched } from "@/lib/scan/watched";
import { formatBytes, sleep } from "@/lib/utils";

export type View = "home" | "scanning" | "report";
export type ReportTab = "overview" | "dupes" | "junk" | "large" | "plan" | "care";
export type ScanKind = "manual" | "auto";

type CleanerState = {
  view: View;
  tab: ReportTab;
  progress: ScanProgress;
  report: ScanReport | null;
  selectedIds: string[];
  cleanedIds: string[];
  error: string | null;
  busy: boolean;
  lastClean: { count: number; bytes: number } | null;
  scanKind: ScanKind;
  startDemoScan: () => Promise<void>;
  startFolderScan: () => Promise<void>;
  startInputScan: (list: FileList) => Promise<void>;
  scanWatched: (kind?: ScanKind) => Promise<boolean>;
  maybeAutoStart: () => Promise<void>;
  cancelScan: () => void;
  setTab: (tab: ReportTab) => void;
  toggleSelected: (id: string) => void;
  selectSuggested: () => void;
  selectIds: (ids: string[], on?: boolean) => void;
  clearSelection: () => void;
  confirmClean: () => Promise<{ ok: number; failed: number; bytes: number }>;
  reset: () => void;
};

const idleProgress: ScanProgress = {
  scanned: 0,
  bytes: 0,
  current: "",
  phase: "walk",
};

let abort: AbortController | null = null;
let autoTried = false;

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function rememberReport(report: ScanReport) {
  saveAutoSettings({
    lastAutoScanAt: Date.now(),
    lastSummary: {
      at: Date.now(),
      folderName: report.folderName,
      recoverableBytes: report.recoverableBytes,
      fileCount: report.fileCount,
      health: report.healthScore,
    },
  });
}

function pingNotification(report: ScanReport) {
  const settings = loadAutoSettings();
  if (!settings.notify) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (report.recoverableBytes < 20 * 1024 * 1024) return;
  try {
    new Notification("拂尘", {
      body: `${report.folderName} 还可清理 ${formatBytes(report.recoverableBytes)}`,
    });
  } catch {
    /* ignore */
  }
}

async function runAnalyze(
  set: (partial: Partial<CleanerState>) => void,
  files: RawFile[],
  source: ScanSource,
  folderName: string,
  truncated: boolean,
  signal: AbortSignal,
  kind: ScanKind,
) {
  set({
    progress: {
      scanned: files.length,
      bytes: files.reduce((n, f) => n + f.size, 0),
      current: "正在归类重复与尘余…",
      phase: "analyze",
    },
  });
  const report = await analyze({
    files,
    source,
    folderName,
    truncated,
    signal,
    onProgress: (current, hashed, total) => {
      set({
        progress: {
          scanned: files.length,
          bytes: files.reduce((n, f) => n + f.size, 0),
          current: total ? `核对指纹 ${hashed}/${total}  ${current}` : current,
          phase: "hash",
        },
      });
    },
  });
  rememberReport(report);
  if (kind === "auto") pingNotification(report);
  set({
    report,
    view: "report",
    tab: "overview",
    selectedIds: report.suggestedIds,
    cleanedIds: [],
    lastClean: null,
    busy: false,
    error: null,
    scanKind: kind,
  });
}

export const useCleaner = create<CleanerState>((set, get) => ({
  view: "home",
  tab: "overview",
  progress: idleProgress,
  report: null,
  selectedIds: [],
  cleanedIds: [],
  error: null,
  busy: false,
  lastClean: null,
  scanKind: "manual",

  setTab: (tab) => set({ tab }),

  reset: () => {
    abort?.abort();
    abort = null;
    set({
      view: "home",
      tab: "overview",
      progress: idleProgress,
      report: null,
      selectedIds: [],
      cleanedIds: [],
      error: null,
      busy: false,
      lastClean: null,
      scanKind: "manual",
    });
  },

  cancelScan: () => {
    abort?.abort();
    abort = null;
    set({ view: "home", busy: false, progress: idleProgress });
  },

  toggleSelected: (id) => set({ selectedIds: toggleIn(get().selectedIds, id) }),

  selectSuggested: () => {
    const report = get().report;
    if (!report) return;
    const cleaned = new Set(get().cleanedIds);
    set({ selectedIds: report.suggestedIds.filter((id) => !cleaned.has(id)) });
  },

  selectIds: (ids, on = true) => {
    const cleaned = new Set(get().cleanedIds);
    if (on) {
      const next = new Set(get().selectedIds);
      for (const id of ids) if (!cleaned.has(id)) next.add(id);
      set({ selectedIds: [...next] });
    } else {
      const drop = new Set(ids);
      set({ selectedIds: get().selectedIds.filter((id) => !drop.has(id)) });
    }
  },

  clearSelection: () => set({ selectedIds: [] }),

  startDemoScan: async () => {
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    set({
      view: "scanning",
      busy: true,
      error: null,
      scanKind: "manual",
      progress: { scanned: 0, bytes: 0, current: "准备扫描示例桌面…", phase: "walk" },
      report: null,
    });
    try {
      const files = getDemoFiles();
      let bytes = 0;
      for (let i = 0; i < files.length; i++) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        bytes += files[i]!.size;
        if (i % 3 === 0) {
          const path = DEMO_WALK_PATHS[i % DEMO_WALK_PATHS.length] ?? files[i]!.path;
          set({
            progress: {
              scanned: i + 1,
              bytes,
              current: path,
              phase: "walk",
            },
          });
          await sleep(28, signal);
        }
      }
      await runAnalyze(set, files, "demo", DEMO_FOLDER, false, signal, "manual");
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      set({
        view: "home",
        busy: false,
        error: err instanceof Error ? err.message : "扫描失败",
      });
    }
  },

  startFolderScan: async () => {
    if (!canPickDirectory()) {
      set({ error: "当前浏览器不支持直接选文件夹，请改用「选择文件夹」按钮，或先查看示例报告。" });
      return;
    }
    let handle: FileSystemDirectoryHandle;
    try {
      handle = await window.showDirectoryPicker!({
        mode: "readwrite",
        id: "fuchen-watch",
        startIn: "downloads",
      });
    } catch (err) {
      if ((err as DOMException).name === "AbortError" || (err as DOMException).name === "NotAllowedError") {
        return;
      }
      set({ error: "无法打开文件夹选择器。可改用页面上的文件选择，或查看示例报告。" });
      return;
    }

    try {
      await saveWatched(handle);
    } catch {
      /* still scan even if persist fails */
    }

    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    set({
      view: "scanning",
      busy: true,
      error: null,
      report: null,
      scanKind: "manual",
      progress: { scanned: 0, bytes: 0, current: handle.name, phase: "walk" },
    });
    try {
      const walked = await walkDirectoryHandle(handle, {
        signal,
        onProgress: (scanned, bytes, current) => {
          set({ progress: { scanned, bytes, current, phase: "walk" } });
        },
      });
      await runAnalyze(set, walked.files, "folder", walked.folderName, walked.truncated, signal, "manual");
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      set({
        view: "home",
        busy: false,
        error: err instanceof Error ? err.message : "扫描失败",
      });
    }
  },

  scanWatched: async (kind = "manual") => {
    const handles = await grantedHandles();
    if (handles.length === 0) {
      set({ error: "还没有可自动扫描的文件夹。请先授权「下载」或「桌面」。" });
      return false;
    }
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    set({
      view: "scanning",
      busy: true,
      error: null,
      report: null,
      scanKind: kind,
      progress: {
        scanned: 0,
        bytes: 0,
        current: handles.map((h) => h.name).join(" · "),
        phase: "walk",
      },
    });
    try {
      const walked = await walkDirectoryHandles(handles, {
        signal,
        onProgress: (scanned, bytes, current) => {
          set({ progress: { scanned, bytes, current, phase: "walk" } });
        },
      });
      await runAnalyze(set, walked.files, "folder", walked.folderName, walked.truncated, signal, kind);
      return true;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return false;
      set({
        view: "home",
        busy: false,
        error: err instanceof Error ? err.message : "扫描失败",
      });
      return false;
    }
  },

  maybeAutoStart: async () => {
    if (autoTried) return;
    if (get().busy || get().view !== "home") return;
    if (!shouldAutoScanNow()) return;
    const handles = await grantedHandles();
    if (handles.length === 0) return;
    autoTried = true;
    await get().scanWatched("auto");
  },

  startInputScan: async (list) => {
    if (!list.length) return;
    abort?.abort();
    abort = new AbortController();
    const signal = abort.signal;
    const packed = filesFromList(list);
    set({
      view: "scanning",
      busy: true,
      error: null,
      report: null,
      scanKind: "manual",
      progress: {
        scanned: 0,
        bytes: 0,
        current: packed.folderName,
        phase: "walk",
      },
    });
    try {
      let bytes = 0;
      for (let i = 0; i < packed.files.length; i++) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        bytes += packed.files[i]!.size;
        if (i % 20 === 0) {
          set({
            progress: {
              scanned: i + 1,
              bytes,
              current: packed.files[i]!.path,
              phase: "walk",
            },
          });
          await sleep(0, signal);
        }
      }
      await runAnalyze(set, packed.files, "input", packed.folderName, packed.truncated, signal, "manual");
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      set({
        view: "home",
        busy: false,
        error: err instanceof Error ? err.message : "扫描失败",
      });
    }
  },

  confirmClean: async () => {
    const { report, selectedIds, cleanedIds } = get();
    if (!report || selectedIds.length === 0) return { ok: 0, failed: 0, bytes: 0 };
    const selected = new Set(selectedIds);
    const targets = report.files.filter((f) => selected.has(f.id) && !cleanedIds.includes(f.id));
    const succeeded: string[] = [];
    let failed = 0;

    if (report.source === "folder") {
      for (const file of targets) {
        try {
          if (!file.parent) throw new Error("no-parent");
          const perm = await file.parent.requestPermission?.({ mode: "readwrite" });
          if (perm && perm !== "granted") throw new Error("permission");
          await file.parent.removeEntry(file.name);
          succeeded.push(file.id);
        } catch {
          failed += 1;
        }
      }
    } else {
      for (const file of targets) succeeded.push(file.id);
    }

    const bytes = report.files
      .filter((f) => succeeded.includes(f.id))
      .reduce((n, f) => n + f.size, 0);

    set({
      cleanedIds: [...cleanedIds, ...succeeded],
      selectedIds: get().selectedIds.filter((id) => !succeeded.includes(id)),
      lastClean: { count: succeeded.length, bytes },
    });
    return { ok: succeeded.length, failed, bytes };
  },
}));
