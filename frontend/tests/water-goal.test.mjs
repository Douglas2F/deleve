import test from "node:test";
import assert from "node:assert/strict";
import { crossedWaterGoal, isWaterGoalReached } from "../src/components/waterGoal.ts";

test("persistent completion uses the exact goal, not a rounded percentage", () => {
  assert.equal(isWaterGoalReached(3499, 3500), false);
  assert.equal(isWaterGoalReached(3500, 3500), true);
  assert.equal(isWaterGoalReached(3750, 3500), true);
  assert.equal(isWaterGoalReached(3250, 3500), false);
  assert.equal(isWaterGoalReached(3500, 4000), false);
  assert.equal(isWaterGoalReached(0, 3500), false);
});

test("persistent completion rejects missing or invalid goals and totals", () => {
  for (const [total, goal] of [[0, 0], [2000, -1], [NaN, 2000], [Infinity, 2000], [2000, NaN], [2000, Infinity]]) {
    assert.equal(isWaterGoalReached(total, goal), false);
  }
});

test("celebrates the exact goal or a glass that crosses it", () => {
  assert.equal(crossedWaterGoal(1750, 2000, 2000), true);
  assert.equal(crossedWaterGoal(1750, 2000, 1900), true);
});

test("does not celebrate below the goal, extra glasses, unchanged totals or removals", () => {
  for (const [before, after] of [[1500, 1750], [2000, 2250], [2000, 2000], [2250, 2000], [2000, 1750]]) {
    assert.equal(crossedWaterGoal(before, after, 2000), false);
  }
});

test("ignores invalid values", () => {
  for (const values of [[NaN, 2000, 2000], [1750, Infinity, 2000], [0, 250, 0], [-250, 2000, 2000]]) {
    assert.equal(crossedWaterGoal(...values), false);
  }
});
