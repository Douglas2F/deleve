export type HealthMilestone = "exercise" | "sleep" | "weight";
export const HEALTH_MILESTONE_MS = 4400;

export function crossedMilestone(before: number, after: number, goal: number) {
  return [before, after, goal].every(Number.isFinite)
    && before >= 0 && goal > 0 && before < goal && after >= goal;
}

type SavedSleep = { date: string; durationMinutes: number };
export function sleepMilestone(before: SavedSleep | null, saved: SavedSleep, goalMinutes: number) {
  const previousMinutes = before?.date === saved.date ? before.durationMinutes : 0;
  return crossedMilestone(previousMinutes, saved.durationMinutes, goalMinutes);
}

type SavedExerciseDay = { date: string; isToday: boolean; totalSeconds?: number; totalMinutes: number };
export type ExerciseSaveContext = { date: string; previousSeconds: number };

// Only a successful save for today can celebrate, never a load or deletion.
export function exerciseMilestone(day: SavedExerciseDay | undefined, saved?: ExerciseSaveContext) {
  return !!day && !!saved && day.isToday && day.date === saved.date
    && crossedMilestone(saved.previousSeconds, day.totalSeconds ?? Math.round(day.totalMinutes * 60), 1800);
}

// The API stores one decimal place; subtract integer tenths for exact 1 kg boundaries.
export function weightChangeKg(before: number, after: number) {
  return (Math.round(after * 10) - Math.round(before * 10)) / 10;
}

export function formatWeightChange(changeKg: number) {
  const sign = changeKg < 0 ? "−" : changeKg > 0 ? "+" : "";
  return `${sign}${Math.abs(changeKg).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

function weightDirection(goals: string[]) {
  const losing = goals.includes("Perder peso"), gaining = goals.includes("Ganhar peso");
  if (losing === gaining || goals.includes("Manter peso")) return 0;
  return losing ? -1 : 1;
}

// The incentive depends on the change since the last record, not the target.
export function weightMilestone(before: number, after: number, goals: string[]) {
  if (![before, after].every(Number.isFinite) || before <= 0 || after <= 0) return false;
  return weightChangeKg(before, after) * weightDirection(goals) >= 1;
}

// A separate, persistent card state derived from the current weight and goal.
export function isWeightGoalReached(weight: number, goals: string[], target?: number) {
  if (!Number.isFinite(weight) || weight <= 0 || target === undefined || !Number.isFinite(target) || target <= 0) return false;
  const direction = weightDirection(goals);
  return direction === -1 ? weight <= target : direction === 1 ? weight >= target : false;
}

// A newly reached target takes precedence over the per-record medal, even for a smaller final step.
export function weightRewardKind(before: number, after: number, goals: string[], target?: number): "medal" | "trophy" | null {
  if (![before, after].every(Number.isFinite) || before <= 0 || after <= 0) return null;
  if (!isWeightGoalReached(before, goals, target) && isWeightGoalReached(after, goals, target)) return "trophy";
  return weightMilestone(before, after, goals) ? "medal" : null;
}
