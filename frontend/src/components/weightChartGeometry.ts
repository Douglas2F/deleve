export type WeightPoint = { id: number; recordedOn: string; weightKg: number };
export function chartGeometry(points: WeightPoint[], start: string, end: string, target: number | null) {
  const day = (value: string) => Date.parse(`${value}T00:00:00Z`);
  const values = points.map(point => point.weightKg);
  if (target !== null && Number.isFinite(target)) values.push(target);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const padding = Math.max((high - low) * .15, .5);
  const min = Math.floor((low - padding) * 10) / 10;
  const max = Math.ceil((high + padding) * 10) / 10;
  const y = (value: number) => 20 + (max - value) / (max - min) * 140;
  const span = day(end) - day(start);
  const positioned = points.map(point => ({ ...point, x: span > 0 ? 46 + (day(point.recordedOn) - day(start)) / span * 276 : 184, y: y(point.weightKg) }));
  return { min, max, points: positioned, targetY: target !== null ? y(target) : null,
    path: positioned.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ") };
}
