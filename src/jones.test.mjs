import {assert, assert_fails, test, test_async, equal} from "./util.mjs";
import {PD,X,P} from "./pd.mjs";
import {Laurent} from "./laurent.mjs";
import {get_invariant} from "./invariants.mjs";
import "./jones.mjs";

test_async("kauffman", async function() {

  let un = await get_invariant("kauffman_bracket", PD.make(P.make(1,1)));
  assert(equal(un, Laurent.unit));

  let k31_kb = await get_invariant("kauffman_bracket",
                                   PD.make(X.make(1,3,6,4), X.make(3,5,2,6), X.make(5,1,4,2)));
  assert(equal(k31_kb, Laurent.fromCoeffs([1,0,0,0,-1,0,0,0,0,0,0,0,-1],-7)));
});
