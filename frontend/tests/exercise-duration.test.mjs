import assert from "node:assert/strict";
import test from "node:test";
import { durationParts, exerciseSeconds, formatExerciseDuration, getDurationSeconds, getPerformancePreview } from "../src/components/exerciseDuration.ts";

test("duration inputs preserve seconds and accept optional empty seconds", () => {
  assert.equal(getDurationSeconds("0", "29", "49"), 1789);
  assert.equal(getDurationSeconds("1", "0", "05"), 3605);
  assert.equal(getDurationSeconds("0", "30", ""), 1800);
  assert.equal(getDurationSeconds("0", "0", "01"), 1);
  assert.equal(getDurationSeconds("8", "0", "00"), 28800);
});

test("invalid duration parts never overflow into a different time", () => {
  for (const parts of [["0","0","0"],["0","60","0"],["0","0","60"],["0","0","1.5"],
                       ["-1","0","0"],["8","0","1"],["1","2","NaN"],["0","-1","10"]]) {
    assert.equal(getDurationSeconds(...parts), null);
  }
});

test("editing restores every time component", () => {
  assert.deepEqual(durationParts(1789), {hours:"0", minutes:"29", seconds:"49"});
  assert.deepEqual(durationParts(3605), {hours:"1", minutes:"0", seconds:"05"});
  assert.deepEqual(durationParts(1800), {hours:"0", minutes:"30", seconds:"00"});
});

test("duration labels retain seconds without adding noise to old records", () => {
  for (const [seconds, label] of [[0,"0min"],[1,"1s"],[59,"59s"],[60,"1min"],[1789,"29min 49s"],
      [1800,"30min"],[3599,"59min 59s"],[3600,"1h"],[3605,"1h 5s"],[3665,"1h 1min 5s"],
      [5400,"1h 30min"],[5437,"1h 30min 37s"]]) {
    assert.equal(formatExerciseDuration(seconds), label);
  }
});

test("legacy minutes fallback does not replace canonical seconds", () => {
  assert.equal(exerciseSeconds(undefined,30),1800);
  assert.equal(exerciseSeconds(1789,30),1789);
  assert.equal(exerciseSeconds(0,30),0);
});

test("performance uses all seconds and keeps chosen labels", () => {
  assert.equal(getPerformancePreview("Corrida",1789,"3,28"),"Ritmo · 9:05 /km");
  assert.equal(getPerformancePreview("Corrida",1800,"3.28"),"Ritmo · 9:09 /km");
  assert.equal(getPerformancePreview("Corrida",1199,"10"),"Ritmo · 2:00 /km");
  assert.equal(getPerformancePreview("Ciclismo",1815,"10"),"Velocidade média · 19,8 km/h");
  assert.equal(getPerformancePreview("Corrida",null,"5"),"");
  assert.equal(getPerformancePreview("Corrida",1800,"0"),"");
});
