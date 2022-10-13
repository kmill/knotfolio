import {assert, assert_fails, test, equal} from "./util.mjs";
import {Laurent} from "./laurent.mjs";

test("laurent", () => {
  let p = Laurent.t.add(Laurent.tinv).negate();
  assert(p.toListString() === "[-1; -1,0,-1]");

  assert(p.mul(p).toListString() === "[-2; 1,0,2,0,1]");

  let loop = Laurent.fromCoeffs([-1,0,0,0,-1], -2);
  assert(loop.equal(loop));
  assert(loop.toListString() === "[-2; -1,0,0,0,-1]");
  assert(loop.div_by_loop().toListString() === "[0; 1]");

  p = Laurent.unit;
  for (let i = 0; i < 10; i++) {
    p = p.mul(loop);
  }
  for (let i = 0; i < 10; i++) {
    p = p.div_by_loop();
  }
  assert(p.toListString() === "[0; 1]");

  p = Laurent.unit;
  for (let i = 0; i < 10; i++) {
    p = loop.mul(p);
  }
  for (let i = 0; i < 10; i++) {
    p = p.div_by_loop();
  }
  assert(p.toListString() === "[0; 1]");

  assert(equal([1],
               loop.gcd(Laurent.fromCoeffs([1,1,1])).coeffs()));

  // gcd normalizes a polynomial
  assert(equal(Laurent.fromCoeffs([1,0,0,0,1]), loop.gcd(loop)));
});
