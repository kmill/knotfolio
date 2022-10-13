// Conway potential
//
// Uses the Seifert matrix to calculate it directly.

import {assert, compare} from "./util.mjs";
import {Laurent} from "./laurent.mjs";
import {Poly} from "./poly.mjs";
import {RatFun} from "./ratfun.mjs";
import {det} from "./matrix.mjs";
import {get_invariant, define_invariant} from "./invariants.mjs";

function ratfun_det(lmatrix) {
  /* compute the determinant of a matrix of Laurent polynomials */
  if (lmatrix.length == 0) {
    return Laurent.unit;
  }

  //console.log("{" + lmatrix.map(row => "{" + row.join(", ") + "}").join(", ") + "}");

  let matrix = lmatrix.map(row => row.map(p => RatFun.from_laurent(p)));
  let rows = matrix.length,
      cols = matrix[0].length;
  assert(rows === cols); // only square matrices

  //console.log("{" + matrix.map(row => "{" + row.join(", ") + "}").join(", ") + "}");

  let det = RatFun.unit;

  // proceed by row reduction
  let i = 0,
      j = 0;
  while (i < rows && j < cols) {
    if (matrix[i][j].is_zero()) {
      for (let k = i + 1; k < rows; k++) {
        if (!matrix[k][j].is_zero()) {
          [matrix[i], matrix[k]] = [matrix[k], matrix[i]];
          det = det.scale(-1);
          break;
        }
      }
      if (matrix[i][j].is_zero()) {
        return Laurent.zero;
        //j++;
        //continue;
      }
    }
    let c = matrix[i][j];
    det = det.mul(c);
    if (det.is_zero()) {
      return Laurent.zero;
    }
    matrix[i] = matrix[i].map(v => v.div(c));
    for (let k = i + 1; k < rows; k++) {
      c = matrix[k][j];
      matrix[k][j] = RatFun.zero;
      for (let l = j + 1; l < cols; l++) {
        matrix[k][l] = matrix[k][l].add(matrix[i][l].mul(c).scale(-1));
      }
    }
    i++;
    j++;
  }
  // verify denominator is of right form
  for (let i = 0; i < det.q.length - 1; i++) {
    assert(det.q[i] === 0);
  }
  assert(det.q.leading_coeff() === 1);
  return Laurent.fromCoeffs(det.p).simple_mul(1, -det.q.degree());
}

define_invariant("conway_poly", async function (mt, diagram) {
  let matrices = diagram.seifert_form();
  if (matrices.length !== 1) {
    // the number of connected components is not 1
    return Laurent.zero;
  }
  let A = matrices[0];
  // calculate C = -tA+t^{-1}A^T
  // (chose +/- convention to match Linkinfo's conway polynomials)
  let C = [];
  for (let i = 0; i < A.length; i++) {
    C.push([]);
    for (let j = 0; j < A.length; j++) {
      C[i][j] = Laurent.add(Laurent.mul(Laurent.incl(-A[i][j]), Laurent.t),
                            Laurent.mul(Laurent.incl(A[j][i]), Laurent.tinv));
    }
  }
  // pre_poly is the normalized Alexander polynomial
//  let pre_poly = det(Laurent, C);
//  console.log("det");
//  console.log(ratfun_det(C));
  let pre_poly = ratfun_det(C);
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
      let c = pre_poly._coeffs[0] / zpow._coeffs[0];
      conway = conway.add(Laurent.fromCoeffs([c], i));
      pre_poly = pre_poly.add(Laurent.incl(-c).mul(zpow));
    }
  }

  return conway;
});
