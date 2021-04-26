// Some symbolic expressions, mainly for the purpose of pretty printing.

import {assert, SimpleType, toString} from "./util.mjs";
import {gcd} from "./integers.mjs";
import Q from "./kq.mjs";

function is_zero(e) {
  return e instanceof IntConst && e[0] === 0;
}

function is_one(e) {
  return e instanceof IntConst && e[0] === 1 && e[1] === 1;
}

class ExprType extends SimpleType {
  toMathematica() {
    return toMathematica(this);
  }
  toDOM() {
    return toDOM(this);
  }
}

class Const extends ExprType {
  static make(s) {
    assert(typeof s === "string");
    let o = new Const();
    o.push(s);
    return o;
  }
  simplify() {
    return this;
  }
}

class IntConst extends ExprType {
  simplify() {
    return this;
  }
  static make(a, b=1) {
    let d = gcd(a, b);
    a /= d;
    b /= d;
    if (b < 0) {
      a = -a;
      b = -b;
    }
    if (a === 0) {
      b = 1;
    }
    return new IntConst(a, b);
  }
  neg() {
    return IntConst.make(-this[0], this[1]);
  }
}

class Var extends ExprType {
  simplify() {
    return this;
  }
}

class Plus extends ExprType {
  simplify() {
    let i = 0;
    while (i < this.length) {
      this[i] = this[i].simplify();
      if (is_zero(this[i])) {
        this.splice(i, 1);
      } else if (this[i] instanceof Plus) {
        this.splice(i, 1, ...this[i]);
      } else {
        i++;
      }
    }
    if (this.length === 0) {
      return make_int_const(0);
    }
    if (this.length === 1) {
      return this[0];
    }
    return this;
  }
}

class Times extends ExprType {
  simplify() {
    let c = 1, denom = 1;
    let i = 0;
    while (i < this.length) {
      this[i] = this[i].simplify();
      if (is_zero(this[i])) {
        return this[i];
      } else if (this[i] instanceof IntConst) {
        c *= this[i][0];
        denom *= this[i][1];
        this.splice(i, 1);
      } else if (this[i] instanceof Times) {
        this.splice(i, 1, ...this[i]);
      } else {
        i++;
      }
    }
    if (c !== denom) {
      this.unshift(make_int_const(c, denom));
    }
    if (this.length === 0) {
      return make_int_const(1);
    }
    if (this.length === 1) {
      return this[0];
    }
    return this;
  }
}

class Pow extends ExprType {
  simplify() {
    this[0] = this[0].simplify();
    this[1] = this[1].simplify();
    if (is_one(this[1])) {
      return this[0];
    } else if (is_zero(this[1])) {
      return make_int_const(1);
    } else {
      return this;
    }
  }
}

export function make_int_const(a, b=1) {
  return IntConst.make(a, b);
}

export function make_const(s) {
  assert(typeof s === "string");
  return Const.make(s);
}

export function plus(...xs) {
  return Plus.make(...xs).simplify();
}

export function times(...xs) {
  return Times.make(...xs).simplify();
}

export function pow(a, b) {
  return Pow.make(a, b).simplify();
}

export function make_var(v) {
  return Var.make(v);
}

const LIT_PREC = 20,
      POW_PREC = 15,
      NEG_PREC = 13,
      DIV_PREC = 12,
      TIMES_PREC = 10,
      PLUS_PREC = 5;

function parens(oprec, a) {
  if (oprec < a.prec) {
    return a.s;
  } else {
    return "(" + a.s + ")";
  }
}

