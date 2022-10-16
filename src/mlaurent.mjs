import {assert, SimpleType, toString} from "./util.mjs";
import {gcd} from "./integers.mjs";
import {Poly} from "./poly.mjs";
import Q from "./kq.mjs";
import * as expr from "./expr.mjs";

// A multivariable Laurent polynomial in infinitely many variables indexed x_0, x_1, etc.

// They are stored in a way to try to save on memory allocations.
//
// An MLaurent is a list of numbers with packets of the following type
//
// ... 3 2.2 5 -1 2 ...
//
// representing the monomial 2.2 x_0^5 x_1^{-1} x_2^2
//
// The first number is the number of exponents, the second number is
// the coefficient, and the remaining numbers are the exponents.

function lex_compare_exps(p1, i1, p2, i2, exp2) {
  /* Lexicographically compare the exponent lists for the packet at i1
     in p1 and the packet at i2 in p2, where the second packet is
     biased by the list exp2 of exponents ([] is "no bias"). */
  let n1 = p1[i1], n2 = p2[i2],
      n = Math.max(n1, n2, exp2.length);
  for (let j = 0; j < n; j++) {
    let p1v = j < n1 ? p1[i1+2+j] : 0,
        p2v = j < n2 ? p2[i2+2+j] : 0;
    if (j < exp2.length) {
      p2v += exp2[j];
    }
    let c = p1v - p2v;
    if (c !== 0) {
      return c;
    }
  }
  return 0;
}

const empty_list = []; // save on memory allocations for immutable empty lists

export class MLaurent extends SimpleType {
  copy() {
    return this.slice();
  }
  is_zero() {
    return this.length === 0;
  }
  add(p2, c=1, exp=empty_list) {
    /* computes this + p2*c*x(exp) */
    assert(p2 instanceof MLaurent);
    if (c === 0) {
      return this;
    }
    let p1 = this,
        i1 = 0, i2 = 0,
        result = new MLaurent();
    function copy_in(p, i, coeff, exp) {
      if (coeff !== 0) {
        let np = p[i];
        let n = Math.max(np, exp.length);
        let nindex = result.length;
        result.push(-1, coeff); // -1 is placeholder for adjusted n
        for (let j = 0; j < n; j++) {
          let e = j < np ? p[i+2+j] : 0;
          e += j < exp.length ? exp[j] : 0;
          result.push(e);
        }
        while (n > 0 && result[result.length-1] === 0) {
          result.pop();
          n--;
        }
        result[nindex] = n;
      }
      return 2 + p[i];
    }
    while (i1 < p1.length && i2 < p2.length) {
      let comp = lex_compare_exps(p1, i1, p2, i2, exp);
      if (comp === 0) {
        i1 += copy_in(p1, i1, p1[i1+1] + c*p2[i2+1], empty_list);
        i2 += 2 + p2[i2];
      } else if (comp < 0) {
        i1 += copy_in(p1, i1, p1[i1+1], empty_list);
      } else {
        i2 += copy_in(p2, i2, c*p2[i2+1], exp);
      }
    }
    while (i1 < p1.length) {
      i1 += copy_in(p1, i1, p1[i1+1], empty_list);
    }
    while (i2 < p2.length) {
      i2 += copy_in(p2, i2, c*p2[i2+1], exp);
    }
    return result;
  }
  mul(p2) {
    /* Multiplies this with p2.  Should run a bit faster if p2 is "smaller". */
    assert(p2 instanceof MLaurent);
    let p1 = this,
        result = MLaurent.zero;
    for (let i2 = 0; i2 < p2.length; i2 += 2 + p2[i2]) {
      result = result.add(p1, p2[i2+1], p2.slice(i2+2, i2+2+p2[i2]));
    }
    return result;
  }

  *terms() {
    for (let i = 0; i < this.length; i += 2 + this[i]) {
      yield {coeff: this[i+1],
             exps: this.slice(i+2, i+2+this[i])};
    }
  }

  toExpr(variables=null, exp_divisor=1) {
    if (variables === null) {
      variables = i => "x" + i;
    }
    let e = expr.make_int_const(0);
    for (let term of this.terms()) {
      let eterm = expr.make_int_const(term.coeff);
      term.exps.forEach((e, i) => {
        eterm = expr.times(eterm, expr.pow(expr.make_var(variables(i)), expr.make_int_const(e, exp_divisor)));
      });
      e = expr.plus(e, eterm);
    }
    return e;
  }

  coeffs(n=1) {
    // Returns a list of pairs, where the first of each pair is a polynomial in x0, x2, ... x(n-1), and the second is a polynomial in xn, x(n+1), ...

    function lexcompare(expB, second) {
      let nB = expB.length,
          ns = second[0],
          n = Math.max(nB, ns);
      for (let j = 0; j < n; j++) {
        let pB = j < nB ? expB[j] : 0,
            ps = j < ns ? second[2+j] : 0;
        let c = pB - ps; assert(!isNaN(c));
        if (c !== 0) {
          return c;
        }
      }
      return 0;
    }

    let split = [];
    for (let term of this.terms()) {
      let exp = term.exps.slice();
      let expA = exp.slice(0, n),
          expB = new Array(n).fill(0).concat(exp.slice(n));
      while (expB[expB.length - 1] === 0) {
        expB.pop();
      }
      let polyA = MLaurent.make(expA.length, term.coeff, ...expA),
          polyB = MLaurent.make(expB.length, 1, ...expB);
      // locate a split with expB as the second part.
      foundit: {
        for (let i = 0; i < split.length; i++) {
          let second = split[i][1];
          let c = lexcompare(expB, second);
          if (c < 0) {
            split.splice(i, 0, [polyA, polyB]);
            break foundit;
          } else if (c === 0) {
            split[i][0] = split[i][0].add(polyA);
            break foundit;
          }
        }
        split.push([polyA, polyB]);
      }
    }
    return split;
  }

  static x(n, exp=1) {
    assert(n === (0|n) && n >= 0);
    let result = new MLaurent();
    result.push(1+n, 1);
    for (let i = 0; i < n; i++) {
      result.push(0);
    }
    result.push(exp);
    return result;
  }

  // Making this a NumberSystem
  static add(a, b) {
    return a.add(b);
  }
  static mul(a, b) {
    return a.mul(b);
  }
  static negate(a) {
    let result = a.copy();
    for (let i = 0; i < result.length; i += 2 + result[i]) {
      result[i+1] = -result[i+1];
    }
    return result;
  }
  static incl(v) {
    assert(typeof v === "number");
    if (v === 0) {
      return new MLaurent();
    } else {
      return MLaurent.make(0, v);
    }
  }
}
MLaurent.zero = MLaurent.incl(0);
MLaurent.unit = MLaurent.incl(1);


// console.log("zero = " + MLaurent.zero.toMathematica());
// console.log("unit = " + MLaurent.unit.toMathematica());

// console.log(MLaurent.unit.add(MLaurent.unit, -1, [5,5,0,0,0]).toMathematica());

// let p = MLaurent.unit.add(MLaurent.x(0));
// console.log('x0 = ' + MLaurent.x(0).toMathematica());
// console.log('x1 = ' + MLaurent.x(1).toMathematica());
// console.log('x2 = ' + MLaurent.x(2).toMathematica());
// console.log('p = ' + p.toMathematica());
// console.log('p*p = ' + p.mul(p).toMathematica());
// console.log('p*p-x1 = ' + p.mul(p).add(MLaurent.x(1),-1).toMathematica());
// console.log(p.add(p, 1, [1]).toMathematica());
