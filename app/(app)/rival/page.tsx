import { Metadata } from "next";
import { RivalClient } from "@/components/rival/rival-client";

export const metadata: Metadata = {
  title: "Ghost Rival | Shikhar CAT 2026",
  description: "Head-to-head simulated topper prep battle mode.",
};

export default function RivalPage() {
  return <RivalClient />;
}
