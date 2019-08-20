import {assert, assert_fails, test, equal} from "./util.mjs";
import {TLPath, TLTerm, TL} from "./tl.mjs";
import {Laurent} from "./laurent.mjs";

test("tl", () => {
  assert(equal(TLPath.make(1,2), TLPath.make(2,1)));

  assert(equal(TL.make(TLTerm.make(Laurent.unit, [TLPath.make(1,1)])).normalize(),
               TL.make(TLTerm.make(TL.loop, []))));

  assert(equal(TL.make(TLTerm.make(Laurent.unit, [TLPath.make(1,3),
                                                  TLPath.make(2,5),
                                                  TLPath.make(3,5),
                                                  TLPath.make(2,1)
                                                 ])).normalize(),
               TL.make(TLTerm.make(TL.loop, []))));

  assert(equal(TL.make(TLTerm.make(Laurent.unit, [TLPath.make(1,3),
                                                  TLPath.make(2,5),
                                                  TLPath.make(3,5)
                                                 ])).normalize(),
               TL.make(TLTerm.make(Laurent.unit, [TLPath.make(1,2)]))));

  assert(equal(TL.make(TLTerm.make(Laurent.unit, [TLPath.make(5,2),
                                                  TLPath.make(1,4)
                                                 ])).normalize(),
               TL.make(TLTerm.make(Laurent.unit, [TLPath.make(1,4), TLPath.make(2,5)]))));

  function x(a, b, c, d) {
    return TL.make(TLTerm.make(Laurent.t, [TLPath.make(a,b), TLPath.make(c,d)]),
                   TLTerm.make(Laurent.tinv, [TLPath.make(a,d), TLPath.make(b,c)]));
  }
  let k3_1_kauff = x(1,3,6,4).mul(x(3,5,2,6)).mul(x(5,1,4,2));
  assert(equal(k3_1_kauff,
               TL.make(TLTerm.make(Laurent.fromCoeffs([-1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1],-9), []))));
});
