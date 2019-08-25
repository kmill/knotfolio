// Alexander polynomials

import {assert, compare} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {Poly} from "./poly.mjs";
import {det} from "./matrix.mjs";
import {PD, P, Xp, Xm} from "./pd.mjs";
import {FGA, FGWord} from "./fga.mjs";
import {get_invariant, define_invariant} from "./invariants.mjs";

export function wirtinger_presentation(pd) {
  /* Returns the wirtinger presentation from an oriented PD */
  if (!(pd instanceof PD)) {
    pd = pd.get_pd(true);
  }
  let gens = []; // names of generators
  let rels = [];
  pd.forEach(entity => {
    entity.forEach(i => {
      if (gens[i] === void 0) {
        gens[i] = "x" + i;
      }
    });
    if (entity instanceof P) {
      let a = gens[entity[0]],
          b = gens[entity[1]];
      rels.push(FGWord.make(a, 1, b, -1));
    } else if (entity instanceof Xp) {
      let a = gens[entity[0]],
          b = gens[entity[1]],
          c = gens[entity[2]],
          d = gens[entity[3]];
      rels.push(FGWord.make(d, 1, b, -1));
      rels.push(FGWord.make(b, 1, c, 1, d, -1, a, -1));
    } else if (entity instanceof Xm) {
      let a = gens[entity[0]],
          b = gens[entity[1]],
          c = gens[entity[2]],
          d = gens[entity[3]];
      rels.push(FGWord.make(d, 1, b, -1));
      rels.push(FGWord.make(c, 1, d, 1, a, -1, b, -1));
    } else {
      throw new TypeError;
    }
  });

  let removed_gens = new Set();
  simplification_round:
  while (true) {
    //console.log("rels " + toString(rels));
    // Remove empty words
    rels = rels.map(r => r.normalize_conj(false)).filter(word => word.length > 0);
    // and duplicates
    rels.sort(compare);
    let i = 0;
    while (i + 1 < rels.length) {
      if (compare(rels[i], rels[i+1]) === 0) {
        rels.splice(i+1,1);
      } else {
        i++;
      }
    }
    //console.log("  -> " + toString(rels));

    // Look for a relation that gives a generator in terms of other generators
    for (let i = 0; i < rels.length; i++) {
      let rel = rels[i];
      try_next_g:
      for (let j = 0; j < rel.length; j += 2) {
        let g = rel[j];
        if (Math.abs(rel[j+1]) === 1) {
          for (let k = 0; k < rel.length; k += 2) {
            if (k !== j && rel[k] === g) {
              continue try_next_g;
            }
          }
          let w = rel.slice(j+2).concat(rel.slice(0,j));
          if (rel[j+1] === 1) {
            w = w.inverse();
          }
          //console.log("from " + toString(rel) + " got " + g + " is " + toString(w));
          removed_gens.add(g);
          rels.splice(i, 1);
          rels = rels.map(rel => rel.substitute(g, w));
          continue simplification_round;
        }
      }
    }
    // Didn't find anything
    break;
  }

  let gen_list = gens.filter(g => !removed_gens.has(g));
  
  return {gens: gen_list,
          rels: rels};
}

export function alexander_module(pres) {
  /* Given a presentation {gens,rels} of a group with a homomorphism
     to Z where each generator is sent to 1, computes a matrix for the
     Alexander module. */

  // A common approach is to use Fox derivatives, like so:
  //   let matrix = pres.gens.map(g => pres.rels.map(rel => rel.fox_deriv(g).toLaurent()));
  // However, an algorithmically more efficient method is to "linearize" the relations directly.
  // This essentially means taking a relation, constructing its image in the chain group, giving
  // a column of the matrix, rather than using derivations to compute each entry one at a time.

  // matrix[i][j] is for generator i and relation j
  let matrix = pres.gens.map(g => pres.rels.map(rel => Laurent.zero));

  pres.rels.forEach((rel, j) => {
    let ab = 0;
    for (let k = 0; k < rel.length; k += 2) {
      let i = pres.gens.indexOf(rel[k]);
      let exp = Math.sign(rel[k+1]);
      let times = Math.abs(rel[k+1]);
      for (let n = 0; n < times; n++) {
        let term;
        if (exp > 0) {
          term = Laurent.make(LTerm.make(1, ab));
        } else {
          term = Laurent.make(LTerm.make(-1, ab-1));
        }
        matrix[i][j] = matrix[i][j].add(term);
        ab += exp;
      }
    }
  });

  
  // This is not yet a presentation.  It is the matrix A in the chain complex
  //   C_2 --A--> C_1 -----> C_0
  // The group C_0 is Z[t,t^{-1}], and the map from C_1 is g |-> t-1.
  // Thus, the kernel has the basis gi-g1 for i != 1.
  //
  // This means we can just remove a row and get a presentation matrix.
  matrix.pop();

  // representative generators pres.gens.slice(0, pres.gens.length-1)
  return simplify_presentation_matrix(matrix);
}

