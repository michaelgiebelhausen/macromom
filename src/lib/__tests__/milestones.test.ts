import { currentMilestone, proteinStreak, weeklySummaryLine } from '../milestones';

const day = (date: string, protein: number, logged = true) => ({
  date,
  totalProtein: protein,
  totalCalories: protein * 20,
  logged,
});

describe('proteinStreak', () => {
  it('counts consecutive protein-hit days from most recent', () => {
    const days = [day('2026-06-29', 150), day('2026-06-30', 145), day('2026-07-01', 152)];
    expect(proteinStreak(days, 150)).toBe(3); // 90% threshold = 135
  });

  it('breaks the streak on a missed day', () => {
    const days = [day('2026-06-29', 150), day('2026-06-30', 60), day('2026-07-01', 152)];
    expect(proteinStreak(days, 150)).toBe(1);
  });

  it('is zero with no logs', () => {
    expect(proteinStreak([], 150)).toBe(0);
  });
});

describe('currentMilestone', () => {
  it('celebrates a 3-day streak (TASK-050 verify)', () => {
    const days = [day('2026-06-29', 150), day('2026-06-30', 145), day('2026-07-01', 152)];
    expect(currentMilestone(days, 150)?.message).toMatch(/Three days/);
  });

  it('never returns a guilt message on misses', () => {
    const days = [day('2026-06-30', 20), day('2026-07-01', 10)];
    const m = currentMilestone(days, 150);
    expect(m).toBeNull(); // silence, not shame
  });
});

describe('weeklySummaryLine', () => {
  it('encourages when empty', () => {
    expect(weeklySummaryLine([], 150)).toMatch(/first meal/i);
  });

  it('never shames low-protein weeks', () => {
    const line = weeklySummaryLine([day('2026-07-01', 30)], 150);
    expect(line).not.toMatch(/only|missed|fail|behind/i);
  });
});
