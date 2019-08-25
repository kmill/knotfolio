// Plain polynomials, stored as lists of coefficients.
// For routines like GCD, assumes these are polynomials with integer coefficients.

import {assert, SimpleType} from "./util.mjs";
import {gcd} from "./integers.mjs";
import Q from "./kq.mjs";

export class Poly extends SimpleType {
  copy() {
    return this.slice();
  }
  normalize() {
    /* Normalize the polynomial representation in place */
    while (this.length > 0 && this[this.length - 1] === 0) {
      this.pop();
    }
    return this;
  }
  degree() {
    /* The degree of the polynomial.  The constant-zero polynomial has degree -1. */
    this.normalize();
    return this.length - 1;
  }
  is_zero() {
    return this.length === 0;
  }
  leading_coeff() {
    if (this.length === 0) {
      return 0;
    } else {
      return this[this.length - 1];
    }
  }
  is_monic(allow_negative=false) {
    if (this.length > 0) {
      let c = this[this.length - 1];
      if (allow_negative) {
        c = Math.abs(c);
      }
      return c === 1;
    } else {
      return false;
    }
  }
  min_exp() {
    /* Returns the number of times x divides the polynomial.  If this===0, then returns Infinity. */
    if (this.length === 0) {
      return Infinity;
    } else {
      for (let i = 0; i < this.length; i++) {
        if (this[i] !== 0) {
          return i;
        }
      }
      return assert(false);
    }
  }
  mul_x(s) {
    /* Multiplies by x^s.  Allowed to be negative. */
    if (this.length === 0) {
      return Poly.zero;
    } else if (s >= 0) {
      let p = this.slice();
      for (let i = 0; i < s; i++) {
        p.unshift(0);
      }
      return p;
    } else {
      let p = this.slice();
      s = -s;
      for (let i = 0; i < s; i++) {
        let c = p.shift();
        assert(c === 0);
      }
      return p;
    }
  }
  add(p2) {
    /* Adds this polynomial to p2. */
    assert(p2 instanceof Poly);
    let p1 = this;
    if (p1.length < p2.length) {
      [p1, p2] = [p2, p1];
    }
    let p = p1.slice();
    for (let i = 0; i < p2.length; i++) {
      p[i] += p2[i];
    }
    return p.normalize();
  }
  mul(p2) {
    /* Multiply this polynomial by p2. Assumes both are normalized. */
    assert(p2 instanceof Poly);
    let p1 = this;
    if (p1.length === 0 || p2.length === 0) {
      return Poly.zero;
    }
    let p = new Poly(p1.length + p2.length - 1);
    p.fill(0);
    for (let i1 = 0; i1 < p1.length; i1++) {
      for (let i2 = 0; i2 < p2.length; i2++) {
        p[i1 + i2] += p1[i1] * p2[i2];
      }
    }
    return p; // no need to normalize
  }
  scale(c) {
    /* Gives the polynomial times the scalar c. */
    assert(typeof c === "number");
    if (c === 0) {
      return Poly.zero;
    }
    return this.map(coeff => coeff * c);
  }

  content() {
    /* The content of a polynomial is the GCD of its coefficients */
    return this.reduce((g, c) => gcd(g, c), 0);
  }

  z_divisible(c) {
    /* Checks whether the polynomial is divisible by the scalar c. */
    assert(typeof c === "number" && c !== 0);
    return this.every(coeff => coeff % c === 0);
  }

  gcd(p2) {
    /* Compute the gcd of this and p2, two polynomials with integer coefficients. */
    assert(p2 instanceof Poly);
    let C1 = this.slice(),
        C2 = p2.slice();
    C1.forEach(c => assert(c === (0|c)));
    C2.forEach(c => assert(c === (0|c)));

    let cont_gcd = gcd(C1.content(), C2.content());

    // denominators for C1 and C2
    let d1 = 1;
    let d2 = 1;

    function normalize_and_swap() {
      C1.normalize();
      if (C1.length === 0) {
        d1 = 1;
      } else {
        let q = C1.content();
        q *= Math.sign(C1[C1.length - 1]);
        for (let i = 0; i < C1.length; i++) {
          C1[i] /= q;
        }
        d1 = C1[C1.length - 1];
      }
      C2.normalize();
      if (C2.length === 0) {
        d2 = 1;
      } else {
        let q = C2.content();
        q *= Math.sign(C2[C2.length - 1]);
        for (let i = 0; i < C2.length; i++) {
          C2[i] /= q;
        }
        d2 = C2[C2.length - 1];
      }
      if (C1.length < C2.length) {
        [C1,d1, C2,d2] = [C2,d2, C1,d1];
      }
      let d_gcd = gcd(d1, d2);
      d1 /= d_gcd;
      d2 /= d_gcd;
    }

    normalize_and_swap();

    while (C2.length > 0) {
      for (let i = 0; i < C1.length; i++) {
        C1[i] *= d2;
      }
      let k = C1.length - C2.length;
      for (let i = 0; i < C2.length; i++) {
        C1[i + k] -= d1 * C2[i];
      }
      normalize_and_swap();
    }

    for (let i = 0; i < C1.length; i++) {
      C1[i] = C1[i] * cont_gcd;
    }

    return C1;
  }

  static incl(c) {
    /* The natural inclusion from the base ring. */
    return Poly.make(c);
  }
}

Poly.zero = Poly.make();
Poly.unit = Poly.make(1);
