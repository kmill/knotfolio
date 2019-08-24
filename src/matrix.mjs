import {assert} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {eigenvalues} from "./eigenvalues.mjs";

export function det(NumberSystem, matrix) {
  /* Computes the determinant of the given matrix, with entries in the
     NumberSystem = {zero, unit, add, mul, negate}.  A matrix is a list of
     lists.  Performs cofactor expansion along the first row (matrix[0][...]). */

  if (matrix.length === 0) {
    return NumberSystem.unit;
  }
  assert(matrix.length === matrix[0].length); // only square matrices

  if (matrix.length === 1) {
    return matrix[0][0];
  }

  // Do cofactor expansion over the first row.
  let val = NumberSystem.zero;
  for (let j = 0; j < matrix[0].length; j++) {
    let c = matrix[0][j];
    if (j % 2 === 1) {
      c = NumberSystem.negate(c);
    }
    let sub_matrix = [];
    for (let i = 1; i < matrix.length; i++) {
      sub_matrix.push(matrix[i].slice(0, j).concat(matrix[i].slice(j+1)));
    }
    val = NumberSystem.add(val, NumberSystem.mul(det(NumberSystem, sub_matrix), c));
  }
  return val;
}

export function signature(matrix, error=1e-14) {
  // The matrix is assumed to be an n x n integer matrix.

  if (matrix.length === 0) {
    return 0;
  }
  assert(matrix.length === matrix[0].length);

  let evals = eigenvalues(matrix);

  let sig = 0;
  eigenvalues(matrix).forEach(lam => {
    if (lam - error > 0) {
      sig++;
    } else if (lam + error < 0) {
      sig--;
    }
  });
  return sig;
}