function simplify_presentation_matrix(matrix) {
  /* Given a presentation matrix of Laurent polynomials over Z,
     attempt to sort of simplify it.  We can't eaxctly do Smith Normal
     Form because Z[t,t^{-1}] is not a PID, but we can sure try. */

  if (matrix.length === 0) {
    return [];
  }

  // scale by t^n so that everything is a polynomial
  let min_exp = Infinity;
  matrix.forEach(row => row.forEach(entry => {
    if (!entry.is_zero()) {
      min_exp = Math.min(min_exp, entry.minexp());
    }
  }));
  if (min_exp === Infinity) {
    min_exp = 0;
  }
  let pmatrix = matrix.map(row => row.map(entry => entry.simple_mul(1, -min_exp).to_poly(true)));

  function normalize_row(i) {
    let min_exp = Infinity;
    for (let j = 0; j < pmatrix[i].length; j++) {
      let c = pmatrix[i][j];
      min_exp = Math.min(min_exp, c.min_exp());
    }
    if (min_exp < Infinity) {
      for (let j = 0; j < pmatrix[i].length; j++) {
        pmatrix[i][j] = pmatrix[i][j].mul_x(-min_exp);
      }
    }
  }

  function normalize_col(j) {
    let min_exp = Infinity;
    for (let i = 0; i < pmatrix.length; i++) {
      let c = pmatrix[i][j];
      min_exp = Math.min(min_exp, c.min_exp());
    }
    if (min_exp < Infinity) {
      for (let i = 0; i < pmatrix.length; i++) {
        pmatrix[i][j] = pmatrix[i][j].mul_x(-min_exp);
      }
    }
  }

  function delete_col(j) {
    for (let i = 0; i < pmatrix.length; i++) {
      pmatrix[i].splice(j, 1);
    }
  }

  function delete_col_if_zero(j) {
    let all_zero = true;
    for (let i = 0; i < pmatrix.length; i++) {
      all_zero = all_zero && pmatrix[i][j].is_zero();
    }
    if (all_zero) {
      delete_col(j);
    }
  }
  
  function swap_rows(i1, i2) {
    if (i1 === i2) {
      return;
    }
    [pmatrix[i1], pmatrix[i2]] = [pmatrix[i2], pmatrix[i1]];
  }
  function swap_cols(j1, j2) {
    if (j1 === j2) {
      return;
    }
    for (let i = 0; i < pmatrix.length; i++) {
      [pmatrix[i][j1], pmatrix[i][j2]] = [pmatrix[i][j2], pmatrix[i][j1]];
    }
  }
  function add_to_col(j2, j1, c, n) {
    /* col[j2] += c * col[j1] * x^n */
    for (let i = 0; i < pmatrix.length; i++) {
      pmatrix[i][j2] = pmatrix[i][j2].add(pmatrix[i][j1].scale(c).mul_x(n));
    }
  }

  for (let j = pmatrix[0].length-1; j >= 0; j--) {
    delete_col_if_zero(j);
  }
  for (let i = 0; i < pmatrix.length; i++) {
    normalize_row(i);
  }
  for (let j = 0; j < pmatrix[0].length; j++) {
    normalize_col(j);
  }

  // Now for a modified version of Gaussian elimination (Z[t] not a PID)
  
  function gauss_right() {
    if (pmatrix.length === 0) {
      return false;
    }
    let changed = false;

    let i = 0,
        j = 0;
    gauss_loop:
    while (i < pmatrix.length && j < pmatrix[0].length) {
      if (pmatrix[i][j].is_zero()) {
        for (let j2 = j + 1; j2 < pmatrix[0].length; j2++) {
          if (!pmatrix[i][j2].is_zero()) {
            swap_cols(j, j2);
            changed = true;
            continue gauss_loop;
          }
        }
        i++;
        continue gauss_loop;
      }
      if (pmatrix[i][j].leading_coeff() < 0) {
        for (let i2 = i; i2 < pmatrix.length; i2++) {
          pmatrix[i2][j] = pmatrix[i2][j].scale(-1);
        }
      }
      { // reduce from (i,j) rightward if possible
        let pij = pmatrix[i][j];
        let deg = pij.degree();
        let j2 = j + 1;
        while (j2 < pmatrix[0].length) {
          let pij2 = pmatrix[i][j2];
          let deg2 = pij2.degree();
          if (deg <= deg2 && pij.leading_coeff() <= Math.abs(pij2.leading_coeff())) {
            let div = pij2.leading_coeff() / pij.leading_coeff();
            let idiv = Math.sign(div) * Math.floor(Math.abs(div));
            add_to_col(j2, j, -idiv, deg2 - deg);
            normalize_col(j2);
            delete_col_if_zero(j2);
            changed = true;
          } else {
            j2++;
          }
        }
      }
      { // look for polynomial of least degree with smallest leading coefficient
        let best_j = j,
            best_deg = pmatrix[i][j].degree(),
            best_leading = pmatrix[i][j].leading_coeff();
        for (let j2 = j + 1; j2 < pmatrix[0].length; j2++) {
          let pij2 = pmatrix[i][j2];
          if (!pij2.is_zero() && pij2.degree() <= best_deg && Math.abs(pij2.leading_coeff()) <= best_leading) {
            best_j = j2;
            best_deg = pij2.degree();
            best_leading = Math.abs(pij2.leading_coeff());
          }
        }
        if (best_j !== j) {
          swap_cols(j, best_j);
          changed = true;
          continue gauss_loop;
        }
      }
      { // check that eliminated everything
        let eliminated = true;
        for (let j2 = j + 1; j2 < pmatrix[0].length; j2++) {
          eliminated = eliminated && pmatrix[i][j2].is_zero();
        }
        if (!eliminated) {
          break gauss_loop;
        }
      }
      i++;
      j++;
    }

    return changed;
  }

  function eliminate_null_gens() {
    let j = 0;
    next_gen:
    while (j < pmatrix[0].length) {
      let idx = null;
      for (let i = 0; i < pmatrix.length; i++) {
        let pij = pmatrix[i][j];
        if (!pij.is_zero()) {
          if (idx !== null || pij.degree() !== 0 || Math.abs(pij[0]) != 1) {
            j++;
            continue next_gen;
          } else {
            idx = i;
          }
        }
      }
      assert(idx !== null);
      delete_col(j);
      pmatrix.splice(idx, 1);
    }
  }

  // temporary transpose
  function transpose() {
    let rows = pmatrix.length,
        cols = rows > 0 ? pmatrix[0].length : 0;
    let tpmatrix = new Array(cols);
    for (let i = 0; i < cols; i++) {
      tpmatrix[i] = new Array(rows);
      for (let j = 0; j < rows; j++) {
        tpmatrix[i][j] = pmatrix[j][i];
      }
    }
    pmatrix = tpmatrix;
  }

  // make a best-effort reduction
  for (let max_attempts = 4; max_attempts > 0; max_attempts--) {
    let changed = false;
    changed = gauss_right() || changed;
    if (pmatrix.length === 0) break;
    eliminate_null_gens();
    if (pmatrix.length === 0) break;
    pmatrix.reverse().forEach(row => row.reverse()); // sort of makes do back-substitution
    changed = gauss_right() || changed;
    if (pmatrix.length === 0) break;
    eliminate_null_gens();
    if (pmatrix.length === 0) break;
    let old_pmatrix = pmatrix;
    transpose(); // makes do row reduction other way
    changed = gauss_right() || changed;
    if (pmatrix.length === 0) { pmatrix = old_pmatrix; break; }
    pmatrix.reverse().forEach(row => row.reverse());
    changed = gauss_right() || changed;
    if (pmatrix.length === 0) { pmatrix = old_pmatrix; break; }
    transpose(); // return to correct form!
    eliminate_null_gens();
    if (!changed || pmatrix.length === 0) {
      break;
    }
  }

  return pmatrix.map(row => row.map(entry => Laurent.fromCoeffs(entry)));
}

