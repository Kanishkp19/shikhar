import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MindMapsClient } from "@/components/mindmaps/mindmaps-client";
import type { MindMap, DiagramType } from "@/lib/types";

/**
 * Mind Maps & Diagrams page — server bootstrap.
 */
export default async function MindMapsPage() {
  const supabase = await createClient();
  const { data: mindmaps } = await supabase
    .from("mindmaps")
    .select("*")
    .order("created_at", { ascending: false });

  const formatted: MindMap[] = (mindmaps ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    topic: m.topic,
    section: m.section,
    diagramType: m.diagram_type as DiagramType,
    mermaidCode: m.mermaid_code,
    createdAt: m.created_at,
  }));

  return (
    <Suspense fallback={<div className="h-64 bg-black/[0.06] rounded-xl animate-pulse" />}>
      <MindMapsClient initialMindMaps={formatted} />
    </Suspense>
  );
}
