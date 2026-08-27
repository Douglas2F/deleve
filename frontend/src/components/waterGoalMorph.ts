export const WATER_GOAL_CELEBRATION_MS = 4400;

const drop = [32,12,28,20,16,30,16,40,16,50,24,56,32,56,40,56,48,50,48,40,48,30,36,20,32,12];
// The brand's two cubic curves split in half, preserving its exact shape.
const brand = [11,29,12,36,15,41.75,19.25,45.375,23.5,49,29,50.5,35,49,40.5,48,44.75,45.25,47.75,41.375,50.75,37.5,52.5,32.5,53,27];

export function waterGoalMorph(progress: number) {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const eased = t * t * (3 - 2 * t);
  const p = drop.map((value, index) => value + (brand[index] - value) * eased);
  return {
    path: `M${p.slice(0,2).join(" ")}C${p.slice(2,8).join(" ")}C${p.slice(8,14).join(" ")}C${p.slice(14,20).join(" ")}C${p.slice(20,26).join(" ")}`,
    strokeWidth: 4 + 3 * eased,
  };
}
