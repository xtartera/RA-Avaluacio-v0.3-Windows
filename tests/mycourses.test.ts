import assert from "node:assert/strict";
import {test} from "node:test";
import {isForeignCourse} from "../app/lib/myCourses.ts";

test("sense mòduls propis definits no s'avisa mai", () => {
  assert.equal(isForeignCourse([], "SOX"), false);
});
test("s'avisa només si el curs no és dels meus", () => {
  assert.equal(isForeignCourse(["SOX"], "SOX"), false);
  assert.equal(isForeignCourse(["SOX"], "SX"), true);
  assert.equal(isForeignCourse(["SOX", "SI"], "SI"), false);
});
test("sense curs actiu no hi ha avís", () => {
  assert.equal(isForeignCourse(["SOX"], null), false);
  assert.equal(isForeignCourse(["SOX"], undefined), false);
});
