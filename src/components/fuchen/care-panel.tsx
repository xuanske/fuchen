import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CARE_ITEMS, loadCareDone, saveCareDone, type CareItem } from "@/lib/scan/care";
import { cn } from "@/lib/utils";

export function CareList({
  os = "all",
  numberedFrom = 1,
}: {
  os?: "win" | "mac" | "all";
  numberedFrom?: number;
}) {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    setDone(loadCareDone());
  }, []);

  const items = CARE_ITEMS.filter((item) => {
    if (os === "all") return true;
    return item.os === "both" || item.os === os;
  });
  const finished = items.filter((i) => done.includes(i.id)).length;

  function toggle(id: string) {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveCareDone(next);
      return next;
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm tabular-nums text-muted-foreground">
        {finished} / {items.length} 已在电脑上做完
      </p>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <CareRow
            key={item.id}
            item={item}
            index={numberedFrom + index}
            checked={done.includes(item.id)}
            onToggle={() => toggle(item.id)}
            showOs={os === "all"}
          />
        ))}
      </ol>
    </div>
  );
}

function CareRow({
  item,
  index,
  checked,
  onToggle,
  showOs,
}: {
  item: CareItem;
  index: number;
  checked: boolean;
  onToggle: () => void;
  showOs: boolean;
}) {
  return (
    <li
      className={cn(
        "flex gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5",
        checked && "opacity-70",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={item.title}
        className="mt-1 size-5 shrink-0 rounded-sm border border-border bg-card accent-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {String(index).padStart(2, "0")}
          </span>
          <h2 className={cn("font-medium", checked && "line-through")}>{item.title}</h2>
          {showOs && item.os === "win" ? <Badge variant="outline">Windows</Badge> : null}
          {showOs && item.os === "mac" ? <Badge variant="outline">Mac</Badge> : null}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
      </div>
    </li>
  );
}

export function CarePanel() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-medium tracking-tight">系统养护</h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
          这些必须在电脑上做：开机项、微信缓存、系统临时文件。勾选只记在这台电脑的浏览器里。
        </p>
      </header>
      <CareList os="all" />
    </div>
  );
}
