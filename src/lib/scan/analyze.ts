import { classifyFlags, extOf, isCloudPath, isDownloadsPath, kindOf, normalizeName, topFolderOf } from "./classify.ts";
import { KIND_LABEL, type CleanupRec, type DuplicateGroup, type FileKind, type RawFile, type ScanReport, type ScanSource, type ScannedFile, type TypeSlice } from "./types.ts";

const LARGE_LIMIT = 80 * 1024 * 1024;
const HASH_SIZE_CAP = 48 * 1024 * 1024;
const HASH_FULL = 2 * 1024 * 1024;
const HASH_HEAD = 256 * 1024;

export function keepPreferred(a: ScannedFile, b: ScannedFile): ScannedFile {
  const score = (f: ScannedFile) => {
    let s = 0;
    if (!/\(\d+\)|副本|copy|拷贝/i.test(f.name)) s += 5;
    if (!isDownloadsPath(f.path)) s += 3;
    if (isCloudPath(f.path)) s += 1;
    s -= f.path.length / 800;
    s -= f.lastModified / 1e15;
    return s;
  };
  return score(a) >= score(b) ? a : b;
}

function wastedOf(files: ScannedFile[]): number {
  if (files.length < 2) return 0;
  const total = files.reduce((n, f) => n + f.size, 0);
  const keep = files.reduce((a, b) => (a.size >= b.size ? a : b));
  return Math.max(0, total - keep.size);
}

function recOf(
  id: string,
  title: string,
  detail: string,
  files: ScannedFile[],
): CleanupRec | null {
  if (!files.length) return null;
  return {
    id,
    title,
    detail,
    bytes: files.reduce((n, f) => n + f.size, 0),
    count: files.length,
    ids: files.map((f) => f.id),
  };
}

export async function fingerprintBlob(blob: Blob): Promise<string | undefined> {
  try {
    const take = blob.size <= HASH_FULL ? blob.size : Math.min(HASH_HEAD, blob.size);
    const slice = blob.slice(0, take);
    const buf = await slice.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    let hex = "";
    for (let i = 0; i < 8; i++) hex += bytes[i]!.toString(16).padStart(2, "0");
    return `${hex}:${blob.size}:${take}`;
  } catch {
    return undefined;
  }
}

