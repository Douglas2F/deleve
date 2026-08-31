import test from "node:test";
import assert from "node:assert/strict";
import { buildWeeklyHighlight } from "../src/components/weeklyHighlight.ts";

function report(overrides = {}) {
  return { isCurrentWeek: true, recordedAreas: 0,
    water: { recordedDays: 0, goalDays: 0, goalMl: 2000 },
    sleep: { recordedDays: 0, goalDays: 0, goalMinutes: 480 },
    exercise: { completedDays: 0, targetDays: 3 }, weight: { recordedDays: 0 }, ...overrides };
}

test("completed exercise plan takes priority over days merely recorded", () => {
  const value = report({ recordedAreas: 2, exercise: { completedDays: 3, targetDays: 3 }, water: { recordedDays: 7, goalDays: 0, goalMl: 2000 } });
  assert.equal(buildWeeklyHighlight(value).detail, "Você cumpriu os 3 dias de exercício planejados.");
  assert.match(buildWeeklyHighlight({ ...value, exercise: { completedDays: 5, targetDays: 3 } }).detail, /cumpriu os 3 dias.*5 dias/);
  assert.equal(buildWeeklyHighlight({ ...value, exercise: { completedDays: 1, targetDays: 1 } }).detail, "Você cumpriu o dia de exercício planejado.");
});

test("daily goals outrank recordings and the most goal days are highlighted", () => {
  const value = report({ recordedAreas: 3, water: { recordedDays: 5, goalDays: 5, goalMl: 2000 }, sleep: { recordedDays: 7, goalDays: 4, goalMinutes: 480 }, exercise: { completedDays: 2, targetDays: 3 } });
  assert.equal(buildWeeklyHighlight(value).detail, "Sua meta de água foi alcançada em 5 dias nesta semana.");
  assert.equal(buildWeeklyHighlight({ ...value, water: { ...value.water, goalDays: 1 } }).detail, "Sua meta de sono foi alcançada em 4 noites nesta semana.");
});

test("equal daily achievements mention both areas and handle singular", () => {
  const value = report({ recordedAreas: 2, water: { recordedDays: 1, goalDays: 1, goalMl: 2000 }, sleep: { recordedDays: 1, goalDays: 1, goalMinutes: 480 } });
  assert.equal(buildWeeklyHighlight(value).detail, "Você alcançou sua meta de água em 1 dia e sua meta de sono em 1 noite.");
  assert.match(buildWeeklyHighlight({ ...value, water: { ...value.water, goalDays: 0 } }).detail, /1 noite nesta semana/);
  assert.match(buildWeeklyHighlight({ ...value, sleep: { ...value.sleep, goalDays: 0 } }).detail, /1 dia nesta semana/);
});

test("without achieved or configured goals the highlight values real recordings", () => {
  const value = report({ recordedAreas: 2, water: { recordedDays: 5, goalDays: 5, goalMl: 0 }, exercise: { completedDays: 2, targetDays: 0 } });
  assert.equal(buildWeeklyHighlight(value).detail, "Você registrou água em 5 dias desta semana.");
  assert.match(buildWeeklyHighlight(report({ recordedAreas: 1, exercise: { completedDays: 2, targetDays: 3 } })).detail, /registrou atividades em 2 dias/);
  assert.match(buildWeeklyHighlight(report({ recordedAreas: 1, sleep: { recordedDays: 3, goalDays: 0, goalMinutes: 480 } })).detail, /3 noites de sono/);
  assert.match(buildWeeklyHighlight(report({ recordedAreas: 1, weight: { recordedDays: 2 } })).detail, /2 pesagens/);
});

test("ties in recordings retain the multi-area highlight", () => {
  const value = report({ recordedAreas: 2, water: { recordedDays: 2, goalDays: 0, goalMl: 2000 }, sleep: { recordedDays: 2, goalDays: 0, goalMinutes: 480 } });
  assert.match(buildWeeklyHighlight(value).detail, /2 áreas acompanhadas/);
});

test("current and past empty weeks are distinct and have no invented achievement", () => {
  assert.equal(buildWeeklyHighlight(report()).title, "Começar com um pequeno registro.");
  assert.equal(buildWeeklyHighlight(report({ isCurrentWeek: false })).title, "Uma semana sem registros.");
  const previous = report({ isCurrentWeek: false, recordedAreas: 1, water: { recordedDays: 4, goalDays: 4, goalMl: 2000 } });
  assert.match(buildWeeklyHighlight(previous).detail, /meta de água.*4 dias/);
});

test("building a highlight never changes report data", () => {
  const value = report({ recordedAreas: 1, exercise: { completedDays: 3, targetDays: 3 } });
  const before = structuredClone(value);
  buildWeeklyHighlight(value);
  assert.deepEqual(value, before);
});
