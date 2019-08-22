import {assert, assert_fails, test, test_async, equal, toString} from "./util.mjs";
import {PD,X,P,Xp,Xm} from "./pd.mjs";
import {Laurent} from "./laurent.mjs";
import {get_invariant} from "./invariants.mjs";
import "./jones.mjs";
import * as knotinfo from "./knotinfo.mjs";

test_async("kauffman", async function() {

  let un = await get_invariant("kauffman_bracket", PD.make(P.make(1,1)));
  assert(equal(un, Laurent.unit));

  let k31_kb = await get_invariant("kauffman_bracket",
                                   PD.make(X.make(1,3,6,4), X.make(3,5,2,6), X.make(5,1,4,2)));
  assert(equal(k31_kb, Laurent.fromCoeffs([1,0,0,0,-1,0,0,0,0,0,0,0,-1],-7)));
});

test_async("jones knotinfo", async function () {
  for (let i = 0; i < knotinfo.data.length; i++) {
    let link = knotinfo.data[i];
    let pd = PD.make();
    link.pd.forEach(entity => {
      if (entity.length === 2) {
        pd.push(P.make(...entity));
      } else if (entity.length === 4) {
        // in the KnotInfo/LinkInfo database, each entity is secretly
        // Xp or Xm, and the indices for (_,b,_,c) determine the
        // orientation
        let [a,b,c,d] = entity;
        let fwdd = (b-d) === 1 || (b-d) < -1;
        if (fwdd) {
          pd.push(Xp.make(a,b,c,d));
        } else {
          pd.push(Xm.make(a,b,c,d));
        }
      } else {
        throw new Error("bad pd");
      }
    });
    let jones_poly = await get_invariant("jones_poly", pd);
    let jones_coeffs = jones_poly ? [jones_poly.minexp()].concat(jones_poly.coeffs()) : [0];
    try {
      assert(equal(jones_coeffs, link.jones));
    } catch (x) {
      console.log(link.name);
      console.log(jones_poly.toMathematica());
      console.log(toString(jones_coeffs));
      console.log(toString(link.jones));
      throw x;
    }
  }
});
