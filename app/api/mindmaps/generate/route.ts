import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser, AuthError } from "@/lib/supabase/server";
import { generateMindMap, generateMindMapFromNotes } from "@/lib/llm/omniroute";
import { z } from "zod";
import type { ApiError, ApiSuccess, MindMap, DiagramType } from "@/lib/types";

const schema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters"),
  section: z.enum(["QA", "DILR", "VARC"]),
  diagramType: z.enum(["mindmap", "graph", "sequence", "pie"]).default("mindmap"),
});

/**
 * POST /api/mindmaps/generate — generate a new visual diagram via OmniRoute
 */
export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await getAllowlistedUser();
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json<ApiError>(
          { error: { code: e.code, message: e.message } },
          { status: e.code === "FORBIDDEN" ? 403 : 401 },
        );
      }
      throw e;
    }

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiError>(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" } },
        { status: 400 },
      );
    }

    const { topic, section, diagramType } = parsed.data;
    const supabase = await createClient();

    // Prefer generating from the user's latest AI notes on this topic so the
    // mindmap reflects the same content; fall back to from-scratch generation.
    const { data: latestNote } = await supabase
      .from("notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("topic", topic)
      .eq("section", section)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 1. Generate Mermaid diagram code via OmniRoute
    const result = latestNote?.content
      ? await generateMindMapFromNotes(topic, section, latestNote.content, diagramType as DiagramType)
      : await generateMindMap(topic, section, diagramType as DiagramType);
    if (!result.ok) {
      return NextResponse.json<ApiError>(
        { error: { code: result.code, message: result.message } },
        { status: 500 },
      );
    }

    const mermaidCode = result.data;

    // 2. Save diagram to database (with fallback if DB table not yet created)
    const { data: mindmap, error: dbErr } = await supabase
      .from("mindmaps")
      .insert({
        user_id: user.id,
        topic,
        section,
        diagram_type: diagramType,
        mermaid_code: mermaidCode,
      })
      .select()
      .single();

    if (dbErr || !mindmap) {
      console.warn(`[MindMaps] DB save notice (${dbErr?.message ?? "no data"}). Returning generated mindmap fallback...`);
      return NextResponse.json<ApiSuccess<MindMap>>({
        data: {
          id: `temp-${Date.now()}`,
          userId: user.id,
          topic,
          section,
          diagramType: diagramType as DiagramType,
          mermaidCode,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json<ApiSuccess<MindMap>>({
      data: {
        id: mindmap.id,
        userId: mindmap.user_id,
        topic: mindmap.topic,
        section: mindmap.section,
        diagramType: mindmap.diagram_type as DiagramType,
        mermaidCode: mindmap.mermaid_code,
        createdAt: mindmap.created_at,
      },
    });
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: { code: "SERVER_ERROR", message: err instanceof Error ? err.message : String(err) } },
      { status: 500 },
    );
  }
}
