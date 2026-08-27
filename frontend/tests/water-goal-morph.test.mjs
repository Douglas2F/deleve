import test from "node:test";
import assert from "node:assert/strict";
import { waterGoalMorph, WATER_GOAL_CELEBRATION_MS } from "../src/components/waterGoalMorph.ts";

test("morph starts with the droplet and finishes with the exact brand curve", () => {
  assert.equal(waterGoalMorph(0).path, "M32 12C28 20 16 30 16 40C16 50 24 56 32 56C40 56 48 50 48 40C48 30 36 20 32 12");
  assert.equal(waterGoalMorph(1).path, "M11 29C12 36 15 41.75 19.25 45.375C23.5 49 29 50.5 35 49C40.5 48 44.75 45.25 47.75 41.375C50.75 37.5 52.5 32.5 53 27");
  assert.equal(waterGoalMorph(1).strokeWidth, 7);
  assert.equal(WATER_GOAL_CELEBRATION_MS, 4400);
});

test("intermediate frames preserve topology and finite coordinates", () => {
  for (let step = 0; step <= 100; step++) {
    const frame = waterGoalMorph(step / 100);
    assert.equal((frame.path.match(/C/g) ?? []).length, 4);
    assert.equal(frame.path.includes("NaN"), false);
    assert.ok(frame.strokeWidth >= 4 && frame.strokeWidth <= 7);
  }
  assert.deepEqual(waterGoalMorph(-1), waterGoalMorph(0));
  assert.deepEqual(waterGoalMorph(2), waterGoalMorph(1));
  assert.deepEqual(waterGoalMorph(NaN), waterGoalMorph(0));
});
