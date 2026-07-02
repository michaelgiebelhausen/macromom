// Streak / encouragement milestones (TASK-050, FR-014).
// Warm celebration on positive streaks; NEVER guilt on misses (design.md Don'ts).

export interface DaySummary {
  /** YYYY-MM-DD */
  date: string;
  totalProtein: number;
  totalCalories: number;
  logged: boolean;
}

export interface Milestone {
  message: string;
}

/**
 * Detect the current protein streak: consecutive most-recent logged days
 * (ending today or yesterday) where protein reached ≥90% of target.
 */
export function proteinStreak(days: DaySummary[], targetProtein: number): number {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  let streak = 0;
  for (const day of sorted) {
    if (!day.logged) break;
    if (day.totalProtein >= targetProtein * 0.9) streak++;
    else break;
  }
  return streak;
}

const STREAK_MESSAGES: [number, string][] = [
  [7, 'A full week of hitting your protein — you’re unstoppable. So, so proud.'],
  [5, 'Five days strong on protein — this is a real habit now. Amazing.'],
  [3, 'Three days hitting your protein goal — so proud of you. Keep it going!'],
];

/** The single most celebratory applicable milestone, or null (never guilt). */
export function currentMilestone(days: DaySummary[], targetProtein: number): Milestone | null {
  const streak = proteinStreak(days, targetProtein);
  for (const [threshold, message] of STREAK_MESSAGES) {
    if (streak >= threshold) return { message };
  }
  const loggedCount = days.filter((d) => d.logged).length;
  if (loggedCount >= 1 && streak >= 1) {
    return { message: 'Protein on point today — that’s how it’s done.' };
  }
  return null;
}

/** Encouraging weekly summary line (leads the Progress screen, FR-010). */
export function weeklySummaryLine(days: DaySummary[], targetProtein: number): string {
  const logged = days.filter((d) => d.logged);
  if (logged.length === 0) {
    return 'Log your first meal and I’ll start cheering — you’ve got this!';
  }
  const proteinHits = logged.filter((d) => d.totalProtein >= targetProtein * 0.9).length;
  if (proteinHits >= 5)
    return `You hit your protein ${proteinHits} days this week — incredible work!`;
  if (proteinHits >= 3)
    return `${proteinHits} protein wins this week — you’re building something real.`;
  if (proteinHits >= 1)
    return `${proteinHits} solid ${proteinHits === 1 ? 'day' : 'days'} this week — every one counts.`;
  return `You showed up and logged ${logged.length} ${logged.length === 1 ? 'day' : 'days'} — that’s the hardest part.`;
}
