"use client";

import type { HandwrittenNoteContent, HandwrittenNotePage } from "@/lib/types";
import { HandwrittenDiagram } from "./handwritten-diagrams";
import { Printer } from "lucide-react";

interface NoteCanvasProps {
  note: HandwrittenNoteContent;
}

function NotePage({ page, pageIndex, total, noteTitle }: { page: HandwrittenNotePage; pageIndex: number; total: number; noteTitle: string }) {
  const currentDateStr = page.dateStr || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "2-digit" });
  const subjectTag = page.subjectTag || "CAT / Quant";

  return (
    <div
      className="note-sheet shadow-2xl transition-all select-text my-4"
      style={{
        position: "relative",
        background: "#fdfbf7",
        borderRadius: "2px",
        fontFamily: "var(--font-caveat), cursive",
        padding: "36px 40px 36px 72px",
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        color: "#1e293b",
        border: "1px solid #e2e8f0",
        backgroundImage: `
          linear-gradient(90deg, transparent 63px, rgba(239, 68, 68, 0.4) 63px, rgba(239, 68, 68, 0.4) 65px, transparent 65px),
          repeating-linear-gradient(
            transparent,
            transparent 27px,
            #e2e8f0 27px,
            #e2e8f0 28px
          )
        `,
        backgroundSize: "100% 100%, 100% 28px",
      }}
    >
      {/* Hole punch simulation */}
      {[80, 220, 360, 500, 640, 780].map((top) => (
        <div
          key={top}
          style={{
            position: "absolute",
            left: "18px",
            top: `${top}px`,
            width: "15px",
            height: "15px",
            borderRadius: "50%",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      ))}

      {/* ── TOP HEADER STAMP ── */}
      <div className="flex items-start justify-between mb-4 pb-2 text-sm font-sans" style={{ borderBottom: "1.5px stroke #cbd5e1" }}>
        <div className="leading-tight">
          <span className="font-semibold text-xs tracking-wider text-slate-700 block uppercase">{subjectTag}</span>
          <span className="font-bold text-xs text-indigo-700 flex items-center gap-1 mt-0.5">
            ☆ Topic Notes
          </span>
        </div>

        {/* Page No & Date Stamp */}
        <div className="border border-purple-300 rounded px-3 py-1 bg-purple-50/50 text-right text-xs font-sans">
          <div><span className="text-slate-500">Page No. :</span> <span className="font-bold text-purple-900">{page.pageNo || pageIndex + 1}</span></div>
          <div><span className="text-slate-500">Date :</span> <span className="font-bold text-purple-900">{currentDateStr}</span></div>
        </div>
      </div>

      {/* ── MAIN TITLE BANNER ── */}
      <div className="text-center my-3">
        <h1
          className="text-4xl font-extrabold tracking-wide uppercase inline-block relative px-4"
          style={{
            color: "#0f172a",
            letterSpacing: "0.05em",
          }}
        >
          <span className="mr-2 text-purple-600">⚡</span>
          {noteTitle}
          <span className="ml-2 text-purple-600">⚡</span>
        </h1>
        {/* Felt-pen underline */}
        <div className="h-1.5 w-48 bg-indigo-600 rounded-full mx-auto mt-1" />
        {page.basicsSummary && (
          <p className="text-xl text-slate-700 mt-2 max-w-2xl mx-auto leading-tight">
            {page.basicsSummary}
          </p>
        )}
      </div>

      {/* ── SECTION 1 & SIDE CALLOUTS (GRID SPLIT) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-5 items-start">
        {/* Left Column: Basics (7 cols) */}
        <div className="md:col-span-7 space-y-3">
          <div className="inline-block px-3 py-0.5 bg-yellow-200 text-slate-900 font-extrabold text-xl rounded shadow-xs border border-yellow-300">
            1. BASICS
          </div>

          <ul className="space-y-1.5 text-xl text-slate-800">
            {page.basics && page.basics.length > 0 ? (
              page.basics.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-indigo-600 font-bold shrink-0">★</span>
                  <div>
                    <span className="font-bold text-slate-900">{b.heading}: </span>
                    <span>{b.body}</span>
                  </div>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-1.5 leading-snug">
                <span className="text-indigo-600 font-bold shrink-0">★</span>
                <span>Core foundational definitions and rules for solving CAT questions.</span>
              </li>
            )}
          </ul>

          {/* Diagram centered under basics ONLY if basicsDiagramType is set and not 'none' */}
          {page.basicsDiagramType && page.basicsDiagramType !== "none" && (
            <div className="pt-2 flex justify-center">
              <HandwrittenDiagram type={page.basicsDiagramType} width={170} height={115} />
            </div>
          )}
        </div>

        {/* Right Column: Notation & Types (5 cols) */}
        <div className="md:col-span-5 space-y-3">
          {/* Notation Box (Dashed Purple) */}
          {page.notationBox && page.notationBox.length > 0 && (
            <div className="border-2 border-dashed border-indigo-300 bg-indigo-50/40 rounded-lg p-3 text-lg">
              <div className="font-bold text-indigo-900 text-base underline mb-1 uppercase tracking-wide">
                Notation & Terms
              </div>
              <ul className="space-y-0.5 text-slate-800">
                {page.notationBox.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Types Box (Solid Green) */}
          {page.typesBox && page.typesBox.length > 0 && (
            <div className="border border-emerald-400 bg-emerald-50/30 rounded-lg p-3 text-lg">
              <div className="font-bold text-emerald-900 text-base underline mb-1 uppercase tracking-wide">
                Types / Classifications
              </div>
              <ul className="space-y-1 text-slate-800">
                {page.typesBox.map((t, i) => (
                  <li key={i} className="leading-tight">
                    <span className="font-bold text-emerald-950">• {t.name}: </span>
                    <span>{t.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: IMPORTANT THEOREMS ── */}
      {page.theorems && page.theorems.length > 0 && (
        <div className="my-6 space-y-4">
          <div className="inline-block px-3 py-0.5 bg-emerald-200 text-slate-900 font-extrabold text-xl rounded shadow-xs border border-emerald-300">
            2. IMPORTANT THEOREMS & LAWS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {page.theorems.map((thm, i) => (
              <div
                key={i}
                className="border border-slate-300 rounded-lg p-3 bg-white/70 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-sans text-xs flex items-center justify-center font-bold">
                      {thm.num || i + 1}
                    </span>
                    <h4 className="font-bold text-xl text-slate-900 underline decoration-purple-300">
                      {thm.title}
                    </h4>
                  </div>
                  <p className="text-xl text-slate-800 leading-snug pl-7">
                    {thm.body}
                  </p>
                  {thm.formula && (
                    <div className="mt-2 ml-7 p-2 border-2 border-dashed border-purple-300 bg-purple-50/50 rounded-lg font-bold text-xl text-purple-950 inline-block">
                      {thm.formula}
                    </div>
                  )}
                </div>

                {/* Inline SVG Diagram if applicable */}
                {thm.diagramType && thm.diagramType !== "none" && (
                  <div className="flex justify-end mt-2">
                    <HandwrittenDiagram type={thm.diagramType} width={150} height={100} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3, 4, 5: FORMULAS, RESULTS, SHORTCUTS (3-COLUMN GRID) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 items-stretch">
        {/* 3. Formulas */}
        <div className="border border-amber-300 bg-amber-50/30 rounded-lg p-3 flex flex-col">
          <div className="inline-block px-2.5 py-0.5 bg-amber-200 text-slate-900 font-extrabold text-lg rounded mb-2 border border-amber-300 self-start">
            3. FORMULAS
          </div>
          <div className="space-y-2 flex-1">
            {page.formulas.map((f, i) => (
              <div key={i} className="border-2 border-dashed border-amber-400 bg-white/80 rounded-lg p-2.5">
                <div className="font-bold text-amber-900 text-base leading-tight">• {f.label}:</div>
                <div className="font-extrabold text-2xl text-amber-950 mt-1 leading-snug">
                  {f.formula}
                </div>
                {f.subtext && (
                  <div className="text-base text-slate-600 mt-1 italic">{f.subtext}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Important Results */}
        <div className="border border-sky-300 bg-sky-50/30 rounded-lg p-3 flex flex-col">
          <div className="inline-block px-2.5 py-0.5 bg-sky-200 text-slate-900 font-extrabold text-lg rounded mb-2 border border-sky-300 self-start">
            4. IMPORTANT RESULTS
          </div>
          <ul className="space-y-1.5 text-xl text-slate-800 flex-1">
            {(page.results && page.results.length > 0 ? page.results : ["Core properties and key results to memorize."]).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-snug">
                <span className="text-sky-600 font-bold shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 5. Shortcuts / Tricks */}
        <div className="border border-indigo-300 bg-indigo-50/30 rounded-lg p-3 flex flex-col">
          <div className="inline-block px-2.5 py-0.5 bg-indigo-200 text-slate-900 font-extrabold text-lg rounded mb-2 border border-indigo-300 self-start">
            5. SHORTCUTS / TRICKS
          </div>
          <ul className="space-y-2 text-xl text-slate-800 flex-1">
            {page.shortcuts.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-snug">
                <span className="text-indigo-600 font-bold shrink-0">⚡</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── SECTION 6 & 7 & STICKY QUOTE ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-6 items-stretch">
        {/* 6. Common Traps (5 cols) */}
        <div className="md:col-span-5 border border-rose-300 bg-rose-50/30 rounded-lg p-3">
          <div className="inline-block px-2.5 py-0.5 bg-rose-200 text-slate-900 font-extrabold text-lg rounded mb-2 border border-rose-300">
            6. COMMON TRAPS
          </div>
          <ul className="space-y-1.5 text-xl text-rose-950">
            {page.traps.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-snug">
                <span className="text-rose-600 font-bold shrink-0">✘</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 7. Quick Revision (4 cols) */}
        <div className="md:col-span-4 border border-violet-300 bg-violet-50/30 rounded-lg p-3">
          <div className="inline-block px-2.5 py-0.5 bg-violet-200 text-slate-900 font-extrabold text-lg rounded mb-2 border border-violet-300">
            7. QUICK REVISION
          </div>
          <ul className="space-y-1 text-xl text-slate-800">
            {page.revision.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-snug">
                <span className="text-violet-600 font-bold shrink-0">★</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Motivational Quote Side Box (3 cols) */}
        <div className="md:col-span-3 border-2 border-dashed border-pink-300 bg-pink-50/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
          <span className="text-2xl mb-1">😊</span>
          <p className="font-bold text-xl text-pink-950 leading-tight">
            {page.motivationalQuote || "Consistent Practice Beats Talent!"}
          </p>
        </div>
      </div>

      {/* ── FOOTER BANNER ── */}
      <div className="mt-6 pt-2 border-t-2 border-dashed border-slate-300 text-center">
        <div className="inline-block bg-yellow-200 text-slate-900 font-extrabold text-xl px-4 py-1 rounded-full border border-yellow-400 shadow-2xs">
          ☆ {page.footerBanner || "Practice + Concept Clarity + Smart Approach = 99+ Percentile in CAT! 🔥"}
        </div>
      </div>
    </div>
  );
}

export function NoteCanvas({ note }: NoteCanvasProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex justify-end">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-sans font-medium transition-colors shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save PDF
        </button>
      </div>

      {/* Pages */}
      {note.pages.map((page, i) => (
        <NotePage key={i} page={page} pageIndex={i} total={note.pages.length} noteTitle={note.title} />
      ))}
    </div>
  );
}
