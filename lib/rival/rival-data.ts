export interface RivalPersona {
  id: string;
  name: string;
  avatar: string;
  title: string;
  targetPercentile: string;
  targetHoursDaily: number;
  targetQuestionsDaily: number;
  bio: string;
  strengths: string[];
  motto: string;
}

export const RIVAL_PERSONAS: RivalPersona[] = [
  {
    id: "aaditya",
    name: "Aaditya S.",
    avatar: "⚡",
    title: "The 99.9%ile Quant Machine",
    targetPercentile: "99.9%ile",
    targetHoursDaily: 5.5,
    targetQuestionsDaily: 45,
    bio: "Consistent 99.9%iler in QA and DILR sectionals. Starts early at 6 AM and never misses a daily set.",
    strengths: ["QA Speed Tricks", "DILR Matrix Puzzles", "Strict Daily Pacing"],
    motto: "Accuracy is non-negotiable. 5 minutes wasted is 10 ranks dropped.",
  },
  {
    id: "ananya",
    name: "Ananya R.",
    avatar: "🧠",
    title: "VARC & Logic Specialist",
    targetPercentile: "99.5%ile",
    targetHoursDaily: 4.5,
    targetQuestionsDaily: 35,
    bio: "Passionate reader who finishes 3 RC passages before breakfast and masters algebra shortcuts.",
    strengths: ["Aeon Essay Analysis", "Algebra Shortcuts", "High Verbal Speed"],
    motto: "Consistency beats intensity every single day.",
  },
  {
    id: "rohan",
    name: "Rohan V.",
    avatar: "🎯",
    title: "The Steady Comeback Runner",
    targetPercentile: "98.5%ile",
    targetHoursDaily: 3.5,
    targetQuestionsDaily: 25,
    bio: "Working professional prepping smart with focused 3-hour power slots and high recall accuracy.",
    strengths: ["Time Management", "High Concept Recall", "Mock Error Logs"],
    motto: "Small daily wins compound into 99 percentile on D-Day.",
  },
];

export interface RivalChallenge {
  id: string;
  title: string;
  description: string;
  category: "QA" | "DILR" | "VARC" | "TIMED";
  xp: number;
  rivalProgress: string;
}

export const DAILY_CHALLENGES: RivalChallenge[] = [
  {
    id: "dilr-set-duel",
    title: "DILR Matrix Duel",
    description: "Solve 2 DILR Arrangement/Grid sets today",
    category: "DILR",
    xp: 150,
    rivalProgress: "Aaditya finished set #2 at 2:15 PM",
  },
  {
    id: "qa-speed-drill",
    title: "Quant Speed Sprint",
    description: "Complete 15 Geometry & Algebra Flashcards",
    category: "QA",
    xp: 120,
    rivalProgress: "Rival completed 15 cards in 12 mins",
  },
  {
    id: "varc-rc-marathon",
    title: "RC Passage Mastery",
    description: "Read 1 Aeon Essay & take 1 RC quiz",
    category: "VARC",
    xp: 100,
    rivalProgress: "Ananya finished RC quiz with 85% accuracy",
  },
  {
    id: "power-focus-session",
    title: "90-Min Deep Study Slot",
    description: "Complete 90 minutes of total study time today",
    category: "TIMED",
    xp: 200,
    rivalProgress: "Rival hit 110 mins total study time today",
  },
];

/**
 * Calculates dynamic rival progress based on the current hour of the day
 * so the competition feels live and responsive.
 */
export function getSimulatedRivalState(rivalId: string) {
  const rival: RivalPersona = RIVAL_PERSONAS.find((r) => r.id === rivalId) || RIVAL_PERSONAS[0]!;
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Study hours curve (starts at 6 AM, maxes out at 10 PM)
  let activeRatio = 0;
  if (currentHour < 6) {
    activeRatio = 0.05;
  } else if (currentHour > 22) {
    activeRatio = 1.0;
  } else {
    activeRatio = Math.min(1, (currentHour - 6) / 16);
  }

  // Add realistic micro variation based on rival profile
  const multiplier = rival.id === "aaditya" ? 1.1 : rival.id === "ananya" ? 1.0 : 0.85;
  const hoursDone = Math.min(rival.targetHoursDaily, +(rival.targetHoursDaily * activeRatio * multiplier).toFixed(1));
  const questionsDone = Math.min(rival.targetQuestionsDaily, Math.floor(rival.targetQuestionsDaily * activeRatio * multiplier));

  // Dynamic status messages
  let statusMessage = "";
  if (currentHour < 8) {
    statusMessage = `${rival.name} just completed morning QA warmup (${questionsDone} q's done).`;
  } else if (currentHour < 14) {
    statusMessage = `${rival.name} completed a DILR set and is leading by ${hoursDone} hours today!`;
  } else if (currentHour < 20) {
    statusMessage = `${rival.name} is on a roll: ${hoursDone} hrs logged & ${questionsDone} questions solved!`;
  } else {
    statusMessage = `${rival.name} finished the day with ${hoursDone} hrs & ${questionsDone} questions. Can you beat them?`;
  }

  return {
    rival,
    hoursDone,
    questionsDone,
    statusMessage,
  };
}
