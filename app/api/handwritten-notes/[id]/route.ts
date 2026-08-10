import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, HandwrittenNote } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/handwritten-notes/[id] — fetch a single note */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("handwritten_notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>(
      { error: { code: "NOT_FOUND", message: "Note not found" } },
      { status: 404 },
    );
  }

  const note: HandwrittenNote = {
    id: data.id,
    userId: data.user_id,
    topic: data.topic,
    section: data.section,
    contentJson: data.content_json,
    createdAt: data.created_at,
  };

  return NextResponse.json<ApiSuccess<HandwrittenNote>>({ data: note });
}

/** DELETE /api/handwritten-notes/[id] — delete a note */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("handwritten_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
