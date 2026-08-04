/**
 * Shikhar — News Scraper
 * Fetches CAT/IIM news from multiple reliable sources with proper parsing.
 * Sources: RSS feeds, official pages, news sites with CAT coverage.
 */

export interface RawHeadline {
  headline: string;
  url: string;
  sourceName: string;
}

interface SourceConfig {
  name: string;
  url: string;
  type: "rss" | "html" | "json";
  selectors?: {
    item: string;
    title: string;
    link: string;
    date?: string;
  };
  filterKeywords?: string[];
  transform?: (item: RawHeadline) => RawHeadline | null;
}

// ──────────────────────────────────────────────────────────────
// CAT/IIM News Sources — curated for relevance
// ──────────────────────────────────────────────────────────────

const SOURCES: SourceConfig[] = [
  // Official CAT site
  {
    name: "CAT Official (IIM)",
    url: "https://iimcat.ac.in/",
    type: "html",
    selectors: {
      item: "a[href*='notice'], a[href*='news'], a[href*='announcement'], a[href*='update']",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "IIM", "admission", "exam", "result", "cutoff", "shortlist", "schedule", "registration", "percentile"],
  },

  // IIM Admission portals (major IIMs)
  {
    name: "IIM Ahmedabad Admissions",
    url: "https://www.iima.ac.in/admissions",
    type: "html",
    selectors: {
      item: ".news-item a, .announcement a, .notice a, article a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "PGP", "admission", "cutoff", "shortlist", "criteria", "selection", "process"],
  },
  {
    name: "IIM Bangalore Admissions",
    url: "https://www.iimb.ac.in/admissions",
    type: "html",
    selectors: {
      item: ".views-row a, .news-item a, article a, .field-content a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "PGP", "admission", "cutoff", "shortlist", "selection", "criteria"],
  },
  {
    name: "IIM Calcutta Admissions",
    url: "https://www.iimcal.ac.in/admissions",
    type: "html",
    selectors: {
      item: ".news-list a, .announcement a, article a, .views-row a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "MBA", "admission", "cutoff", "shortlist", "selection", "criteria", "percentile"],
  },
  {
    name: "IIM Lucknow Admissions",
    url: "https://www.iiml.ac.in/admissions",
    type: "html",
    selectors: {
      item: ".news a, .notice a, article a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "PGP", "admission", "cutoff", "shortlist", "selection"],
  },
  {
    name: "IIM Kozhikode Admissions",
    url: "https://www.iimk.ac.in/admissions",
    type: "html",
    selectors: {
      item: ".news-item a, .announcement a, article a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "PGP", "admission", "cutoff", "shortlist"],
  },
  {
    name: "IIM Indore Admissions",
    url: "https://www.iimidr.ac.in/admissions",
    type: "html",
    selectors: {
      item: ".news a, .notice a, article a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "PGP", "admission", "cutoff", "shortlist", "selection"],
  },

  // CAT preparation news sites (high-quality curation)
  {
    name: "Career360 CAT News",
    url: "https://www.career360.com/articles/cat",
    type: "html",
    selectors: {
      item: ".article-listing a, .content-list a, .search-result a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "IIM", "cutoff", "percentile", "admission", "result", "analysis", "answer key", "registration"],
  },
  {
    name: "Shiksha CAT News",
    url: "https://www.shiksha.com/mba/exams/cat",
    type: "html",
    selectors: {
      item: ".article-card a, .news-card a, .content-list a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "IIM", "cutoff", "percentile", "admission", "result", "registration", "exam pattern"],
  },
  {
    name: "PaGaLGuY CAT Forum",
    url: "https://www.pagalguy.com/exams/cat",
    type: "html",
    selectors: {
      item: ".discussion-title a, .thread-title a, .topic-title a",
      title: "",
      link: "href",
    },
    filterKeywords: ["CAT", "IIM", "cutoff", "shortlist", "admission", "percentile", "result"],
  },

  // RSS feeds (most reliable)
  {
    name: "Times of India Education",
    url: "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms",
    type: "rss",
    filterKeywords: ["CAT", "IIM", "MBA admission", "common admission test", "percentile"],
  },
  {
    name: "The Hindu Education",
    url: "https://www.thehindu.com/news/education/feeder/default.rss",
    type: "rss",
    filterKeywords: ["CAT", "IIM", "MBA", "common admission test", "management admission"],
  },
  {
    name: "Indian Express Education",
    url: "https://indianexpress.com/section/education/feed/",
    type: "rss",
    filterKeywords: ["CAT", "IIM", "MBA", "common admission test", "management entrance"],
  },
];

// ──────────────────────────────────────────────────────────────
// Core Scraping Functions
// ──────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Shikhar/1.0 (CAT prep news digest; +https://shikhar.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .trim();
}

function isRelevant(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function makeAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    return href.startsWith("http") ? href : new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

// ──────────────────────────────────────────────────────────────
// RSS Parsing
// ──────────────────────────────────────────────────────────────

async function scrapeRSS(source: SourceConfig): Promise<RawHeadline[]> {
  try {
    const res = await fetchWithTimeout(source.url);
    if (!res.ok) return [];

    const xml = await res.text();
    const items: RawHeadline[] = [];

    // Parse RSS/Atom feeds
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;

    const patterns = [itemRegex, entryRegex];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(xml)) !== null) {
        const itemXml = match[1] ?? "";

        const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? itemXml.match(/<link[^>]*href="([^"]+)"/i);
        const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ?? itemXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);

        const title = cleanText(titleMatch?.[1] ?? "");
        const link = cleanText(linkMatch?.[1] ?? "");
        const desc = cleanText(descMatch?.[1] ?? "");

        const headline = title || desc;
        if (headline.length < 10 || headline.length > 200) continue;
        if (!link) continue;

        if (!isRelevant(headline, source.filterKeywords ?? ["CAT", "IIM"])) continue;

        items.push({ headline, url: link, sourceName: source.name });
      }
    }

    return items.slice(0, 15); // Cap per source
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────
// HTML Parsing (using simple regex since no DOM in serverless)
// ──────────────────────────────────────────────────────────────

async function scrapeHTML(source: SourceConfig): Promise<RawHeadline[]> {
  try {
    const res = await fetchWithTimeout(source.url);
    if (!res.ok) return [];

    const html = await res.text();
    const items: RawHeadline[] = [];

    const { item, link } = source.selectors ?? {};

    if (!item || !link) return [];

    // Find all matching anchor elements
    // Strategy: look for <a> tags with href containing relevant paths
    const anchorRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = anchorRegex.exec(html)) !== null) {
      const href = match[1] ?? "";
      const innerHTML = match[2] ?? "";

      // Skip if not a relevant link pattern
      const hrefLower = href.toLowerCase();
      const relevantPatterns = [
        "notice", "news", "announcement", "update", "admission",
        "cutoff", "shortlist", "result", "schedule", "registration",
        "percentile", "selection", "criteria", "pgp", "mba",
      ];
      const isRelevantLink = relevantPatterns.some((p) => hrefLower.includes(p));

      // Also check inner text for relevance
      const textContent = cleanText(innerHTML.replace(/<[^>]+>/g, ""));
      if (textContent.length < 8 || textContent.length > 180) continue;

      if (!isRelevantLink && !isRelevant(textContent, source.filterKeywords ?? ["CAT", "IIM"])) continue;

      const url = makeAbsoluteUrl(href, source.url);
      items.push({ headline: textContent, url, sourceName: source.name });
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = items.filter((i) => {
      if (seen.has(i.url)) return false;
      seen.add(i.url);
      return true;
    });

    return unique.slice(0, 15); // Cap per source
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────
// Main Export
// ──────────────────────────────────────────────────────────────

export async function fetchAllHeadlines(): Promise<RawHeadline[]> {
  const allResults = await Promise.allSettled(
    SOURCES.map(async (source) => {
      if (source.type === "rss") return scrapeRSS(source);
      return scrapeHTML(source);
    }),
  );

  const allHeadlines: RawHeadline[] = [];
  let successCount = 0;

  for (const result of allResults) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allHeadlines.push(...result.value);
      successCount++;
    }
  }

  console.log(`[News Scraper] ${successCount}/${SOURCES.length} sources succeeded, ${allHeadlines.length} total headlines`);

  // Global deduplication by URL
  const seen = new Set<string>();
  const unique = allHeadlines.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });

  // Sort by relevance (headlines with more keywords first)
  const scored = unique.map((h) => {
    const text = h.headline.toLowerCase();
    const highValueKeywords = ["cutoff", "shortlist", "result", "admission", "percentile", "registration", "schedule", "answer key", "analysis"];
    const score = highValueKeywords.reduce((s, kw) => s + (text.includes(kw) ? 3 : 0), 0);
    return { ...h, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top 60 for LLM processing
  return scored.slice(0, 60).map(({ score: _score, ...rest }) => rest);
}

export async function fetchAndFormatHeadlines(): Promise<string> {
  const headlines = await fetchAllHeadlines();
  return headlines.map((h) => `${h.headline} | ${h.url} | ${h.sourceName}`).join("\n");
}