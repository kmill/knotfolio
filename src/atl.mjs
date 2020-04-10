// A modification of the Temperley--Lieb planar algebra for calculating the arrow polynomial
// See arrow.nb

import {assert, SimpleType, equal, compare, toString} from "./util.mjs";
import {MLaurent} from "./mlaurent.mjs";

export class ADir {
  constructor(n, a, b) {
    /* A path between edge ids a and b, weighted by the integer n. */
    if (a > b) {
      n = -n;
      [a, b] = [b, a];
    }
    this.n = n;
    this.a = a;
    this.b = b;
  }
  equal(ad2) {
    assert(ad2 instanceof ADir);
    return this[0] === ad2[0] && this[1] === ad2[1];
  }
  compare(ad2) {
    assert(ad2 instanceof ADir);
    let ad1 = this;
    let c;
    c = ad1.n - ad2.n;
    if (c !== 0) return c;
    c = ad1.a - ad2.a;
    if (c !== 0) return c;
    return ad1.b - ad2.b;
  }
  static make(n, a, b) {
    assert(arguments.length === 3);
    return new this(n, a, b);
  }
  toString() {
    return "ADir.make(" + this.n + ", " + this.a + ", " + this.b + ")";
  }
}

const loop = MLaurent.add(MLaurent.negate(MLaurent.x(0,2)),
                          MLaurent.negate(MLaurent.x(0,-2)));

function loopVal(n) {
  assert(n === (0|n));
  if (n === 0) {
    return loop;
  }
  if (n < 0) n = -n;
  let exp = [];
  for (let i = 0; i < n; i++) {
    exp.push(0);
  }
  exp.push(1);
  return MLaurent.zero.add(loop, 1, exp);
}

export function arrow_varnames(i) {
  if (i === 0) {
    return "A";
  } else {
    return "K" + i;
  }
}

export class ATerm {
  constructor(coeffs, paths) {
    /* A multivariable Laurent coefficient and a [ADir,...] list.  The ownership of the paths list is transferred to the ATerm. */
    this.coeff = coeffs;
    this.paths = paths;
  }
  static make(coeff, paths) {
    return new this(coeff, paths);
  }
  toString() {
    return "ATerm.make(" + this.coeff + ", " + toString(this.paths) + ")";
  }
  equal(term2) {
    assert(term2 instanceof ATerm);
    return equal(this.coeff, term2.coeff) && equal(this.paths, term2.paths);
  }
  normalize() {
    /* In-place normalization of the ATerm */
    let coeff = this.coeff,
        paths = this.paths;
    let i = 0;
    main_loop:
    while (i < paths.length) {
      let p1 = paths[i];
      if (p1.a === p1.b) { // self-loop
        console.log("loop " + p1);
        console.log("coeff0 = " + coeff.toMathematica());
        coeff = coeff.mul(loopVal(p1.n/2));
        console.log("coeff1 = " + coeff.toMathematica());
        paths.splice(i, 1);
        continue main_loop;
      }
      let j = i + 1;
      while (j < paths.length) {
        let p2 = paths[j];
        if (p1.b === p2.a) {
          paths[i] = ADir.make(p1.n + p2.n, p1.a, p2.b);
          paths.splice(j, 1);
          continue main_loop;
        }
        if (p1.a === p2.b) {
          paths[i] = ADir.make(p1.n + p2.n, p2.a, p1.b);
          paths.splice(j, 1);
          continue main_loop;
        }
        if (p1.b === p2.b) {
          paths[i] = ADir.make(p1.n - p2.n, p1.a, p2.a);
          paths.splice(j, 1);
          continue main_loop;
        }
        if (p1.a === p2.a) {
          paths[i] = ADir.make(p1.n - p2.n, p2.b, p1.b);
          paths.splice(j, 1);
          continue main_loop;
        }
        j++;
      }
      i++;
    }
    this.coeff = coeff;

    paths.sort((p1, p2) => p1.a - p2.a); // this is lexicographic since all edge indices are distinct

    return this;
  }
}

export class ATL extends SimpleType {
  // A list of ATerms
  copy() {
    return this.slice();
  }
  normalize() {
    /* In-place normalization of the ATL. */
    this.forEach(term => term.normalize());
    console.log("prenorm = " + this);
    this.sort((term1, term2) => compare(term1.paths, term2.paths));

    let i = 0;
    while (i < this.length) {
      let term = this[i];
      let sum = term.coeff;
      let j = i + 1;
      while (j < this.length && compare(term.paths, this[j].paths) === 0) {
        sum = sum.add(this[j].coeff);
        j++;
      }
      if (sum.is_zero()) {
        this.splice(i, j-i);
      } else {
        term.coeff = sum;
        if (j-i-1 > 0) {
          this.splice(i+1, j-i-1);
        }
        i++;
      }
    }
    return this;
  }
  add(atl2) {
    assert(atl2 instanceof ATL);
    return this.concat(atl2).normalize();
  }
  mul(atl2) {
    assert(atl2 instanceof ATL);
    let result = ATL.make();
    this.forEach(term1 => {
      atl2.forEach(term2 => {
        result.push(ATerm.make(term1.coeff.mul(term2.coeff),
                               term1.paths.concat(term2.paths)));
      });
    });
    console.log(" premul = " + result);
    return result.normalize();
  }
}
ATL.unit = ATL.make(ATerm.make(MLaurent.unit, []));



// for (let n = 0; n < 5; n++) {
//   console.log("loopVal(" + n + ") = " + loopVal(n).toMathematica(arrow_varnames));
// }

// console.log(loopVal(2).mul(loopVal(3)).toMathematica(arrow_varnames));

// console.log(''+ATL.unit);
