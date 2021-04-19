import {assert} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {eigenvalues} from "./eigenvalues.mjs";

export function det(NumberSystem, matrix) {
  /* Computes the determinant of the given matrix, with entries in the
     NumberSystem = {zero, unit, add, mul, negate, is_zero}.  A matrix is a list of
     lists.  Performs cofactor expansion along the first row (matrix[0][...]). */

  if (matrix.length === 0) {
    return NumberSystem.unit;
  }
  assert(matrix.length === matrix[0].length); // only square matrices

  if (matrix.length === 1) {
    return matrix[0][0];
  }

  if (matrix.length === 2) {
    return NumberSystem.add(
      NumberSystem.mul(matrix[0][0], matrix[1][1]),
      NumberSystem.negate(NumberSystem.mul(matrix[1][0], matrix[0][1])));
  }

  if (matrix.length === 3) {
    return NumberSystem.add(
      NumberSystem.add(
        NumberSystem.add(
          NumberSystem.mul(NumberSystem.mul(matrix[0][0], matrix[1][1]), matrix[2][2]),
          NumberSystem.mul(NumberSystem.mul(matrix[0][1], matrix[1][2]), matrix[2][0])),
        NumberSystem.mul(NumberSystem.mul(matrix[0][2], matrix[1][0]), matrix[2][1])),
      NumberSystem.negate(
        NumberSystem.add(
          NumberSystem.add(
            NumberSystem.mul(NumberSystem.mul(matrix[0][0], matrix[2][1]), matrix[1][2]),
            NumberSystem.mul(NumberSystem.mul(matrix[0][1], matrix[2][2]), matrix[1][0])),
          NumberSystem.mul(NumberSystem.mul(matrix[0][2], matrix[2][0]), matrix[1][1]))
      ));
  }

  // Do cofactor expansion over the first row.
  let val = NumberSystem.zero;
  for (let j = 0; j < matrix[0].length; j++) {
    let c = matrix[0][j];
    if (NumberSystem.is_zero(c)) {
      continue;
    }
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
