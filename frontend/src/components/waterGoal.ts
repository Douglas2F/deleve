export function isWaterGoalReached(total: number, goal: number): boolean {
  return Number.isFinite(total) && Number.isFinite(goal) && goal > 0 && total >= goal;
}

export function crossedWaterGoal(previous: number, next: number, goal: number): boolean {
  return [previous, next, goal].every(Number.isFinite)
    && goal > 0 && previous >= 0 && previous < goal && next >= goal;
}
