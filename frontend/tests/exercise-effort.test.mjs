import assert from "node:assert/strict";
import test from "node:test";
import { displayedEffort, effortSummary, effortTitle, getEffortHint, getEffortOptions } from "../src/components/exerciseEffort.ts";

test("musculação has only distinct habitual and intense choices", () => {
  assert.deepEqual(getEffortOptions("Musculação", "").map(o => o.label), ["Habitual", "Intenso"]);
  assert.deepEqual(getEffortOptions("Musculação", "").map(o => o.value), ["moderate", "intense"]);
});

test("football uses activity-specific wording even with distance", () => {
  assert.deepEqual(getEffortOptions("Futebol", "5").map(o => o.label), ["Recreativo", "Competitivo"]);
  assert.equal(effortTitle("Futebol"), "Como foi o jogo?");
});

test("running and other activities never show effort selector", () => {
  for (const type of ["Corrida", "Outros"]) {
    for (const distance of ["", "5"]) assert.deepEqual(getEffortOptions(type, distance), []);
  }
});

test("dance keeps three levels", () => {
  assert.deepEqual(getEffortOptions("Dança", "").map(o => o.label), ["Leve", "Moderado", "Intenso"]);
});

test("cycling selector disappears with distance and returns when cleared", () => {
  assert.equal(getEffortOptions("Ciclismo", "").length, 3);
  assert.equal(getEffortOptions("Ciclismo", "5").length, 0);
  assert.equal(getEffortOptions("Ciclismo", "0.1").length, 0);
  assert.equal(getEffortOptions("Ciclismo", "").length, 3);
});

test("legacy light maps visually to same-reference choice without mutating record", () => {
  const entry = { type: "Musculação", effort: "light", calories: 200 };
  assert.equal(displayedEffort(entry.type, entry.effort), "moderate");
  assert.equal(effortSummary(entry.type, entry.effort), "Treino: habitual");
  assert.equal(entry.effort, "light");
  assert.equal(entry.calories, 200);
  assert.equal(displayedEffort("Futebol", "light"), "moderate");
  assert.equal(effortSummary("Futebol", "light"), "Jogo: recreativo");
});

test("new selections and empty defaults retain their meanings", () => {
  assert.equal(displayedEffort("Musculação", null), null);
  assert.equal(displayedEffort("Musculação", "intense"), "intense");
  assert.equal(displayedEffort("Dança", "light"), "light");
  assert.equal(effortSummary("Futebol", "intense"), "Jogo: competitivo");
  assert.equal(effortSummary("Corrida", "light"), "Esforço: leve");
  assert.match(getEffortHint("Musculação", "light"), /habitual/);
  assert.match(getEffortHint("Futebol", "intense"), /competitiva/);
});
