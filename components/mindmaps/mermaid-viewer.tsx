"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Code, Eye, RefreshCw, AlertTriangle } from "lucide-react";

interface MermaidViewerProps {
  chart: string;
  topic: string;
}

/**
 * Multi-Level Deep Mermaid Graph & MindMap Sanitizer
 * Converts raw LLM mindmaps / indented outlines into rich, multi-tiered 3D concept trees!
 */
export function sanitizeMermaidCode(raw: string, topic: string): string {
  const cleanTopic = (topic || "CAT Topic").replace(/[\[\]\(\)"']/g, "");

  if (!raw || raw.trim().length === 0) {
    return createFallbackDiagram(cleanTopic);
  }

  // 1. Remove markdown fences & conversational preambles
  const code = raw
    .replace(/^```[a-z]*\n?/gim, "")
    .replace(/```$/gim, "")
    .replace(/^here is (a|the) (mermaid|mindmap|diagram|chart)[^\n]*\n?/gim, "")
    .trim();

  // 2. If already a structured graph TD / flowchart / sequenceDiagram, return with cleaned headers
  if (code.startsWith("graph") || code.startsWith("flowchart") || code.startsWith("sequenceDiagram") || code.startsWith("pie")) {
    return code;
  }

  // 3. Multi-tier indented line parser (turns mindmap / bullet lists into deep 3-level tree)
  const rawLines = code.split("\n").filter((l) => l.trim().length > 0 && !l.trim().startsWith("mindmap"));
  
  const lineData = rawLines
    .map((line) => ({
      indent: line.search(/\S/),
      text: line.replace(/^[-*+\d.\s()]+/, "").replace(/["']/g, "").trim(),
    }))
    .filter((d) => d.text.length > 0 && !d.text.startsWith("root("));

  if (lineData.length === 0) {
    return createFallbackDiagram(cleanTopic);
  }

  const minIndent = Math.min(...lineData.map((d) => d.indent));
  const out: string[] = ["graph TD", `    Root["${cleanTopic}"]`];
  let currentCategory = "Root";
  let catIndex = 0;
  let nodeIndex = 0;

  for (const item of lineData) {
    if (item.indent <= minIndent + 1) {
      catIndex++;
      currentCategory = `Cat${catIndex}`;
      out.push(`    Root --> ${currentCategory}["${item.text}"]`);
    } else {
      nodeIndex++;
      out.push(`    ${currentCategory} --> N${nodeIndex}["${item.text}"]`);
    }
  }

  return out.join("\n");
}

/**
 * Deep multi-level fallback diagram for CAT topics
 */
function createFallbackDiagram(topic: string): string {
  const cleanTopic = (topic || "CAT Concept").replace(/[\[\]\(\)"']/g, "");
  return `graph TD
    Root["${cleanTopic}"]
    
    Root --> C1["1. Core Principles & Definitions"]
    C1 --> N1["Fundamental Axioms & Frame of Reference"]
    C1 --> N2["Variable Dependencies & Constraints"]
    C1 --> N3["Standard Units & Conversions"]

    Root --> C2["2. Essential Formulas & Derivations"]
    C2 --> N4["Primary Governing Equations"]
    C2 --> N5["Special Case Equations"]
    C2 --> N6["Ratio & Proportion Shortcuts"]

    Root --> C3["3. CAT Traps & Speed Shortcuts"]
    C3 --> N7["Common Distractor Options"]
    C3 --> N8["Time-saving Elimination Tricks"]`;
}

/**
 * MermaidViewer — Safe React rendering of Mermaid diagrams without DOM manipulation conflicts.
 */
export function MermaidViewer({ chart, topic }: MermaidViewerProps) {
  const [viewMode, setViewMode] = React.useState<"visual" | "code">("visual");
  const [svgHtml, setSvgHtml] = React.useState<string>("");
  const [isRendering, setIsRendering] = React.useState(true);
  const [renderError, setRenderError] = React.useState<string | null>(null);

  const cleanedCode = React.useMemo(
    () => sanitizeMermaidCode(chart, topic),
    [chart, topic]
  );

  React.useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      if (viewMode !== "visual") return;

      try {
        setIsRendering(true);
        setRenderError(null);

        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

        let renderedSvg: string;
        try {
          const { svg } = await mermaid.render(id, cleanedCode);
          renderedSvg = svg;
        } catch (firstErr) {
          console.warn("[MermaidViewer] Primary render failed, rendering fallback graph...", firstErr);
          const fallbackCode = createFallbackDiagram(topic);
          const fallbackId = `mermaid-fb-${Math.random().toString(36).slice(2, 9)}`;
          const { svg } = await mermaid.render(fallbackId, fallbackCode);
          renderedSvg = svg;
        }

        if (isMounted) {
          setSvgHtml(renderedSvg);
          setIsRendering(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[MermaidViewer] Render failed completely:", err);
          setRenderError(err instanceof Error ? err.message : String(err));
          setIsRendering(false);
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [cleanedCode, topic, viewMode]);

  return (
    <div className="border border-hairline rounded-xl overflow-hidden bg-surface shadow-xs">
      <div className="flex items-center justify-between px-4 py-2.5 bg-canvas-soft border-b border-hairline">
        <h4 className="text-body-sm font-semibold text-ink truncate">{topic}</h4>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "visual" ? "primary" : "utility"}
            size="sm"
            onClick={() => setViewMode("visual")}
            className="h-7 text-xs px-2.5"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> Visual
          </Button>
          <Button
            variant={viewMode === "code" ? "primary" : "utility"}
            size="sm"
            onClick={() => setViewMode("code")}
            className="h-7 text-xs px-2.5"
          >
            <Code className="h-3.5 w-3.5 mr-1" /> Code
          </Button>
        </div>
      </div>

      <div className="p-4 overflow-x-auto min-h-[260px] flex items-center justify-center">
        {viewMode === "code" ? (
          <pre className="w-full text-xs font-mono bg-black/5 p-4 rounded-lg overflow-x-auto text-ink">
            {cleanedCode}
          </pre>
        ) : renderError ? (
          <div className="text-center p-4 space-y-2">
            <div className="inline-flex items-center gap-1 text-accent-orange-deep text-caption font-semibold">
              <AlertTriangle className="h-4 w-4" /> Code syntax view
            </div>
            <pre className="text-xs font-mono bg-black/5 p-4 rounded-lg text-left overflow-x-auto max-w-xl text-ink">
              {cleanedCode}
            </pre>
          </div>
        ) : isRendering ? (
          <div className="flex items-center gap-2 text-caption text-ink-faint py-8">
            <RefreshCw className="h-4 w-4 animate-spin" /> Rendering visual diagram...
          </div>
        ) : (
          <div
            className="w-full flex justify-center items-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}
      </div>
    </div>
  );
}
