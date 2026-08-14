"use client";

import * as React from "react";
import { Shapes, Maximize2, Minimize2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SvgDiagramViewerProps {
  svgCode: string;
  title?: string;
  className?: string;
}

/**
 * Sanitizes and normalizes raw SVG code:
 * - Ensures valid viewBox if missing or width/height attributes
 * - Sets width="100%" and height="auto" for fully responsive vector scaling
 * - Strips potential harmful script elements while keeping vector paths, texts, and styles
 */
export function sanitizeSvgCode(rawSvg: string): string {
  if (!rawSvg) return "";

  let cleaned = rawSvg
    .replace(/^```(?:svg|xml|html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Strip script tags or onload attributes for safety
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // If the snippet starts inside an svg without <svg tag (e.g. just paths/polygons), wrap it
  if (!cleaned.startsWith("<svg")) {
    cleaned = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 260" width="100%" height="auto">${cleaned}</svg>`;
  }

  // Ensure responsive attributes
  cleaned = cleaned.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    let newAttrs = attrs;

    // If viewBox is missing but width/height exist, construct viewBox
    if (!/viewBox\s*=/i.test(newAttrs)) {
      const widthMatch = /width\s*=\s*["']?(\d+)/i.exec(newAttrs);
      const heightMatch = /height\s*=\s*["']?(\d+)/i.exec(newAttrs);
      const w = widthMatch ? widthMatch[1] : "420";
      const h = heightMatch ? heightMatch[1] : "260";
      newAttrs += ` viewBox="0 0 ${w} ${h}"`;
    }

    // Ensure preserveAspectRatio
    if (!/preserveAspectRatio\s*=/i.test(newAttrs)) {
      newAttrs += ` preserveAspectRatio="xMidYMid meet"`;
    }

    // Force width="100%" and remove hardcoded pixel widths/heights from root svg tag
    newAttrs = newAttrs.replace(/\bwidth\s*=\s*["'][^"']*["']/gi, 'width="100%"');
    newAttrs = newAttrs.replace(/\bheight\s*=\s*["'][^"']*["']/gi, 'height="auto"');

    return `<svg ${newAttrs} style="max-height: 480px; width: 100%; display: block; margin: 0 auto;">`;
  });

  return cleaned;
}

export function SvgDiagramViewer({ svgCode, title = "Geometric Figure", className }: SvgDiagramViewerProps) {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const sanitized = React.useMemo(() => sanitizeSvgCode(svgCode), [svgCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      // ignore clipboard error
    }
  };

  if (!sanitized) return null;

  return (
    <div
      className={cn(
        "my-6 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-xs transition-all",
        expanded ? "fixed inset-4 z-[110] max-h-[95vh] overflow-y-auto flex flex-col justify-between shadow-2xl bg-surface/98 backdrop-blur-md" : "",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-hairline bg-canvas-soft/80 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-ink">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Shapes className="h-3.5 w-3.5" />
          </div>
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy SVG Code"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-black/5 hover:text-ink transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Close Full View" : "Expand Figure"}
            className="flex items-center gap-1 rounded-md p-1 text-ink-muted hover:bg-black/5 hover:text-ink transition-colors cursor-pointer"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        className={cn(
          "relative flex items-center justify-center p-4 sm:p-6 transition-all select-none",
          expanded ? "flex-1 min-h-[400px] bg-canvas-soft/40" : "bg-[#faf9f6]/60"
        )}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.04) 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
        }}
      >
        <div
          className="w-full max-w-[560px] flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>

      {/* Footer caption hint */}
      <div className="border-t border-hairline/60 bg-canvas-soft/40 px-4 py-1.5 text-[11px] text-ink-faint flex items-center justify-between">
        <span>Properly marked vertices, measurements, and angle relations</span>
        <span className="font-mono text-[10px] uppercase font-bold text-primary/70">Vector Graphic</span>
      </div>
    </div>
  );
}
