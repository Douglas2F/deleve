import test from "node:test";
import assert from "node:assert/strict";
import { countComparisonText, weightComparisonText } from "../src/components/weeklyComparison.ts";

test("comparison copy distinguishes equality, more and fewer recorded goal days", () => {
  const value = { available: true, current: 2, previous: 1, difference: 1 };
  assert.equal(countComparisonText(value, "water"), "1 dia com meta atingida a mais");
  assert.equal(countComparisonText({ ...value, difference: -2 }, "sleep"), "2 noites com meta atingida a menos");
  assert.equal(countComparisonText(value, "exercise"), "1 dia ativo a mais");
  assert.equal(countComparisonText({ ...value, difference: 0 }, "water"), "Igual à semana anterior");
});
test("missing data never becomes a decline", () => {
  for (const value of [undefined, { available: false, difference: -1 }, { available: true, difference: null }]) {
    assert.equal(countComparisonText(value, "exercise"), "Ainda sem comparação");
    assert.equal(weightComparisonText(value), "Ainda sem comparação");
  }
});
test("weight comparison preserves sign and decimal precision", () => {
  assert.equal(weightComparisonText({ available: true, difference: -0.6 }), "−0,6 kg em relação à semana anterior");
  assert.equal(weightComparisonText({ available: true, difference: 2 }), "+2 kg em relação à semana anterior");
  assert.equal(weightComparisonText({ available: true, difference: 0 }), "Sem variação entre as pesagens");
});
