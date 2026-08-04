import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { NoteViewerClient } from "@/components/notes/note-viewer-client";

/**
 * Single note viewer — server-side bootstrap.
 */
export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: note, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !note) {
    notFound();
  }

  return <NoteViewerClient note={note as never} />;
}
