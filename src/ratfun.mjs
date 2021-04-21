// Rational functions, as pairs of polynomials

import {assert, SimpleType} from "./util.mjs";
import {Poly} from "./poly.mjs";
import {Laurent, LTerm} from "./laurent.mjs";

export class RatFun {
  constructor (p, q) {
    assert(p instanceof Poly);
    assert(q instanceof Poly);

    if (p.is_zero()) {
      this.p = Poly.zero;
      this.q = Poly.unit;
      return;
    }
    if (q.is_unit()) {
      this.p = p;
      this.q = Poly.unit;
      return;
    }

    let d = p.gcd(q);
    this.p = p.divide(d);
    this.q = q.divide(d);

    if (this.q.leading_coeff() < 0) {
      this.p = this.p.scale(-1);
      this.q = this.q.scale(-1);
    }
  }

  toString() {
    return "new RatFun(" + this.p + ", " + this.q + ")";
  }

  is_zero() {
    return this.p.is_zero();
  }

  add(f2) {
    assert(f2 instanceof RatFun);
    return new RatFun(this.p.mul(f2.q).add(this.q.mul(f2.p)),
                      this.q.mul(f2.q));
  }

  scale(c) {
    return new RatFun(this.p.scale(c), this.q);
  }

  mul(f2) {
    assert(f2 instanceof RatFun);
    let h1 = new RatFun(this.p, f2.q),
        h2 = new RatFun(f2.p, this.q);
    return new RatFun(h1.p.mul(h2.p), h1.q.mul(h2.q));
  }

  div(f2) {
    assert(f2 instanceof RatFun);
    let h1 = new RatFun(this.p, f2.p),
        h2 = new RatFun(f2.q, this.q);
    return new RatFun(h1.p.mul(h2.p), h1.q.mul(h2.q));
  }

  recip() {
    return new RatFun(this.q, this.p);
  }

  static incl(c) {
    return RatFun.from_poly(Poly.incl(c));
  }

  static from_poly(p) {
    assert(p instanceof Poly);
    return new RatFun(p, Poly.unit);
  }
  static from_laurent(p) {
    assert(p instanceof Laurent);
    
    if (p.minexp() < 0) {
      return new RatFun(p.to_poly(),
                        Poly.incl(1).mul_x(-p.minexp()));      
    } else {
      return RatFun.from_poly(p.to_poly(true));
    }
  }
}
RatFun.unit = RatFun.incl(1);
RatFun.zero = RatFun.incl(0);
