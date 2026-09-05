const DB_NAME = "fuchen-watch-v1";
const STORE = "dirs";

export type WatchedDir = {
  id: string;
  name: string;
  addedAt: number;
  handle: FileSystemDirectoryHandle;
};

export type WatchedStatus = WatchedDir & {
  permission: PermissionState | "unknown";
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb"));
  });
}

function reqAs<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb"));
  });
}

export async function listWatched(): Promise<WatchedDir[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDb();
    const rows = await reqAs(db.transaction(STORE, "readonly").objectStore(STORE).getAll());
    db.close();
    return (rows ?? []).filter((row) => row && row.handle);
  } catch {
    return [];
  }
}

export async function saveWatched(handle: FileSystemDirectoryHandle): Promise<WatchedDir> {
  const existing = await listWatched();
  for (const row of existing) {
    try {
      if (await row.handle.isSameEntry?.(handle)) return row;
    } catch {
      /* ignore */
    }
  }
  const row: WatchedDir = {
    id: crypto.randomUUID(),
    name: handle.name || "文件夹",
    addedAt: Date.now(),
    handle,
  };
  const db = await openDb();
  await reqAs(db.transaction(STORE, "readwrite").objectStore(STORE).put(row));
  db.close();
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignore */
  }
  return row;
}

export async function removeWatched(id: string): Promise<void> {
  const db = await openDb();
  await reqAs(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
  db.close();
}

export async function queryHandlePermission(
  handle: FileSystemDirectoryHandle,
  mode: "read" | "readwrite" = "readwrite",
): Promise<PermissionState | "unknown"> {
  try {
    if (typeof handle.queryPermission === "function") {
      return await handle.queryPermission({ mode });
    }
    return "granted";
  } catch {
    return "unknown";
  }
}

export async function requestHandlePermission(
  handle: FileSystemDirectoryHandle,
  mode: "read" | "readwrite" = "readwrite",
): Promise<PermissionState | "unknown"> {
  try {
    if (typeof handle.requestPermission === "function") {
      return await handle.requestPermission({ mode });
    }
    return "granted";
  } catch {
    return "denied";
  }
}

export async function describeWatched(): Promise<WatchedStatus[]> {
  const rows = await listWatched();
  const out: WatchedStatus[] = [];
  for (const row of rows) {
    out.push({
      ...row,
      permission: await queryHandlePermission(row.handle),
    });
  }
  return out;
}

export async function grantedHandles(): Promise<FileSystemDirectoryHandle[]> {
  const rows = await describeWatched();
  return rows.filter((row) => row.permission === "granted").map((row) => row.handle);
}
