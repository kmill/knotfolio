import {assert, assert_fails, test, test_async, equal} from "./util.mjs";
import {PD,Xp,Xm} from "./pd.mjs";
import {Laurent} from "./laurent.mjs";
import {get_invariant} from "./invariants.mjs";
import "./alexander.mjs";

test_async("alexander", async function() {
  {
    let k31_alex = await get_invariant("alexander_poly",
                                       PD.make(Xp.make(1,3,6,4), Xp.make(3,5,2,6), Xp.make(5,1,4,2)));
    let k31_coeffs = k31_alex.coeffs();
    assert(equal(k31_coeffs, [1, -1, 1]));
  }
  {
    let k31_alex = await get_invariant("alexander_poly",
                                       PD.make(Xm.make(4,1,3,6), Xm.make(6,3,5,2), Xm.make(2,5,1,4)));
    let k31_coeffs = k31_alex.coeffs();
    assert(equal(k31_coeffs, [1, -1, 1]));
  }
});