export async function analyze(opts: {
  files: RawFile[];
  source: ScanSource;
  folderName: string;
  truncated?: boolean;
  onProgress?: (current: string, hashed: number, total: number) => void;
  signal?: AbortSignal;
}): Promise<ScanReport> {
  const now = Date.now();
  const scanned: ScannedFile[] = opts.files.map((file) => {
    const ext = extOf(file.name);
    const kind = kindOf(file.name, ext);
    return {
      ...file,
      ext,
      kind,
      flags: classifyFlags(file, ext, kind, now),
    };
  });

  const sizeGroups = new Map<number, ScannedFile[]>();
  for (const file of scanned) {
    if (file.size <= 0) continue;
    const list = sizeGroups.get(file.size);
    if (list) list.push(file);
    else sizeGroups.set(file.size, [file]);
  }

  const toHash: ScannedFile[] = [];
  for (const group of sizeGroups.values()) {
    if (group.length < 2) continue;
    for (const file of group) {
      if (file.blob && file.size <= HASH_SIZE_CAP) toHash.push(file);
    }
  }

  for (let i = 0; i < toHash.length; i++) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const file = toHash[i]!;
    opts.onProgress?.(file.path, i + 1, toHash.length);
    file.fingerprint = await fingerprintBlob(file.blob!);
    if (i % 6 === 5) await new Promise((r) => setTimeout(r, 0));
  }

  const dupes: DuplicateGroup[] = [];
  const inDupe = new Set<string>();

  const fpGroups = new Map<string, ScannedFile[]>();
  for (const file of scanned) {
    if (!file.fingerprint) continue;
    const list = fpGroups.get(file.fingerprint);
    if (list) list.push(file);
    else fpGroups.set(file.fingerprint, [file]);
  }
  let di = 0;
  for (const group of fpGroups.values()) {
    if (group.length < 2) continue;
    for (const f of group) {
      inDupe.add(f.id);
      if (!f.flags.includes("duplicate")) f.flags.push("duplicate");
    }
    dupes.push({
      id: `fp-${di++}`,
      reason: "fingerprint",
      label: group[0]!.name,
      files: group,
      wastedBytes: wastedOf(group),
    });
  }

  const nameSize = new Map<string, ScannedFile[]>();
  for (const file of scanned) {
    if (inDupe.has(file.id) || file.size <= 0) continue;
    const key = `${normalizeName(file.name)}::${file.size}`;
    const list = nameSize.get(key);
    if (list) list.push(file);
    else nameSize.set(key, [file]);
  }
  for (const group of nameSize.values()) {
    if (group.length < 2) continue;
    for (const f of group) {
      inDupe.add(f.id);
      if (!f.flags.includes("duplicate")) f.flags.push("duplicate");
    }
    dupes.push({
      id: `ns-${di++}`,
      reason: "name-size",
      label: group[0]!.name,
      files: group,
      wastedBytes: wastedOf(group),
    });
  }

  const nearName = new Map<string, ScannedFile[]>();
  for (const file of scanned) {
    if (inDupe.has(file.id)) continue;
    if (file.kind !== "document" && file.kind !== "photo") continue;
    const key = normalizeName(file.name);
    const list = nearName.get(key);
    if (list) list.push(file);
    else nearName.set(key, [file]);
  }
  for (const group of nearName.values()) {
    if (group.length < 2) continue;
    for (const f of group) {
      inDupe.add(f.id);
      if (!f.flags.includes("duplicate")) f.flags.push("duplicate");
    }
    dupes.push({
      id: `nn-${di++}`,
      reason: "near-name",
      label: group[0]!.name,
      files: group,
      wastedBytes: wastedOf(group),
    });
  }

  dupes.sort((a, b) => b.wastedBytes - a.wastedBytes);

  const junk = scanned
    .filter((f) => f.flags.includes("junk"))
    .sort((a, b) => b.size - a.size);
  const installers = scanned
    .filter((f) => f.flags.includes("installer"))
    .sort((a, b) => b.size - a.size);
  const archives = scanned
    .filter((f) => f.flags.includes("archive-stale"))
    .sort((a, b) => b.size - a.size);
  const large = scanned
    .filter((f) => f.size >= LARGE_LIMIT)
    .sort((a, b) => b.size - a.size)
    .slice(0, 40);
  const stale = scanned
    .filter((f) => f.flags.includes("stale"))
    .sort((a, b) => a.lastModified - b.lastModified)
    .slice(0, 40);

  const suggested = new Set<string>();
  const extras: ScannedFile[] = [];
  for (const group of dupes) {
    const keep = group.files.reduce(keepPreferred);
    for (const f of group.files) {
      if (f.id !== keep.id) {
        suggested.add(f.id);
        extras.push(f);
      }
    }
  }
  for (const f of junk) suggested.add(f.id);
  for (const f of installers) {
    const age = (now - f.lastModified) / 86_400_000;
    if (age >= 14) suggested.add(f.id);
  }
  for (const f of archives) suggested.add(f.id);

  const leftover = junk.filter((f) => /discord|steam|adobe|shadercache|teams|slack/i.test(f.path));
  const oldInstallers = installers.filter((f) => (now - f.lastModified) / 86_400_000 >= 14);
  const cloudExtras = extras.filter((f) => {
    const group = dupes.find((g) => g.files.some((x) => x.id === f.id));
    if (!group) return false;
    const mixed = group.files.some((x) => x.flags.includes("cloud")) && group.files.some((x) => !x.flags.includes("cloud"));
    return mixed && !f.flags.includes("cloud");
  });

  const recommendations = [
    recOf("dupes", "重复副本", "同一份内容留一份即可。优先留原名、不在下载文件夹里的那份。", extras),
    recOf("leftover", "软件卸载残留", "Discord / Steam / Adobe 这类缓存，Windows 存储感知扫不到。", leftover),
    recOf("installers", "过期安装包", "下载里超过两周的安装包，装完就可以删。", oldInstallers),
    recOf("archives", "陈年压缩包", "下载里放了半年以上的压缩包。", archives),
    recOf("cloud", "云盘里已有的本地副本", "OneDrive / iCloud 里已有一份时，下载文件夹里的拷贝可以删。不会改云盘文件。", cloudExtras),
  ].filter((x): x is CleanupRec => Boolean(x));

  const suggestedFiles = scanned.filter((f) => suggested.has(f.id));
  const recoverableBytes = suggestedFiles.reduce((n, f) => n + f.size, 0);
  const totalBytes = scanned.reduce((n, f) => n + f.size, 0);

  const byTypeMap = new Map<FileKind, TypeSlice>();
  for (const kind of Object.keys(KIND_LABEL) as FileKind[]) {
    byTypeMap.set(kind, { kind, label: KIND_LABEL[kind], bytes: 0, count: 0 });
  }
  for (const f of scanned) {
    const slice = byTypeMap.get(f.kind)!;
    slice.bytes += f.size;
    slice.count += 1;
  }
  const byType = [...byTypeMap.values()].filter((s) => s.count > 0).sort((a, b) => b.bytes - a.bytes);

  const folderMap = new Map<string, { path: string; bytes: number; count: number }>();
  for (const f of scanned) {
    const path = topFolderOf(f.path, opts.folderName);
    const rec = folderMap.get(path);
    if (rec) {
      rec.bytes += f.size;
      rec.count += 1;
    } else {
      folderMap.set(path, { path, bytes: f.size, count: 1 });
    }
  }
  const topFolders = [...folderMap.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 12);

  const dupeBytes = dupes.reduce((n, g) => n + g.wastedBytes, 0);
  const ratio = totalBytes > 0 ? recoverableBytes / totalBytes : 0;
  const dupeRatio = totalBytes > 0 ? dupeBytes / totalBytes : 0;
  let health = 100;
  health -= Math.min(38, ratio * 90);
  health -= Math.min(18, dupeRatio * 55);
  health -= Math.min(12, junk.length * 0.35);
  health -= Math.min(8, installers.length * 0.8);
  const healthScore = Math.round(Math.min(96, Math.max(18, health)));

  return {
    source: opts.source,
    folderName: opts.folderName,
    scannedAt: now,
    fileCount: scanned.length,
    truncated: Boolean(opts.truncated),
    totalBytes,
    recoverableBytes,
    healthScore,
    files: scanned,
    duplicates: dupes,
    junk,
    large,
    stale,
    installers,
    archives,
    byType,
    topFolders,
    suggestedIds: [...suggested],
    recommendations,
  };
}
