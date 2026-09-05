export type FileKind =
  | "photo"
  | "video"
  | "audio"
  | "document"
  | "installer"
  | "archive"
  | "cache"
  | "other";

export type FileFlag =
  | "junk"
  | "duplicate"
  | "large"
  | "stale"
  | "installer"
  | "archive-stale"
  | "cloud";

export type ScanSource = "demo" | "folder" | "input";

export type RawFile = {
  id: string;
  path: string;
  name: string;
  size: number;
  lastModified: number;
  blob?: Blob;
  handle?: FileSystemFileHandle;
  parent?: FileSystemDirectoryHandle;
};

export type ScannedFile = RawFile & {
  ext: string;
  kind: FileKind;
  flags: FileFlag[];
  fingerprint?: string;
};

export type DuplicateGroup = {
  id: string;
  reason: "name-size" | "fingerprint" | "near-name";
  label: string;
  files: ScannedFile[];
  wastedBytes: number;
};

export type TypeSlice = {
  kind: FileKind;
  label: string;
  bytes: number;
  count: number;
};

export type FolderSlice = {
  path: string;
  bytes: number;
  count: number;
};

export type CleanupRec = {
  id: string;
  title: string;
  detail: string;
  bytes: number;
  count: number;
  ids: string[];
};

export type ScanReport = {
  source: ScanSource;
  folderName: string;
  scannedAt: number;
  fileCount: number;
  truncated: boolean;
  totalBytes: number;
  recoverableBytes: number;
  healthScore: number;
  files: ScannedFile[];
  duplicates: DuplicateGroup[];
  junk: ScannedFile[];
  large: ScannedFile[];
  stale: ScannedFile[];
  installers: ScannedFile[];
  archives: ScannedFile[];
  byType: TypeSlice[];
  topFolders: FolderSlice[];
  suggestedIds: string[];
  recommendations: CleanupRec[];
};

export type ScanProgress = {
  scanned: number;
  bytes: number;
  current: string;
  phase: "walk" | "hash" | "analyze";
};

export const KIND_LABEL: Record<FileKind, string> = {
  photo: "图片",
  video: "视频",
  audio: "音频",
  document: "文档",
  installer: "安装包",
  archive: "压缩包",
  cache: "缓存/临时",
  other: "其他",
};

export const FLAG_LABEL: Record<FileFlag, string> = {
  junk: "尘余",
  duplicate: "重复",
  large: "超大",
  stale: "陈旧",
  installer: "安装包",
  "archive-stale": "旧压缩包",
  cloud: "云盘里也有",
};
