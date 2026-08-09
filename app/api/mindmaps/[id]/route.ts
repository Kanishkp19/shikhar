import { NextResponse } from "next/server";
import { createClient, getAllowlistedUser } from "@/lib/supabase/server";
import type { ApiError, ApiSuccess } from "@/lib/types";

/**
 * DELETE /api/mindmaps/[id] — delete a mindmap/diagram by id.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAllowlistedUser();

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("mindmaps")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json<ApiError>(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  return NextResponse.json<ApiSuccess<{ id: string }>>({ data: { id } });
}
