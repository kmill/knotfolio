// Conway potential
//
// Uses the Seifert matrix to calculate it directly.

import {assert, compare} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {Poly} from "./poly.mjs";
import {det} from "./matrix.mjs";
import {get_invariant, define_invariant} from "./invariants.mjs";

define_invariant("conway_poly", async function (mt, diagram) {
  let matrices = diagram.seifert_form();
  if (matrices.length !== 1) {
    // the number of connected components is not 1
    return Laurent.zero;
  }
  let A = matrices[0];
  let C = [];
  for (let i = 0; i < A.length; i++) {
    C.push([]);
    for (let j = 0; j < A.length; j++) {
      C[i][j] = Laurent.add(Laurent.mul(Laurent.incl(A[i][j]), Laurent.t),
                            Laurent.mul(Laurent.incl(-A[j][i]), Laurent.tinv));
    }
  }
  let pre_poly = det(Laurent, C);
  if (pre_poly.is_zero()) {
    return Laurent.zero;
  }
  let z = Laurent.add(Laurent.t, Laurent.negate(Laurent.tinv));
  let zpows = [];
  let pow = Laurent.unit;
  for (let i = 0; pow.minexp() >= pre_poly.minexp(); i++) {
    zpows.push(pow);
    pow = Laurent.mul(pow, z);
  }
  let conway = Laurent.zero;
  for (let i = -pre_poly.minexp(); i >= 0; i--) {
    if (pre_poly.is_zero()) {
      // done
      break;
    }
    if (-pre_poly.minexp() === i) {
      let zpow = zpows[i];
      let c = pre_poly[0].coeff / zpow[0].coeff;
      conway = conway.add(Laurent.incl(c).simple_mul(1, i));
      pre_poly = pre_poly.add(Laurent.incl(-c).mul(zpow));
    }
  }

  return conway;
});
