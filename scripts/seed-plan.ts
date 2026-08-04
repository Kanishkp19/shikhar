import { createClient } from "@supabase/supabase-js";
import { Section } from "../lib/types";

// Reads environment variables from process.env or .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes("your-project")) {
  console.error(
    "❌ Missing valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment."
  );
  console.log(
    "Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... TARGET_USER_ID=... npx tsx scripts/seed-plan.ts"
  );
  process.exit(1);
}

const targetUserId = process.env.TARGET_USER_ID;
if (!targetUserId) {
  console.error("❌ TARGET_USER_ID is required to associate tasks with your Supabase user.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ── 121-Day CAT 2026 Plan: Aug 1 → Nov 29 (exam day). 28 full mocks. ──
// Source of truth: cat_2026_daily_plan.html (same day numbering & content).

const PLAN_START = "2026-08-01";
const PLAN_DAYS = 121;
const EXAM_DATE = "2026-11-29";

interface DayDef {
  t?: "mock" | "analysis" | "review";
  qa: string;
  dilr: string;
  varc: string;
}

const mk = (n: number): DayDef => ({
  t: "mock",
  qa: `Full Mock #${n} — 120 min, exam conditions`,
  dilr: "",
  varc: "",
});
const an = (n: number): DayDef => ({
  t: "analysis",
  qa: `Mock #${n} QA analysis — every wrong answer with root cause (careless vs conceptual)`,
  dilr: `Mock #${n} DILR analysis — set selection decisions + in-set solving errors`,
  varc: `Mock #${n} VARC analysis — RC accuracy per passage type + VA question audit`,
});
const d = (qa: string, dilr: string, varc: string, t?: DayDef["t"]): DayDef => ({ t, qa, dilr, varc });

// Index 0 = Day 1 = Aug 1, 2026
const DAYS: DayDef[] = [
  // Week 1 — Diagnostic & Arithmetic Core (Aug 1–7)
  d("Diagnostic mock — cold, no prep, full 120 min", "", "", "mock"),
  d("QA diagnostic analysis — weakest topics", "DILR diagnostic — hardest set types", "VARC diagnostic — RC accuracy + reading speed", "analysis"),
  d("Percentages — concepts + 25 problems", "2 table-based DI sets", "1 editorial article + 2 RC passages"),
  d("Ratio & Proportion — concepts + 25 problems", "2 bar/line graph DI sets", "1 article + 2 RC + identify author tone"),
  d("TSD — trains, boats, relative speed (30 problems)", "2 pie chart sets + 1 easy linear arrangement", "1 article + 2 RC + 5 Para Jumbles"),
  d("Time & Work — LCM method + 25 problems", "Linear arrangements — 2 easy-medium sets", "1 article + 2 RC passages (main idea focus)"),
  d("Redo 10 wrong problems this week, timed", "Error review from all DILR sets this week", "Re-read 1 article — author's central argument", "review"),
  // Week 2 — Arithmetic II + Number System (Aug 8–14)
  d("Profit & Loss — markup, discounts (25 problems)", "2 linear arrangement sets (medium)", "1 article + 2 RC + 5 Para Jumbles"),
  d("SI & CI — formulas + 20 problems", "Circular arrangements — 2 sets", "1 article + 2 RC + 5 Para Summaries"),
  d("Averages + Mixtures & Alligation (30 problems)", "2 distribution/scheduling sets", "1 article + 2 RC + 5 Odd Sentence Out"),
  d("Partnerships + 30 mixed arithmetic timed (45 min)", "2 distribution sets", "1 article + 3 RC + all VA types (5 each)"),
  d("Number System — LCM, HCF, Factors + 20 problems", "Scheduling sets — 2 medium", "1 article + 2 RC passages (inference focus)"),
  d("Remainders, divisibility, unit digit, factor counting (30 problems)", "2 games & tournaments sets", "1 article + 2 RC + 5 Para Jumbles"),
  d("50-question arithmetic + numbers test (60 min)", "2 sets, any type — track time per set", "2 RC passages + error review from the week", "review"),
  // Week 3 — Algebra + Geometry I (Aug 15–21)
  d("Linear & Quadratic equations — 25 problems", "2 mixed DILR sets", "1 article + 3 RC passages"),
  d("Inequalities + AP/GP + Functions — 30 problems", "2 complex arrangements", "1 article + 2 RC (author tone focus)"),
  d("VARC sectional mock: 24 Qs in 40 min + full analysis", "2 DILR sets timed (40 min)", "Analyze every VARC sectional answer", "mock"),
  d("Triangles — similarity, congruence, medians (25 problems)", "Network-based sets — 2 medium", "1 article + 2 RC passages"),
  d("Circles — chords, tangents, arcs (20 problems)", "2 network/flow sets", "1 article + 2 RC + 5 Para Jumbles"),
  d("Quadrilaterals + Polygons — 20 problems", "2 complex constraint-based sets", "1 article + 3 RC passages"),
  d("Redo this week's algebra + geometry errors, timed", "2 caselet DI sets", "2 RC passages + all VA types", "review"),
  // Week 4 — Geometry II + Modern Math (Aug 22–28)
  d("Coordinate Geometry — 20 problems", "2 Venn diagram DI sets", "1 article + 3 RC (target 250 WPM)"),
  d("Trigonometry (H&D) + Mensuration 2D/3D (30 problems)", "2 mixed complex sets", "1 article + 2 RC passages"),
  d("Permutation & Combination — 20 problems", "2 complex sets + set selection drill (scan 4, pick 2)", "1 article + 3 RC passages"),
  d("Probability + Set Theory — 20 problems", "2 mixed timed sets", "1 article + 3 RC + all VA"),
  d("50 mixed QA all topics timed (65 min)", "3 mixed complex sets", "1 article + 3 RC passages"),
  d("QA section simulation: 22 Qs in 40 min", "Section simulation: 20 Qs in 40 min", "Section simulation: 24 Qs in 40 min"),
  d("Full August QA revision: 50 Qs (70 min)", "4 sets in 40 min — measure attempt rate", "2 RCs + all VA types", "review"),
  // Week 5 — First Full Mock (Aug 29–31)
  d("Arithmetic speed drill: 50 problems in 50 min", "3 complex sets incl. games & tournaments", "1 article + 3 RC (target 65%+ accuracy)"),
  mk(1),
  an(1),
  // Week 6 — Timed Practice Engine (Sep 1–7)
  d("Fix top 3 QA weak areas from Mock #1 — 30 problems", "3 complex sets", "1 article + 3 RC passages"),
  d("50 mixed QA timed", "3 complex sets", "1 article + 3 RC + 5 Para Summaries"),
  d("50 mixed QA timed", "3 sets + set selection drill", "1 article + 3 RC + all VA types (10 each)"),
  d("50 mixed QA timed", "Set selection drill: 5 sets → pick 3 → 35 min", "1 article + 3 RC (push to 250 WPM)"),
  mk(2),
  an(2),
  d("Top 3 QA error types from error log", "Set-type time vs returns audit", "Weakest RC question type review", "review"),
  // Week 7 — Progressive Intensity (Sep 8–14)
  d("Arithmetic speed drill: 60 problems in 50 min", "3 complex sets", "1 article + 3 RC passages"),
  mk(3),
  an(3),
  d("Targeted QA from Mock #3 weak areas — 30 problems", "3 complex sets", "1 article + 3 RC + 10 Para Jumbles (15 min)"),
  mk(4),
  an(4),
  d("Formula sheet revision + Anki review (20 min)", "DILR set-type performance table", "RC error log — inference & tone patterns", "review"),
  // Week 8 — Consolidation (Sep 15–21)
  d("50 mixed QA timed — target 85%+ accuracy", "3 complex sets", "1 article + 3 RC passages"),
  mk(5),
  an(5),
  d("Geometry + Number System targeted — 30 problems", "3 complex sets — networks + constraints", "1 article + 3 RC passages"),
  d("Algebra + Modern Math targeted — 30 problems", "3 sets — games & scheduling focus", "1 article + 3 RC + Para Summary + Odd Sentence"),
  mk(6),
  an(6),
  // Week 9 — Mock Rhythm + Error Patterns (Sep 22–28)
  d("40 mixed QA — fix mock error patterns", "3 complex sets", "4 RC passages — RC marathon begins"),
  mk(7),
  an(7),
  d("40 QA — write out every step (careless error fix)", "3 complex sets", "1 article + 5 RC passages"),
  mk(8),
  an(8),
  d("List top 5 QA traps you fall for", "List 'death trap' DILR set types to avoid", "List 'death trap' RC question types", "review"),
  // Week 10 — September Close (Sep 29–30)
  mk(9),
  d("Mock #9 analysis + September QA scorecard", "September DILR scorecard: attempts + accuracy", "September VARC scorecard: RC accuracy + TITA rate", "review"),
  // Week 11 — Peak Intensity (Oct 1–7)
  mk(10),
  an(10),
  d("40 QA — error pattern problems only", "3 complex sets", "1 article + 5 RC passages"),
  mk(11),
  an(11),
  mk(12),
  an(12),
  // Week 12 — 99+ Percentile Push (Oct 8–14)
  mk(13),
  an(13),
  d("30 QA — single weakest sub-topic only", "3 complex sets — weakest set type", "1 article + 4 RC passages"),
  mk(14),
  an(14),
  mk(15),
  an(15),
  // Week 13 — Strategy Lock (Oct 15–21)
  mk(16),
  an(16),
  d("Formula sheet revision only (30 min)", "3 sets — your 3 best-performing types", "4 RC passages at full speed"),
  mk(17),
  an(17),
  mk(18),
  an(18),
  // Week 14 — Final Mock Block (Oct 22–28)
  mk(19),
  d("Mock #19 analysis — QA attempt strategy confirmed", "DILR set selection framework finalized", "Review 5 worst RC passages from October", "review"),
  d("Formula revision (30 min) + 10 easy arithmetic", "2 DILR sets — best types (confidence)", "4 RC passages + all VA types"),
  mk(20),
  an(20),
  mk(21),
  an(21),
  // Week 15 — October Wrap (Oct 29–31)
  mk(22),
  an(22),
  d("Light revision only. Rest. Plan November.", "1 easy set — familiar type", "1 article + 2 RCs (relaxed)", "review"),
  // Week 16 — Maintain Peak (Nov 1–7)
  mk(23),
  an(23),
  d("Error-pattern QA — 30 problems from weak spots", "2 DILR sets — best 2 types", "1 article + 3 RC passages"),
  mk(24),
  an(24),
  d("Arithmetic shortcuts revision + 10 strong-topic problems", "2 sets — favourite types", "1 article + 2 RC (relaxed)"),
  d("Very light revision. Zero pressure.", "Rest day — nothing", "1 article — read for enjoyment", "review"),
  // Week 17 — Sharpen (Nov 8–14)
  mk(25),
  an(25),
  d("30 QA — weakest sub-topic, light drilling", "2 sets — best types", "1 article + 3 RC passages"),
  mk(26),
  an(26),
  d("Formula sheet + 10 easy problems (confidence)", "2 sets — best types", "1 article + 2 RC passages"),
  d("Week check: accuracy holding at peak?", "1 light set + set-selection rehearsal", "2 RC passages, relaxed", "review"),
  // Week 18 — Final Mocks (Nov 15–21)
  mk(27),
  an(27),
  d("Light revision: formula sheet (30 min)", "1 easy set — confidence only", "2 RC passages — easy, relaxed"),
  mk(28),
  d("Final mock analysis (30 min) — confirm QA strategy", "Confirm DILR set selection plan (write it down)", "Confirm RC time-per-passage + VA policy", "analysis"),
  d("Formula sheet one final pass (30 min)", "1 easy set — familiar type", "1 article — something you enjoy"),
  d("Light: 10 easy problems, strongest topic", "Strategy card review only", "2 easy RC passages", "review"),
  // Week 19 — Taper & Exam Week (Nov 22–29)
  d("Formula skim (20 min)", "1 easy set — favourite type", "2 easy RC passages, relaxed"),
  d("10 problems — strongest QA topic", "Rest — nothing today", "1 article for enjoyment"),
  d("Strategy card read-through", "1 easy set — confidence", "1 article + 1 easy RC"),
  d("Formula sheet final look (20 min), then put it away", "Rest — nothing today", "1 article — something you enjoy"),
  d("Full rest day", "Full rest day", "1 article for enjoyment", "review"),
  d("Read your own notes one last time (20 min)", "Rest — prepare exam kit", "1 article for enjoyment"),
  d("Read strategy card only. Done.", "Light walk. Zero prep.", "Relax. Read something light.", "review"),
  d("CAT 2026 — EXAM DAY", "", "", "mock"),
];

interface TaskSeed {
  date: string;
  section: Section;
  title: string;
  scheduled_time: string | null;
  duration_minutes: number;
}

function buildTasks(): TaskSeed[] {
  if (DAYS.length !== PLAN_DAYS) {
    throw new Error(`Plan has ${DAYS.length} days, expected ${PLAN_DAYS}`);
  }
  const tasks: TaskSeed[] = [];
  const start = new Date(PLAN_START + "T00:00:00Z");

  DAYS.forEach((day, i) => {
    const dt = new Date(start);
    dt.setUTCDate(start.getUTCDate() + i);
    const date = dt.toISOString().split("T")[0]!;

    if (day.t === "mock" && !day.dilr) {
      // Full mock day (or diagnostic / exam day): single MOCK block
      tasks.push({ date, section: "MOCK", title: day.qa, scheduled_time: "09:00", duration_minutes: 120 });
      if (date !== EXAM_DATE) {
        tasks.push({ date, section: "REVIEW", title: "Mock debrief — note gut reactions, attempt rate, time pressure points", scheduled_time: "14:00", duration_minutes: 60 });
      }
      return;
    }

    const section = (s: Section): Section => (day.t === "analysis" || day.t === "review" ? "REVIEW" : s);
    if (day.qa) tasks.push({ date, section: section("QA"), title: day.qa, scheduled_time: "08:00", duration_minutes: 120 });
    if (day.dilr) tasks.push({ date, section: section("DILR"), title: day.dilr, scheduled_time: "11:00", duration_minutes: 90 });
    if (day.varc) tasks.push({ date, section: section("VARC"), title: day.varc, scheduled_time: "15:30", duration_minutes: 90 });
  });

  return tasks;
}

async function seed() {
  console.log(`🚀 Seeding 121-Day CAT 2026 Plan (${PLAN_START} → ${EXAM_DATE})...`);

  // Clear all existing tasks for target user (ensures clean 121-day dataset)
  const { error: delError } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", targetUserId);
  if (delError) {
    console.error("❌ Error clearing existing plan tasks:", delError.message);
    process.exit(1);
  }

  const taskList = buildTasks();
  console.log(`📋 Generated ${taskList.length} tasks across ${PLAN_DAYS} days (28 full mocks).`);

  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < taskList.length; i += batchSize) {
    const batch = taskList.slice(i, i + batchSize).map((task) => ({
      user_id: targetUserId,
      ...task,
      completed: false,
    }));
    const { error } = await supabase.from("tasks").insert(batch);
    if (error) {
      console.error(`❌ Error inserting batch at index ${i}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  ✓ Inserted ${inserted}/${taskList.length} tasks...`);
  }

  console.log("🎉 121-Day CAT 2026 Plan (Aug 1 → Nov 29) seeded successfully!");
}

seed().catch((err) => {
  console.error("❌ Unexpected error seeding plan:", err);
  process.exit(1);
});
