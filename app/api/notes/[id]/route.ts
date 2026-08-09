import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess, Note } from "@/lib/types";

/**
 * GET /api/notes/[id] — fetch a single note by id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id) // RLS double-check
    .single();

  if (error || !data) {
    return NextResponse.json<ApiError>(
      { error: { code: "NOT_FOUND", message: "Note not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json<ApiSuccess<Note>>({ data: data as Note });
}

/**
 * DELETE /api/notes/[id] — delete a single note by id.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<{ id: string }>>({
    data: { id },
  });
}
