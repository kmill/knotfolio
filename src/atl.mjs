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
    return this.n === ad2.n && this.a === ad2.a && this.b === ad2.b;
  }
  compare(ad2) {
    assert(ad2 instanceof ADir);
    let ad1 = this;
    let c;
    c = ad1.a - ad2.a;
    if (c !== 0) return c;
    c = ad1.b - ad2.b;
    if (c !== 0) return c;
    return ad1.n - ad2.n;
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
  let exp = new Array(n+1).fill(0);
  exp[n] = 1;
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
    /* Create a normalized ATerm. */
    let term = new this(coeff, paths);
    return term.normalize();
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
        coeff = coeff.mul(loopVal(p1.n/2));
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
  scale(c) {
    return new ATerm(this.coeff.mul(c), this.paths);
  }
}

export class ATL extends SimpleType {
  // A list of ATerms
  copy() {
    return this.slice();
  }
  normalize() {
    /* In-place normalization of the ATL. */

    // Each ATerm is assumed to be pre-normalized
    // this.forEach(term => term.normalize());

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
      } else if (j === i + 1) {
        i++;
      } else {
        this[i] = new ATerm(sum, term.paths);
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
    // Reference implementation:
    // return this.concat(atl2).normalize();

    let atl1 = this;
    let i1 = 0, i2 = 0;
    let result = new ATL();

    while (i1 < atl1.length && i2 < atl2.length) {
      let t1 = atl1[i1], t2 = atl2[i2];

      let comp = compare(t1.paths, t2.paths);
      if (comp === 0) {
        let coeff = t1.coeff.add(t2.coeff);
        if (!coeff.is_zero()) {
          result.push(new ATerm(coeff, t1.paths));
        }
        i1++;
        i2++;
      } else if (comp < 0) {
        result.push(t1);
        i1++;
      } else {
        result.push(t2);
        i2++;
      }
    }
    while (i1 < atl1.length) {
      result.push(atl1[i1]);
      i1++;
    }
    while (i2 < atl2.length) {
      result.push(atl2[i2]);
      i2++;
    }
    return result;
  }

  scale(c, paths) {
    if (c.is_zero()) {
      return ATL.zero;
    }
    if (paths.length === 0) {
      return this.map(term => term.scale(c));
    }
    let result = this.map(term =>
                          ATerm.make(term.coeff.mul(c),
                                     term.paths.concat(paths)));
    return result.normalize();
  }

  mul(atl2) {
    assert(atl2 instanceof ATL);
    let result = ATL.make();
    atl2.forEach(term2 => {
      result = result.add(this.scale(term2.coeff, term2.paths));
    });
    return result;
    /*this.forEach(term1 => {
      atl2.forEach(term2 => {
        result.push(ATerm.make(term1.coeff.mul(term2.coeff),
                               term1.paths.concat(term2.paths)));
      });
    });
    return result.normalize();*/
  }
}
ATL.zero = ATL.make();
ATL.unit = ATL.make(ATerm.make(MLaurent.unit, [])).normalize();



// for (let n = 0; n < 5; n++) {
//   console.log("loopVal(" + n + ") = " + loopVal(n).toMathematica(arrow_varnames));
// }

// console.log(loopVal(2).mul(loopVal(3)).toMathematica(arrow_varnames));

// console.log(''+ATL.unit);