export function alexander_polynomial(module, n=0) {
  /* Computes the nth Alexander polynomial with the given module
  presentation. A module is an m x k matrix, with m the number of
  generators.  The 0th Alexander polynomial is the standard one.*/

  // Need to get all k=m-n minors of matrix.module.  In particular, the
  // determinants of all the k x k submatrices.  In more
  // particular, the GCD of these determinants.

  let k = module.length - n;
  if (k <= 0) {
    return Laurent.unit;
  }

  let gcd = Laurent.zero;

  let cur_rows = [];
  function minor_rows(next_i) {
    if (cur_rows.length === k) {
      do_minor_cols(0);
    } else {
      for (let i = next_i; i < module.length - (k - cur_rows.length - 1); i++) {
        cur_rows.push(module[i]);
        minor_rows(i + 1);
        cur_rows.pop();
      }
    }
  }
  let minor = [];
  for (let i = 0; i < k; i++) {
    minor.push([]);
  }
  function do_minor_cols(next_j) {
    if (minor[0].length === k) {
      gcd = gcd.gcd(det(Laurent, minor));
    } else {
      for (let j = next_j; j < module[0].length - (k - minor[0].length - 1); j++) {
        for (let i = 0; i < k; i++) {
          minor[i].push(cur_rows[i][j]);
        }
        do_minor_cols(j + 1);
        for (let i = 0; i < k; i++) {
          minor[i].pop();
        }
      }
    }
  }

  minor_rows(0);

  let coeffs = gcd.coeffs();
  if (coeffs[0] < 0) {
    coeffs = coeffs.map(c => -c);
  }

  return Laurent.fromCoeffs(coeffs, 0);
}

define_invariant("wirtinger_presentation", async function (mt, diagram) {
  return wirtinger_presentation(diagram);
});
define_invariant("alexander_module", async function (mt, diagram) {
  let wp = await get_invariant("wirtinger_presentation", diagram);
  return alexander_module(wp);
});
define_invariant("alexander_poly", async function (mt, diagram, n/*default=0*/) {
  if (arguments.length === 2) {
    return await get_invariant("alexander_poly", diagram, 0);
  }
  let matrix = await get_invariant("alexander_module", diagram);
  await mt.next_turn(); // just to let other things happen. the next line probably ought to be broken up.
  return alexander_polynomial(matrix, n);
});
