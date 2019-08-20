import {assert, assert_fails, test, equal} from "./util.mjs";
import {det} from "./matrix.mjs";
import {Integers} from "./integers.mjs";
import {Laurent} from "./laurent.mjs";

test("det", () => {
  assert(det(Integers, []) === 1);
  assert(det(Integers, [[22]]) === 22);
  assert(det(Integers, [[1,0],[0,1]]) === 1);
  assert(det(Integers, [[0,1],[1,0]]) === -1);
  assert(det(Integers, [[1,1,1], [1,2,3], [1,4,9]]) === 2);

  assert(equal(det(Laurent, [[Laurent.unit, Laurent.zero],
                             [Laurent.zero, Laurent.unit]]),
               Laurent.unit));
  assert(equal(det(Laurent, [[Laurent.zero, Laurent.unit],
                             [Laurent.unit, Laurent.zero]]),
               Laurent.unit.negate()));
  assert(equal(det(Laurent, [[Laurent.unit, Laurent.unit.negate()],
                             [Laurent.unit, Laurent.unit]]),
               Laurent.unit.add(Laurent.unit)));
  assert(equal(det(Laurent, [[Laurent.unit, Laurent.unit],
                             [Laurent.unit, Laurent.unit]]),
               Laurent.zero));
});
