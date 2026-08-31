import test from "node:test";
import assert from "node:assert/strict";
import { chartGeometry } from "../src/components/weightChartGeometry.ts";

test("positions use elapsed days, not equally spaced entries", () => {
  const result = chartGeometry([{id:1, recordedOn:"2026-08-01",weightKg:80},{id:2,recordedOn:"2026-08-02",weightKg:79},{id:3,recordedOn:"2026-08-31",weightKg:78}],"2026-08-01","2026-08-31",70);
  assert.equal(result.points[0].x,46);
  assert.equal(result.points[2].x,322);
  assert.ok(result.points[1].x < 60);
  assert.ok(result.targetY > result.points[2].y);
  assert.equal(result.points.length,3);
  assert.equal(result.path.match(/L/g).length,2);
});
test("single, empty and unchanged weights have finite coordinates", () => {
  for (const values of [[], [{id:1,recordedOn:"2026-08-31",weightKg:78}], [{id:1,recordedOn:"2026-08-30",weightKg:78},{id:2,recordedOn:"2026-08-31",weightKg:78}]]) {
    const result = chartGeometry(values,"2026-08-31","2026-08-31",null);
    assert.ok(result.max > result.min);
    assert.ok(result.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
    assert.equal(result.targetY,null);
  }
});
test("target above the readings is included without changing records", () => {
  const points = [{id:1,recordedOn:"2026-08-31",weightKg:60}];
  const before = structuredClone(points);
  const result = chartGeometry(points,"2026-08-01","2026-08-31",65);
  assert.ok(result.targetY < result.points[0].y);
  assert.ok(result.min < 60 && result.max > 65);
  assert.deepEqual(points,before);
});
