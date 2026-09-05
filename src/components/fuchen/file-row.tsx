import type { ReactNode } from "react";
import {
  FileArchive,
  FileText,
  Film,
  Image as ImageIcon,
  Package,
  File as FileIcon,
  Music,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FLAG_LABEL, type FileFlag, type ScannedFile } from "@/lib/scan/types";
import { cn, formatAge, formatBytes } from "@/lib/utils";

const KIND_ICON = {
  photo: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  installer: Package,
  archive: FileArchive,
  cache: Trash2,
  other: FileIcon,
};

export function FileRow({
  file,
  checked,
  onCheckedChange,
  cleaned,
  extra,
}: {
  file: ScannedFile;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  cleaned?: boolean;
  extra?: ReactNode;
}) {
  const Icon = KIND_ICON[file.kind];
  const flags = file.flags.filter((f) => f !== "duplicate" || file.flags.length === 1);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-3 py-3",
        cleaned && "opacity-40",
      )}
    >
      {onCheckedChange ? (
        <Checkbox
          checked={checked}
          disabled={cleaned}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          aria-label={`选择 ${file.name}`}
          className="mt-0.5"
        />
      ) : null}
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className={cn("truncate text-sm font-medium", cleaned && "line-through")}>
            {file.name}
          </p>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {formatBytes(file.size)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{file.path}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{formatAge(file.lastModified)}</span>
          {flags.slice(0, 3).map((flag: FileFlag) => (
            <Badge
              key={flag}
              variant={flag === "junk" || flag === "installer" ? "danger" : flag === "stale" || flag === "archive-stale" ? "warn" : "default"}
            >
              {FLAG_LABEL[flag]}
            </Badge>
          ))}
          {cleaned ? <Badge variant="pine">已清理</Badge> : null}
          {extra}
        </div>
      </div>
    </div>
  );
}
