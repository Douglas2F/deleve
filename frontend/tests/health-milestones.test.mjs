import test from "node:test";
import assert from "node:assert/strict";
import { crossedMilestone, exerciseMilestone, sleepMilestone, weightMilestone, weightChangeKg, formatWeightChange, isWeightGoalReached, weightRewardKind } from "../src/components/healthMilestones.ts";

test("exercise celebrates crossing exactly 30 minutes, including multiple activities and seconds", () => {
  const day = { date: "2026-08-28", isToday: true, totalSeconds: 1800, totalMinutes: 30 };
  for (const previousSeconds of [0, 1200, 1799]) {
    assert.equal(exerciseMilestone(day, { date: day.date, previousSeconds }), true);
  }
  assert.equal(exerciseMilestone({ ...day, totalSeconds: 1799 }, { date: day.date, previousSeconds: 0 }), false);
  assert.equal(exerciseMilestone({ ...day, totalSeconds: 2400 }, { date: day.date, previousSeconds: 1800 }), false);
  assert.equal(exerciseMilestone({ ...day, totalSeconds: undefined }, { date: day.date, previousSeconds: 1200 }), true);
});

test("exercise ignores loads, deletes, unchanged totals and saves from other days", () => {
  const day = { date: "2026-08-28", isToday: true, totalSeconds: 1800, totalMinutes: 30 };
  assert.equal(exerciseMilestone(day), false);
  assert.equal(exerciseMilestone(undefined, { date: day.date, previousSeconds: 0 }), false);
  assert.equal(exerciseMilestone(day, { date: "2026-08-27", previousSeconds: 0 }), false);
  assert.equal(exerciseMilestone({ ...day, isToday: false }, { date: day.date, previousSeconds: 0 }), false);
  for (const previousSeconds of [1800, 2400]) assert.equal(exerciseMilestone(day, { date: day.date, previousSeconds }), false);
});

test("sleep uses the configured goal, not a hardcoded duration", () => {
  assert.equal(crossedMilestone(0, 450, 450), true);
  assert.equal(crossedMilestone(449, 450, 450), true);
  assert.equal(crossedMilestone(0, 449, 450), false);
  assert.equal(crossedMilestone(450, 480, 450), false);
  assert.equal(crossedMilestone(480, 450, 450), false);
  for (const goal of [0, -1, NaN, Infinity]) assert.equal(crossedMilestone(0, 480, goal), false);
  for (const bad of [-1, NaN, Infinity]) assert.equal(crossedMilestone(bad, 480, 450), false);
});

test("weight follows losing or gaining goals, not the sign of the overall change", () => {
  assert.equal(weightMilestone(78, 77, ["Perder peso"]), true);
  assert.equal(weightMilestone(78, 80, ["Ganhar peso"]), true);
  assert.equal(weightMilestone(78, 80, ["Perder peso"]), false);
  assert.equal(weightMilestone(78, 77, ["Ganhar peso"]), false);
  assert.equal(weightMilestone(78, 78, ["Perder peso"]), false);
  assert.equal(weightMilestone(78, 76, ["Perder peso"]), true);
});

test("weight celebrates at least 1 kg since the last saved value, not accumulated progress", () => {
  for (const delta of [0.1, 0.5, 0.9]) {
    assert.equal(weightMilestone(78, 78-delta, ["Perder peso"]), false);
    assert.equal(weightMilestone(78, 78+delta, ["Ganhar peso"]), false);
  }
  for (const delta of [1, 1.5, 2, 2.5]) {
    assert.equal(weightMilestone(78, 78-delta, ["Perder peso"]), true);
    assert.equal(weightMilestone(78, 78+delta, ["Ganhar peso"]), true);
  }
  // Multiple smaller saves do not add up into a celebration.
  for (const [before, after] of [[78,77.5],[77.5,77],[77,76.5]]) {
    assert.equal(weightMilestone(before, after, ["Perder peso"]), false);
  }
  assert.equal(weightMilestone(78.1, 77.1, ["Perder peso"]), true);
  assert.equal(weightMilestone(78.1, 79.1, ["Ganhar peso"]), true);
});

test("weight celebration labels retain the actual signed difference, including decimals", () => {
  for (const [before, after, expected] of [[78,76,"−2 kg"],[76,75,"−1 kg"],[75,72.5,"−2,5 kg"],[72.5,75.5,"+3 kg"],[78.1,77.1,"−1 kg"]]) {
    assert.equal(formatWeightChange(weightChangeKg(before, after)), expected);
  }
});

