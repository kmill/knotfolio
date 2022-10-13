import {assert, SimpleType} from "./util.mjs";
import {gcd} from "./integers.mjs";
import {Poly} from "./poly.mjs";
import * as expr from "./expr.mjs";
import Q from "./kq.mjs";

// A Laurent polynomial is a list of coefficients and an offset.

export class Laurent {
  constructor(offset, coeffs) {
    this._offset = offset;
    this._coeffs = coeffs;
  }

  copy() {
    return new Laurent(this._offset, this._coeffs); // ok since terms are immutable
  }
  is_zero() {
    // valid for normalized laurent polynomials
    return this._coeffs.length === 0;
  }
  normalize() {
    /* Destructively simplify the polynomial */
    let coeffs = this._coeffs;
    while (coeffs.length > 0 && coeffs[coeffs.length - 1] === 0) {
      coeffs.pop();
    }
    while (coeffs.length > 0 && coeffs[0] === 0) {
      coeffs.shift();
      this._offset++;
    }
    if (this._coeffs.length === 0) {
      this._offset = 0;
    }
    return this;
  }
  toListString() {
    /* Outputs an [exponent; coefficient...] list. */
    this.normalize();
    if (this._coeffs.length === 0) {
      return "[0; 0]";
    }
    return "[" + this._offset + "; " + this._coeffs + "]";
  }

  toExpr(variable="t", exp_divisor=1) {
    /* Returns an expression as in the expr module. */
    this.normalize();
    let e = expr.make_int_const(0);
    let evar = expr.make_var(variable);
    for (let i = 0; i < this._coeffs.length; i++) {
      let coeff = this._coeffs[i];
      if (coeff === 0) continue;
      let exp = i + this._offset;
      e = expr.plus(e, expr.times(expr.make_int_const(coeff),
                                  expr.pow(evar,
                                           expr.make_int_const(exp, exp_divisor))));
    }
    return e;
  }

  add(p2, c=1, exp_offset=0) {
    /* assumes both polynomials are simplified. returns a simplified
       polynomial. calculates this + c*p2*t^exp_offset. */
    assert(p2 instanceof Laurent);
    let p1 = this;
    if (p1._coeffs.length === 0) {
      return p2.simple_mul(c, exp_offset);
    }
    if (p2._coeffs.length === 0 || c === 0) {
      return p1;
    }
    //console.log("%s.add(%s, %s, %s)", p1.toListString(), p2.toListString(), c, exp_offset);
    let minexp = Math.min(p1._offset, p2._offset + exp_offset);
    let maxexp = Math.max(p1._offset + p1._coeffs.length - 1, p2._offset + exp_offset + p2._coeffs.length - 1);

    let coeffs = new Array(maxexp - minexp + 1).fill(0);

    for (let i = 0; i < p1._coeffs.length; i++) {
      let j = i + p1._offset - minexp;
      coeffs[j] = p1._coeffs[i];
    }
    for (let i = 0; i < p2._coeffs.length; i++) {
      let j = i + p2._offset + exp_offset - minexp;
      coeffs[j] += c * p2._coeffs[i];
    }

    return new Laurent(minexp, coeffs).normalize();
  }

  mul(p2) {
    /* Assumes this and p2 are simplified. Returns this*p2, simplified.
       Does the grade-school algorithm using each term of p2.*/
    assert(p2 instanceof Laurent);
    //console.log("%s.mul(%s)", this.toListString(), p2.toListString());
    let p = Laurent.zero;
    for (let i = 0; i < p2._coeffs.length; i++) {
      let exp = i + p2._offset;
      //console.log("step (%s, %s, %s)", p.toListString(), p2._coeffs[i], exp);
      let c = p2._coeffs[i];
      if (c !== 0) {
        p = p.add(this, p2._coeffs[i], exp);
      }
      //console.log("now p = %s", p.toListString());
    }
    return p;
  }
  simple_mul(c=1, exp=0) {
    /* Returns c*this*t^exp. */
    assert(typeof c === "number" && typeof exp === "number");
    if (c === 0) {
      return Laurent.zero;
    } else if (c === 1 && exp === 0) {
      return this;
    } else {
      return new Laurent(this._offset + exp, this._coeffs.map(coeff => c * coeff));
    }
  }

  equal(p2) {
    assert(p2 instanceof Laurent);
    let p1 = this;
    if (p1._offset !== p2._offset || p1._coeffs.length !== p2._coeffs.length) {
      return false;
    }
    for (let i = 0; i < p1._coeffs.length; i++) {
      if (p1._coeffs[i] !== p2._coeffs[i]) {
        return false;
      }
    }
    return true;
  }

  negate() {
    return this.simple_mul(-1);
  }

  to_poly(preserve_degree=false) {
    /* Multiplies the Laurent polynomial so that the min degree is 0, returning a Poly. */
    this.normalize();
    if (preserve_degree) {
      assert(this._offset >= 0);
      let coeffs = new Array(this._offset).fill(0).concat(this._coeffs);
      return Poly.make(...coeffs);
    } else {
      return Poly.make(...this._coeffs);
    }
  }

  coeffs() {
    return this._coeffs.slice();
  }
  static fromCoeffs(coeffs, offset=0) {
    return new Laurent(offset, coeffs.slice());
  }

  minexp() {
    return this._offset;
  }
  maxexp() {
    return this._offset + this._coeffs.length - 1;
  }

  div_by_loop() {
    /* Divides by -t^2-t^(-2), which is important for the Kauffman bracket. */

    // divide by 1+t^4 and renormalize

    if (this._coeffs.length === 0) {
      return Laurent.zero;
    }

    let coeffs = this.coeffs();
    let minexp = this.minexp();
    let q = [];
    let state = [0,0,0,0];
    for (let i = 0; i < coeffs.length; i++) {
      let a = coeffs[i] - state[3];
      state.pop();
      state.unshift(a);
      q.push(-a);
    }
    assert(state.every(x => x === 0));
    return new Laurent(minexp + 2, q).normalize();
  }

  gcd(p2) {
    /* Compute the gcd of two Laurent polynomials with integer coefficients */
    assert(p2 instanceof Laurent);

    return Laurent.fromCoeffs([...this.to_poly().gcd(p2.to_poly())]);
  }

  toString() {
    return "Laurent.fromCoeffs(" + toString(this._coeffs) + ", " + this._offset + ")";
  }

  // Making this a NumberSystem
  static add(a, b) {
    return a.add(b);
  }
  static mul(a, b) {
    return a.mul(b);
  }
  static negate(a) {
    return a.simple_mul(-1, 0);
  }
  static incl(v) {
    /* The natural inclusion of the base field. */
    assert(typeof v === "number");
    if (v === 0) {
      return new Laurent(0, []);
    } else {
      return new Laurent(0, [v]);
    }
  }

  static is_zero(a) {
    return a.is_zero();
  }
}

Laurent.zero = Laurent.incl(0);
Laurent.unit = Laurent.incl(1);
Laurent.t = Laurent.fromCoeffs([1],1);
Laurent.tinv = Laurent.fromCoeffs([1],-1);