function toMathPrec(o) {
  if (o instanceof IntConst) {
    if (o[1] !== 1) {
      return {prec: DIV_PREC, s: ''+o[0] + "/" + o[1]};
    } else if (o[0] < 0) {
      return {prec: NEG_PREC, s: ''+o[0]};
    } else {
      return {prec: LIT_PREC, s: ''+o[0]};
    }
  } else if (o instanceof Const) {
    return {prec: LIT_PREC, s: o[0]};
  } else if (o instanceof Var) {
    return {prec: LIT_PREC, s: ''+o[0]};
  } else if (o instanceof Pow) {
    return {prec: POW_PREC,
            s: parens(POW_PREC, toMathPrec(o[0])) + "^" + parens(POW_PREC, toMathPrec(o[1]))};
  } else if (o instanceof Times) {
    let neg = false;
    if (o[0] instanceof IntConst && o[0][0] === -1 && o[0][1] === 1) {
      neg = true;
      o = Array.from(o);
      o.shift();
    }
    return {prec: TIMES_PREC,
            s: (neg ? "-" : "") + o.map(part => parens(TIMES_PREC, toMathPrec(part))).join(" ")};
  } else if (o instanceof Plus) {
    let parts = o.map((part, i) => {
      let neg = false;
      if (i > 0 && part instanceof Times && part[0] instanceof IntConst && part[0][0] < 0) {
        neg = true;
        part = times(part[0].neg(), part.slice(1));
      } else if (i > 0 && part instanceof IntConst && part[0] < 0) {
        neg = true;
        part = part.neg();
      }
      return {neg: neg,
              s: parens(PLUS_PREC, toMathPrec(part))};
    });
    let s = "";
    parts.forEach(spec => {
      if (spec.neg) {
        s += " - " + spec.s;
      } else if (s.length > 0) {
        s += " + " + spec.s;
      } else {
        s += spec.s;
      }
    });
    return {prec: PLUS_PREC,
            s: s};
  } else {
    assert(false);
    throw new Error("Invalid expression");
  }
}

function toMathematica(o) {
  return parens(-1, toMathPrec(o));
}



function dparens(oprec, a) {
  if (oprec < a.prec) {
    return a.dom;
  } else {
    return ["(", ...a.dom, ")"];
  }
}

function toDOMPrec(o) {
  if (o instanceof IntConst) {
    if (o[1] !== 1) {
      return {prec: DIV_PREC, dom: [(o[0] < 0 ? '\u2212' : '') + Math.abs(o[0]) + "/" + o[1]]};
    } else if (o[0] < 0) {
      return {prec: NEG_PREC, dom: ['\u2212'+(-o[0])]};
    } else {
      return {prec: LIT_PREC, dom: [''+o[0]]};
    }
  } else if (o instanceof Const) {
    return {prec: LIT_PREC, dom: [o[0]]};
  } else if (o instanceof Var) {
    return {prec: LIT_PREC, dom: [Q.create("var", ''+o[0])]};
  } else if (o instanceof Pow) {
    return {prec: LIT_PREC,
            dom: [dparens(POW_PREC, toDOMPrec(o[0])),
                  Q.create("sup", {}, dparens(-1, toDOMPrec(o[1])))]};
  } else if (o instanceof Times) {
    let neg = false;
    if (o[0] instanceof IntConst && o[0][0] === -1 && o[0][1] === 1) {
      neg = true;
      o = Array.from(o);
      o.shift();
    }
    let res = [];
    if (neg) {
      res.push("\u2212");
    }
    o.forEach((part, i) => {
      if (i > 0) {
        res.push(" ");
      }
      res.push(dparens(TIMES_PREC, toDOMPrec(part)));
    });
    return {prec: TIMES_PREC, dom: res};
  } else if (o instanceof Plus) {
    let parts = o.map((part, i) => {
      let neg = false;
      if (i > 0 && part instanceof Times && part[0] instanceof IntConst && part[0][0] < 0) {
        neg = true;
        part = times(part[0].neg(), part.slice(1));
      } else if (i > 0 && part instanceof IntConst && part[0] < 0) {
        neg = true;
        part = part.neg();
      }
      return {neg: neg,
              dom: dparens(PLUS_PREC, toDOMPrec(part))};
    });
    let res = [];
    parts.forEach(spec => {
      if (spec.neg) {
        res.push(" \u2212 ", spec.dom);
      } else if (res.length > 0) {
        res.push(" + ", spec.dom);
      } else {
        res.push(spec.dom);
      }
    });
    return {prec: PLUS_PREC,
            dom: res};
  } else {
    assert(false);
    throw new Error("Invalid expression");
  }
}

function toDOM(o) {
  return Q.create("span", {}, dparens(-1, toDOMPrec(o)));
}
