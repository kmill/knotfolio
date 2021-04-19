import {assert, SimpleType} from "./util.mjs";
import {gcd} from "./integers.mjs";
import {Poly} from "./poly.mjs";
import Q from "./kq.mjs";

// A Laurent polynomial is a Laurent list of LTerms.

export class LTerm {
  constructor(coeff, exp) {
    this.coeff = coeff;
    this.exp = exp;
  }
  equal(term2) {
    assert(term2 instanceof LTerm);
    return this.coeff === term2.coeff && this.exp === term2.exp;
  }
  static make(coeff, exp) {
    assert(arguments.length === 2);
    return new this(coeff, exp);
  }
  toString() {
    return "LTerm.make(" + this.coeff + ", " + this.exp + ")";
  }
}

export class Laurent extends SimpleType {
  copy() {
    return this.slice(); // ok since terms are immutable
  }
  is_zero() {
    return this.length === 0;
  }
  normalize() {
    /* Destructively simplify the polynomial */
    this.sort((t1, t2) => t1.exp - t2.exp);
    let i = 0;
    while (i < this.length) {
      let t1 = this[i];
      let sum = t1.coeff;
      let j = i + 1;
      while (j < this.length && this[j].exp === t1.exp) {
        sum += this[j].coeff;
        j++;
      }
      if (sum === 0) {
        this.splice(i, j-i);
      } else if (j > i + 1) {
        this[i] = LTerm.make(sum, t1.exp);
        if (j-i-1 > 0) {
          this.splice(i+1, j-i-1);
        }
        i++;
      } else {
        i++;
      }
    }
    return this;
  }
  toListString() {
    /* Outputs an [exponent; coefficient...] list. */
    this.normalize();
    if (this.length === 0) {
      return "[0; 0]";
    }
    let minexp = this[0].exp;
    let coeffs = [];
    this.forEach(term => {
      coeffs[term.exp-minexp] = term.coeff;
    });
    for (let i = 0; i < coeffs.length; i++) {
      if (coeffs[i] === void 0) {
        coeffs[i] = 0;
      }
    }
    return "[" + minexp + "; " + coeffs + "]";
  }
  toMathematica(variable="t", exp_divisor=1) {
    this.normalize();
    if (this.length === 0) {
      return "0";
    }
    let s = "";
    function form_exp(exp) {
      if (exp === 1) {
        return "";
      } else if (Math.floor(exp) === exp) {
        return "^"+exp;
      } else {
        return "^("+(exp*exp_divisor)+"/"+exp_divisor+")";
      }
    }
    for (let i = this.length-1; i >= 0; i--) {
      let term = this[i];
      let exp = term.exp/exp_divisor;
      if (term.coeff > 0) {
        if (s.length !== 0) {
          s += " + ";
        }
        if (term.coeff === 1 && exp === 0) {
          s += "1";
        } else {
          if (term.coeff !== 1) {
            s += term.coeff;
          }
          if (exp !== 0) {
            s += variable + form_exp(exp);
          }
        }
      } else if (term.coeff === -1) {
        if (s.length === 0) {
          s += "-";
        } else {
          s += " - ";
        }
        if (exp === 0) {
          s += "1";
        } else {
          s += variable + form_exp(exp);
        }
      } else {
        if (s.length === 0) {
          s += term.coeff;
        } else {
          s += " - " + (-term.coeff);
        }
        if (exp !== 0) {
          s += variable + form_exp(exp);
        }
      }
    }
    return s;
  }

  toDOM(variable="t", exp_divisor=1) {
    this.normalize();
    if (this.length === 0) {
      return "0";
    }
    let s = [];
    function form_exp(exp) {
      function with_neg(v) {
        if (v < 0) {
          return "\u2212" + (-v);
        } else {
          return ''+v;
        }
      }
      if (exp === 1) {
        // ""
      } else if (Math.floor(exp) === exp) {
        s.push(Q.create("sup", with_neg(exp)));
      } else {
        s.push(Q.create("sup", with_neg(exp*exp_divisor)+"/"+exp_divisor));
      }
    }
    function add_var() {
      s.push(Q.create("var", variable));
    }
    for (let i = this.length-1; i >= 0; i--) {
      let term = this[i];
      let exp = term.exp/exp_divisor;
      if (term.coeff > 0) {
        if (s.length !== 0) {
          s.push(" + ");
        }
        if (term.coeff === 1 && exp === 0) {
          s.push("1");
        } else {
          if (term.coeff !== 1) {
            s.push(''+term.coeff);
          }
          if (exp !== 0) {
            add_var();
            form_exp(exp);
          }
        }
      } else if (term.coeff === -1) {
        if (s.length === 0) {
          s.push("\u2212");
        } else {
          s.push(" \u2212 ");
        }
        if (exp === 0) {
          s.push("1");
        } else {
          add_var();
          form_exp(exp);
        }
      } else {
        if (s.length === 0) {
          s.push('' + term.coeff);
        } else {
          s.push(" \u2212 " + (-term.coeff));
        }
        if (exp !== 0) {
          add_var();
          form_exp(exp);
        }
      }
    }
    return Q.create("span", null, ...s);
  }


