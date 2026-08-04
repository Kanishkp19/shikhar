import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { NotesClient } from "@/components/notes/notes-client";

/**
 * Notes list page — server-side bootstrap.
 * Loads initial page of notes (cursor pagination at 20 items per TRD).
 */
export default async function NotesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <Suspense fallback={<div className="h-64 bg-black/[0.06] rounded-[12px] animate-pulse" />}>
      <NotesClient initialNotes={(data ?? []) as never} initialError={error?.message} />
    </Suspense>
  );
}
