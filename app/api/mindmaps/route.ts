import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, MindMap } from "@/lib/types";

/**
 * GET /api/mindmaps — fetch all user mindmaps and diagrams.
 */
export async function GET() {
  const user = await getAllowlistedUser();

  const supabase = await createClient();
  const { data: mindmaps, error } = await supabase
    .from("mindmaps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[MindMaps GET] Notice: ${error.message}`);
    return NextResponse.json<ApiSuccess<MindMap[]>>({ data: [] });
  }

  return NextResponse.json<ApiSuccess<MindMap[]>>({
    data: (mindmaps ?? []).map((m) => ({
      id: m.id,
      userId: m.user_id,
      topic: m.topic,
      section: m.section,
      diagramType: m.diagram_type as never,
      mermaidCode: m.mermaid_code,
      createdAt: m.created_at,
    })),
  });
}