  add(p2, c=1, exp_offset=0) {
    /* assumes both polynomials are simplified. returns a simplified
       polynomial. calculates this + c*p2*t^exp_offset. */
    assert(p2 instanceof Laurent);
    let p1 = this;
    let p = Laurent.make();
    let i1 = 0, i2 = 0;
    while (i1 < p1.length && i2 < p2.length) {
      let t1 = p1[i1], t2 = p2[i2];
      if (t1.exp < t2.exp+exp_offset) {
        p.push(t1);
        i1++;
      } else if (t1.exp > t2.exp+exp_offset) {
        p.push(LTerm.make(c*t2.coeff, t2.exp+exp_offset));
        i2++;
      } else {
        let sum = t1.coeff+c*t2.coeff;
        if (sum !== 0) {
          p.push(LTerm.make(sum, t1.exp));
        }
        i1++;
        i2++;
      }
    }
    for (; i1 < p1.length; i1++) {
      p.push(p1[i1]);
    }
    for (; i2 < p2.length; i2++) {
      let t2 = p2[i2];
      p.push(LTerm.make(c*t2.coeff, t2.exp+exp_offset));
    }
    return p;
  }

  mul(p2) {
    /* Assumes this and p2 are simplified. Returns this*p2, simplified.
       Does the grade-school algorithm using each term of p2.*/
    assert(p2 instanceof Laurent);
    let p = Laurent.make();
    p2.forEach(t => {
      p = p.add(this, t.coeff, t.exp);
    });
    return p;
  }
  simple_mul(c=1, exp=0) {
    /* Returns c*this*t^exp. */
    assert(typeof c === "number" && typeof exp === "number");
    if (c === 0) {
      return Laurent.zero;
    }
    let p = Laurent.make();
    this.forEach(t => {
      p.push(LTerm.make(c*t.coeff, exp+t.exp));
    });
    return p;
  }

  negate() {
    return this.simple_mul(-1);
  }

  to_poly(preserve_degree=false) {
    /* Multiplies the Laurent polynomial so that the min degree is 0, returning a Poly. */
    if (this.length === 0) {
      return Poly.zero;
    } else {
      let minexp = this[0].exp;
      if (preserve_degree) {
        assert(minexp >= 0);
        minexp = 0;
      }
      let coeffs = Poly.make();
      this.forEach(term => {
        coeffs[term.exp-minexp] = term.coeff;
      });
      for (let i = 0; i < coeffs.length; i++) {
        if (coeffs[i] === void 0) {
          coeffs[i] = 0;
        }
      }
      return coeffs;
    }
  }

  coeffs() {
    if (this.length === 0) {
      return [];
    } else {
      let minexp = this[0].exp;
      let coeffs = [];
      this.forEach(term => {
        coeffs[term.exp-minexp] = term.coeff;
      });
      for (let i = 0; i < coeffs.length; i++) {
        if (coeffs[i] === void 0) {
          coeffs[i] = 0;
        }
      }
      return coeffs;
    }
  }
  static fromCoeffs(coeffs, offset=0) {
    let p = Laurent.make();
    for (let i = 0; i < coeffs.length; i++) {
      if (coeffs[i] !== 0) {
        p.push(LTerm.make(coeffs[i], i + offset));
      }
    }
    return p;
  }

  minexp() {
    if (this.length === 0) {
      return 0; // or is it -Infinity? (0 is practical.)
    } else {
      return this[0].exp;
    }
  }

  div_by_loop() {
    /* Divides by -t^2-t^(-2), which is important for the Kauffman bracket. */

    // divide by 1+t^4 and renormalize

    if (this.length === 0) {
      return Laurent.zero;
    }

    let coeffs = this.coeffs();
    let minexp = this.minexp();
    let q = Laurent.make();
    let state = [0,0,0,0];
    for (let i = 0; i < coeffs.length; i++) {
      let a = coeffs[i] - state[3];
      state.pop();
      state.unshift(a);
      if (a !== 0) {
        q.push(LTerm.make(-a, i + minexp + 2));
      }
    }
    assert(state.every(x => x === 0));
    return q;
  }

  gcd(p2) {
    /* Compute the gcd of two Laurent polynomials with integer coefficients */
    assert(p2 instanceof Laurent);

    return Laurent.fromCoeffs(this.to_poly().gcd(p2.to_poly()));
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
    return Laurent.make(LTerm.make(v, 0));
  }
  static is_zero(a) {
    return a.is_zero();
  }
}

Laurent.zero = Laurent.make();
Laurent.unit = Laurent.make(LTerm.make(1,0));
Laurent.t = Laurent.make(LTerm.make(1,1));
Laurent.tinv = Laurent.make(LTerm.make(1,-1));
