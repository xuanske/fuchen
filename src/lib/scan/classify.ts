import type { FileFlag, FileKind, RawFile } from "./types.ts";

const PHOTO = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "heic",
  "heif",
  "bmp",
  "raw",
  "dng",
  "tif",
  "tiff",
]);
const VIDEO = new Set(["mp4", "mov", "mkv", "avi", "wmv", "flv", "webm", "m4v", "ts"]);
const AUDIO = new Set(["mp3", "wav", "flac", "aac", "m4a", "ogg", "wma"]);
const DOC = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "md",
  "csv",
  "rtf",
  "pages",
  "numbers",
  "key",
]);
const INSTALLER = new Set(["exe", "msi", "dmg", "pkg", "apk", "appx", "msix", "deb", "rpm"]);
const ARCHIVE = new Set(["zip", "rar", "7z", "tar", "gz", "tgz", "iso", "xz"]);
const CACHE_EXT = new Set([
  "tmp",
  "temp",
  "log",
  "old",
  "bak",
  "crdownload",
  "part",
  "download",
  "cache",
  "xltd",
]);

const JUNK_NAMES = /^(thumbs\.db|desktop\.ini|\.ds_store|ehthumbs\.db|icon\r)$/i;
const INSTALLER_NAME =
  /(setup|installer|install|uninstall|安装包|安装程序|升级|update|chrome|edge|wechat|微信|qq|dingtalk|钉钉|zoom|腾讯会议|baidunetdisk|百度网盘|thunder|迅雷)/i;
const CACHE_PATH =
  /(^|\/)(temp|tmp|cache|caches|logs|crashdumps|缓存|临时文件|code cache|gpu cache|shadercache|gpucache)(\/|$)/i;
const LEFTOVER_PATH =
  /(discord|slack|teams|steam\/.*(logs|htmlcache|shadercache)|code cache|gpu cache|shadercache|npm-cache|\.npm|pip\/cache|vscode\/logs|obs-studio\/logs|adobe.*media cache|weixin\/.*cache)/i;

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i <= 0) return "";
  return name.slice(i + 1).toLowerCase();
}

export function kindOf(name: string, ext: string): FileKind {
  if (PHOTO.has(ext)) return "photo";
  if (VIDEO.has(ext)) return "video";
  if (AUDIO.has(ext)) return "audio";
  if (DOC.has(ext)) return "document";
  if (INSTALLER.has(ext) || INSTALLER_NAME.test(name)) return "installer";
  if (ARCHIVE.has(ext)) return "archive";
  if (CACHE_EXT.has(ext) || JUNK_NAMES.test(name)) return "cache";
  return "other";
}

export function isCloudPath(path: string): boolean {
  return /onedrive|icloud|dropbox|坚果云/i.test(path.replaceAll("\\", "/"));
}

export function isDownloadsPath(path: string): boolean {
  return /下载|downloads/i.test(path.replaceAll("\\", "/"));
}

export function isJunkName(name: string, ext: string, path: string): boolean {
  if (JUNK_NAMES.test(name)) return true;
  if (CACHE_EXT.has(ext)) return true;
  if (CACHE_PATH.test(path.replaceAll("\\", "/"))) return true;
  if (LEFTOVER_PATH.test(path.replaceAll("\\", "/"))) return true;
  return false;
}

export function isInstallerFile(name: string, ext: string): boolean {
  return INSTALLER.has(ext) || (INSTALLER_NAME.test(name) && (ext === "exe" || ext === "msi"));
}

export function normalizeName(name: string): string {
  const i = name.lastIndexOf(".");
  const base = i > 0 ? name.slice(0, i) : name;
  const ext = i > 0 ? name.slice(i).toLowerCase() : "";
  const cleaned = base
    .replace(/\s*\(\d+\)$/u, "")
    .replace(/\s*[-_]?copy(?:\s*\(\d+\))?$/iu, "")
    .replace(/\s*[-_]?副本\s*\d*$/u, "")
    .replace(/的副本$/u, "")
    .replace(/_最终+/gu, "_最终")
    .replace(/[_\s]+$/u, "")
    .trim()
    .toLowerCase();
  return `${cleaned}${ext}`;
}

export function folderOf(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const i = normalized.lastIndexOf("/");
  return i > 0 ? normalized.slice(0, i) : normalized;
}

export function topFolderOf(path: string, rootName: string): string {
  const normalized = path.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) return rootName || parts[0] || "根目录";
  if (parts[0] === rootName && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] ?? rootName;
}

export function classifyFlags(
  file: RawFile,
  ext: string,
  kind: FileKind,
  now = Date.now(),
): FileFlag[] {
  const flags: FileFlag[] = [];
  const path = file.path.replaceAll("\\", "/");
  const ageDays = (now - file.lastModified) / 86_400_000;
  const inDownloads = isDownloadsPath(path);

  if (isJunkName(file.name, ext, path)) flags.push("junk");
  if (isInstallerFile(file.name, ext)) flags.push("installer");
  if (file.size >= 80 * 1024 * 1024) flags.push("large");
  if (inDownloads && ageDays >= 90) flags.push("stale");
  if (kind === "archive" && inDownloads && ageDays >= 180) flags.push("archive-stale");
  if (isCloudPath(path)) flags.push("cloud");
  return flags;
}

export const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "windows",
  "system volume information",
  "$recycle.bin",
  "recycle.bin",
  "windows.old",
  "$windows.~bt",
  "$windows.~ws",
  "recovery",
  "program files",
  "program files (x86)",
  "programdata",
  "proc",
  "sys",
  "dev",
  ".trash",
  "lost+found",
]);