test("sleep saved milestones use the same day's previous value and the configured goal", () => {
  const saved = { date: "2026-08-28", durationMinutes: 510 };
  assert.equal(sleepMilestone(null, saved, 480), true);
  assert.equal(sleepMilestone({ ...saved, durationMinutes: 479 }, saved, 480), true);
  assert.equal(sleepMilestone({ ...saved, durationMinutes: 480 }, saved, 480), false);
  assert.equal(sleepMilestone(saved, saved, 480), false);
  assert.equal(sleepMilestone(saved, { ...saved, durationMinutes: 450 }, 480), false);
  assert.equal(sleepMilestone({ ...saved, date: "2026-08-27" }, saved, 480), true);
  assert.equal(sleepMilestone(null, saved, 540), false);
  assert.equal(sleepMilestone(null, saved, 0), false);
});

test("weight goal prize handles exact targets and crossing them in both directions", () => {
  assert.equal(isWeightGoalReached(70.1, ["Perder peso"], 70), false);
  assert.equal(isWeightGoalReached(70, ["Perder peso"], 70), true);
  assert.equal(isWeightGoalReached(69, ["Perder peso"], 70), true);
  assert.equal(isWeightGoalReached(84.9, ["Ganhar peso"], 85), false);
  assert.equal(isWeightGoalReached(85, ["Ganhar peso"], 85), true);
  assert.equal(isWeightGoalReached(86, ["Ganhar peso"], 85), true);
  assert.equal(isWeightGoalReached(79, ["Perder peso"], 80), true);
});

test("weight record incentive and goal prize are independent", () => {
  // A two-kg record celebrates before, at, or past the target.
  assert.equal(weightMilestone(80, 78, ["Perder peso"]), true);
  assert.equal(isWeightGoalReached(78, ["Perder peso"], 75), false);
  assert.equal(isWeightGoalReached(78, ["Perder peso"], 78), true);
  assert.equal(isWeightGoalReached(78, ["Perder peso"], 79), true);
  // A smaller final step still unlocks the card prize, but not the 1-kg animation.
  assert.equal(weightMilestone(70.5, 70, ["Perder peso"]), false);
  assert.equal(isWeightGoalReached(70, ["Perder peso"], 70), true);
  assert.equal(weightMilestone(70, 70, ["Perder peso"]), false);
  // The prize is recalculated for a new target or a changed current weight.
  assert.equal(isWeightGoalReached(70, ["Perder peso"], 68), false);
  assert.equal(isWeightGoalReached(71, ["Perder peso"], 70), false);
});

test("weight requires an unambiguous goal and valid data", () => {
  for (const goals of [[], ["Manter peso"], ["Bem-estar geral"], ["Perder peso", "Ganhar peso"], ["Perder peso", "Manter peso"]]) {
    assert.equal(weightMilestone(78, 77, goals), false);
    assert.equal(isWeightGoalReached(77, goals, 78), false);
  }
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.equal(weightMilestone(bad, 77, ["Perder peso"]), false);
    assert.equal(weightMilestone(78, bad, ["Perder peso"]), false);
    assert.equal(isWeightGoalReached(77, ["Perder peso"], bad), false);
    assert.equal(isWeightGoalReached(bad, ["Perder peso"], 78), false);
  }
  assert.equal(isWeightGoalReached(77, ["Perder peso"]), false);
});

test("approved medal celebrates record progress and trophy takes precedence at the target", () => {
  assert.equal(weightRewardKind(78, 76, ["Perder peso"], 70), "medal");
  assert.equal(weightRewardKind(78, 79, ["Ganhar peso"], 85), "medal");
  assert.equal(weightRewardKind(72, 70, ["Perder peso"], 70), "trophy");
  assert.equal(weightRewardKind(84, 86, ["Ganhar peso"], 85), "trophy");
  assert.equal(weightRewardKind(70.5, 70, ["Perder peso"], 70), "trophy");
  assert.equal(weightRewardKind(84.5, 85, ["Ganhar peso"], 85), "trophy");
  assert.equal(weightRewardKind(78, 76, ["Perder peso"]), "medal");
});

test("trophy does not repeat while the target is already reached or on an unchanged record", () => {
  assert.equal(weightRewardKind(70, 70, ["Perder peso"], 70), null);
  assert.equal(weightRewardKind(70, 69.5, ["Perder peso"], 70), null);
  assert.equal(weightRewardKind(70, 68, ["Perder peso"], 70), "medal");
  assert.equal(weightRewardKind(69, 71, ["Perder peso"], 70), null);
  assert.equal(weightRewardKind(85, 84, ["Ganhar peso"], 85), null);
  assert.equal(weightRewardKind(78, 77.5, ["Perder peso"], 70), null);
  assert.equal(weightRewardKind(78, 77, ["Manter peso"], 77), null);
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.equal(weightRewardKind(bad, 70, ["Perder peso"], 70), null);
    assert.equal(weightRewardKind(78, bad, ["Perder peso"], 70), null);
  }
});
