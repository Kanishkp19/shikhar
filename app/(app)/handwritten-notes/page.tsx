import { Suspense } from "react";
import { HandwrittenNotesClient } from "@/components/handwritten-notes/handwritten-notes-client";

export const metadata = {
  title: "Handwritten Notes — Shikhar",
  description: "AI-generated handwritten-style CAT revision notes",
};

export default function HandwrittenNotesPage() {
  return (
    <Suspense fallback={null}>
      <HandwrittenNotesClient />
    </Suspense>
  );
}
