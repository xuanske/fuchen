import { createFileRoute } from "@tanstack/react-router";
import { FuchenApp } from "@/components/fuchen/app";

export const Route = createFileRoute("/fuchen")({ component: FuchenPage });

function FuchenPage() {
  return <FuchenApp />;
}
