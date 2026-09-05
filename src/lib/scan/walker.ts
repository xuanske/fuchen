import { SKIP_DIR } from "./classify";
import type { RawFile } from "./types";

export const FILE_CAP = 6000;

export function canPickDirectory(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

function makeId(path: string, index: number): string {
  return `${index}:${path}`;
}

export async function walkDirectoryHandle(
  root: FileSystemDirectoryHandle,
  opts: {
    onProgress?: (scanned: number, bytes: number, current: string) => void;
    signal?: AbortSignal;
    indexOffset?: number;
    fileCap?: number;
  } = {},
): Promise<{ files: RawFile[]; truncated: boolean; folderName: string }> {
  const files: RawFile[] = [];
  let bytes = 0;
  let truncated = false;
  let index = opts.indexOffset ?? 0;
  const cap = opts.fileCap ?? FILE_CAP;

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix: string,
    depth: number,
  ): Promise<void> {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (files.length >= cap) {
      truncated = true;
      return;
    }
    let entries: FileSystemHandle[] = [];
    try {
      for await (const [, entry] of dir.entries()) entries.push(entry);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= cap) {
        truncated = true;
        return;
      }
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        if (SKIP_DIR.has(entry.name.toLowerCase()) || depth > 12) continue;
        await walk(entry as FileSystemDirectoryHandle, path, depth + 1);
        continue;
      }
      try {
        const handle = entry as FileSystemFileHandle;
        const file = await handle.getFile();
        const rec: RawFile = {
          id: makeId(path, index++),
          path,
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          blob: file,
          handle,
          parent: dir,
        };
        files.push(rec);
        bytes += file.size;
        if (files.length % 24 === 0) {
          opts.onProgress?.(files.length, bytes, path);
          await new Promise((r) => setTimeout(r, 0));
        }
      } catch {
        /* unreadable file */
      }
    }
  }

  await walk(root, root.name, 0);
  opts.onProgress?.(files.length, bytes, root.name);
  return { files, truncated, folderName: root.name };
}

export async function walkDirectoryHandles(
  roots: FileSystemDirectoryHandle[],
  opts: {
    onProgress?: (scanned: number, bytes: number, current: string) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ files: RawFile[]; truncated: boolean; folderName: string }> {
  const files: RawFile[] = [];
  let truncated = false;
  let bytes = 0;
  for (const root of roots) {
    if (files.length >= FILE_CAP) {
      truncated = true;
      break;
    }
    const walked = await walkDirectoryHandle(root, {
      signal: opts.signal,
      indexOffset: files.length,
      fileCap: FILE_CAP - files.length,
      onProgress: (scanned, b, current) => {
        opts.onProgress?.(files.length + scanned, bytes + b, current);
      },
    });
    files.push(...walked.files);
    bytes += walked.files.reduce((n, f) => n + f.size, 0);
    if (walked.truncated) truncated = true;
  }
  const names = roots.map((r) => r.name).filter(Boolean);
  return {
    files,
    truncated,
    folderName: names.length ? names.join(" · ") : "监视文件夹",
  };
}

export function filesFromList(list: FileList): { files: RawFile[]; folderName: string; truncated: boolean } {
  const files: RawFile[] = [];
  let truncated = false;
  const limit = Math.min(list.length, FILE_CAP);
  if (list.length > FILE_CAP) truncated = true;
  let folderName = "所选文件夹";
  for (let i = 0; i < limit; i++) {
    const file = list[i]!;
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const path = relative || file.name;
    if (i === 0) {
      const root = path.replaceAll("\\", "/").split("/")[0];
      if (root) folderName = root;
    }
    files.push({
      id: makeId(path, i),
      path,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      blob: file,
    });
  }
  return { files, folderName, truncated };
}
