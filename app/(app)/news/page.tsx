import { createClient } from "@/lib/supabase/server";
import { NewsClient } from "@/components/news/news-client";

/**
 * News page — server-side bootstrap.
 * Loads the latest digest entries (per TRD: 20 items, cursor-paginated).
 */
export default async function NewsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .order("published_week_of", { ascending: false })
    .limit(20);

  return <NewsClient initialItems={(data ?? []) as never} initialError={error?.message} />;
}
