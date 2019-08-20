import {assert, assert_fails, test} from "./util.mjs";
import * as util from "./util.mjs";

test("assertions", () => {
  assert(true);
  assert_fails(() => assert(false));
  assert_fails(() => assert_fails(() => assert(true)));
});

test("equality", () => {
  assert(util.equal(1, 1));
  assert(!util.equal(1, 2));
  assert(util.equal([], []));
  assert(util.equal([2,22,222], [2,22,222]));
  assert(!util.equal([2,22,222], [2,222]));
});

test("compare", () => {
  assert(util.compare(1,2) < 0);
  assert(util.compare(1,1) === 0);
  assert(util.compare(2,1) > 0);

  assert(util.compare([1,2],[0,1,2]) < 0);
  assert(util.compare([1,2],[1,2]) === 0);
  assert(util.compare([1,2],[3,4]) < 0);
});
