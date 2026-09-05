import { useCleaner } from "@/store/cleaner";
import { Landing } from "./landing";
import { Report } from "./report";
import { Scanning } from "./scanning";

export function FuchenApp() {
  const view = useCleaner((s) => s.view);
  return (
    <div className="theme-ink min-h-dvh bg-background text-foreground">
      {view === "scanning" ? <Scanning /> : view === "report" ? <Report /> : <Landing />}
    </div>
  );
}
