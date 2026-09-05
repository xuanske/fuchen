export type AutoSummary = {
  at: number;
  folderName: string;
  recoverableBytes: number;
  fileCount: number;
  health: number;
};

export type AutoSettings = {
  autoScanOnOpen: boolean;
  notify: boolean;
  intervalHours: number;
  lastAutoScanAt: number | null;
  lastSummary: AutoSummary | null;
};

const KEY = "fuchen.auto.v1";

export const DEFAULT_AUTO: AutoSettings = {
  autoScanOnOpen: true,
  notify: true,
  intervalHours: 4,
  lastAutoScanAt: null,
  lastSummary: null,
};

export function loadAutoSettings(): AutoSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_AUTO };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_AUTO };
    const parsed = JSON.parse(raw) as Partial<AutoSettings>;
    return {
      autoScanOnOpen: parsed.autoScanOnOpen !== false,
      notify: parsed.notify !== false,
      intervalHours:
        typeof parsed.intervalHours === "number" && parsed.intervalHours >= 0
          ? parsed.intervalHours
          : 4,
      lastAutoScanAt: typeof parsed.lastAutoScanAt === "number" ? parsed.lastAutoScanAt : null,
      lastSummary: parsed.lastSummary && typeof parsed.lastSummary.at === "number" ? parsed.lastSummary : null,
    };
  } catch {
    return { ...DEFAULT_AUTO };
  }
}

export function saveAutoSettings(patch: Partial<AutoSettings>): AutoSettings {
  const next = { ...loadAutoSettings(), ...patch };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.parent !== window) return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches
  );
}

export function shouldAutoScanNow(settings: AutoSettings = loadAutoSettings(), now = Date.now()): boolean {
  if (!settings.autoScanOnOpen) return false;
  if (!settings.lastAutoScanAt) return true;
  const wait = Math.max(0, settings.intervalHours) * 3_600_000;
  return now - settings.lastAutoScanAt >= wait;
}

export function hoursUntilNextScan(settings: AutoSettings = loadAutoSettings(), now = Date.now()): number {
  if (!settings.lastAutoScanAt) return 0;
  const wait = Math.max(0, settings.intervalHours) * 3_600_000;
  return Math.max(0, (settings.lastAutoScanAt + wait - now) / 3_600_000);
}
