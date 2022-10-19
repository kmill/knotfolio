'use strict';

function assert(b) {
  /* Asserts that the argument is true. */
  if (!b) {
    debugger;
    throw new Error("assertion failed");
  }
}

function remove_value(list, value) {
  /* Removes the first occurance of value from the given list.
     Returns a boolean indicating whether a value was removed. */
  let idx = list.indexOf(value);
  if (idx >= 0) {
    list.splice(idx, 1);
    return true;
  } else {
    return false;
  }
}

// // Changing the prototype!
// Function.prototype.def_methods = function (source) {
//   /* Define prototype methods, copied from the source object. */
//   for (var key in source) {
//     if (Object.prototype.hasOwnProperty.call(source, key)) {
//       this.prototype[key] = source[key];
//     }
//   }
//   return this;
// };

function equal(a, b) {
  /* A structural equality function that looks for an equals method
     on the first argument.  Handles arrays recursively, and otherwise
     falls back to ===. */
  if (typeof a === "object") {
    if (typeof b === "object") {
      if (a.equal) {
        return a.equal(b);
      }
      if (a instanceof Array) {
        if (!(b instanceof Array) || a.constructor !== b.constructor) {
          return false;
        }
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (!equal(a[i], b[i])) {
            return false;
          }
        }
        return true;
      }
    }
  }
  return a === b;
}

function compare(a, b) {
  /* Returns "a - b" for comparison purposes. Does lexicographical
  ordering for things that are instanceof Array after sorting by
  length. Requires that arguments have same type. */
  assert(typeof a === typeof b);
  if (typeof a === "object") {
    if (a.compare) {
      return a.compare(b);
    } else if (a instanceof Array) {
      assert(b instanceof Array);
      assert(a.constructor === b.constructor);
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      for (let i = 0; i < a.length; i++) {
        let c = compare(a[i], b[i]);
        if (c !== 0) return c;
      }
      return 0;
    } else {
      throw new TypeError;
    }
  } else if (typeof a === "number" || typeof a === "boolean") {
    return a - b;
  } else if (typeof a === "string") {
    return a.localeCompare(b);
  } else if (typeof a === "null" || typeof a === "undefined") {
    return 0;
  } else {
    throw new Error("Unexpected type " + typeof a);
  }
}

function escapeChar(c) {
  /* Given a character, returns a string that can appear in a JavaScript string literal. */
  switch (c) {
  case "\0": return "\\0";
  case "\"": return "\\\"";
  case "\\": return "\\\\";
  case "\n": return "\\n";
  case "\r": return "\\r";
  case "\v": return "\\v";
  case "\t": return "\\t";
  case "\b": return "\\b";
  case "\f": return "\\f";
  }
  var code = c.charCodeAt(0);
  if (32 <= code && code < 127) {
    return c;
  } else if (code < 256) {
    return "\\x" + (code < 0x10 ? "0" : "") + code.toString(16).toUpperCase();
  } else {
    return "\\u" + (code < 0x1000 ? "0" : "") + code.toString(16).toUpperCase();
  }
}

function toString$1(o) {
  /* Give a string representation that tries somewhat to be valid
     JavaScript code.  This is somewhat like repr in Python. */

  if (o instanceof Array && o.toString === Array.prototype.toString) {
    return "[" + o.map(toString$1).join(", ") + "]";
  } else if (typeof o === "object") {
    return o.toString();
  } else if (typeof o === "string") {
    let s = "'";
    for (let i = 0; i < o.length; i++) {
      s += escapeChar(o.charAt(i));
    }
    return s + "'";
  } else {
    return ''+o;
  }
}

class SimpleType extends Array {
  /* A Mathematica-like type where the "head" is the constructor. */
  constructor() {
    /* Extremely annoyingly, the Array constructor with one argument
       means to construct an array of a particular size.  This object
       must comply.  Use the static method make instead. */
    if (arguments.length === 1) {
      super(arguments[0]);
    } else {
      super(arguments.length);
      for (let i = 0; i < arguments.length; i++) {
        this[i] = arguments[i];
      }
    }
  }
  equal(b) {
    assert(b.constructor === this.constructor);
    if (this.length !== b.length)
      return false;
    for (let i = 0; i < this.length; i++) {
      if (!equal(this[i], b[i]))
        return false;
    }
    return true;
  }
  compare(b) {
    assert(b.constructor === this.constructor);
    if (this.length !== b.length)
      return this.length - b.length;
    for (let i = 0; i < this.length; i++) {
      let c = compare(this[i], b[i]);
      if (c !== 0) return c;
    }
    return 0;
  }
  toString() {
    return this.constructor.name + ".make(" + this.map(toString$1).join(", ") + ")";
  }

  static make(/*args*/) {
    /* A sane constructor. */
    let o = new this(arguments.length);
    for (let i = 0; i < arguments.length; i++) {
      o[i] = arguments[i];
    }
    return o;
  }
}

function clamp(val, lo, hi) {
  /* Clamps the value to the range [lo, hi]. */
  return Math.max(lo, Math.min(hi, val));
}

function hex_to_rgb(h) {
  /* Takes an 0xrrggbb integer and outputs a "#rrggbb" string */
  let b = h & 0xFF;
  h = h >>> 8;
  let g = h & 0xFF;
  h = h >>> 8;
  let r = h & 0xFF;
  function s(i) {
    if (i < 16) {
      return "0" + i.toString(16);
    } else {
      return i.toString(16);
    }
  }
  return "#" + s(r) + s(g) + s(b);
}

function gcd(a, b) {
  /* Calculates the greatest common divisor of the two arguments. */
  assert(a === (0|a));
  assert(b === (0|b));
  a = Math.abs(a);
  b = Math.abs(b);
  if (a < b) {
    [a, b] = [b, a];
  }
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

// kq - a knockoff jquery

function Q(node) {
  if (node instanceof Q) {
    return node;
  } else if (typeof node === "string") {
    return Q.query(node);
  } else if (!this || this === window) {
    return new Q(node);
  } else if (arguments.length === 0) {
    this.length = 0;
  } else if (node === null) {
    this.length = 0;
  } else if (node instanceof Element || node === window) {
    this[0] = node;
    this.length = 1;
  } else if (node instanceof NodeList) {
    this.length = node.length;
    for (let i = 0; i < node.length; i++) {
      this[i] = node[i];
    }
  } else if (node instanceof Array) {
    this.length = 0;
    for (let i = 0; i < node.length; i++) {
      if (node[i] instanceof Q) {
        for (let j = 0; j < node[i].length; j++) {
          this[this.length++] = node[i][j];
        }
      } else {
        this[this.length++] = node[i];
      }
    }
  } else if (typeof node === "function") {
    this[0] = window;
    this.length = 1;
    this.on('load', node);
  } else {
    throw new Error("Invalid argument to Q");
  }
}
Q.create = function (tagname, props) {
  /* Takes the tagname (a string), optionally an object of properties (or null), and finally a list of things to append. */
  let el = new Q(document.createElement(tagname));
  let i = 1;
  if (typeof props === "object" && !(props instanceof Q)) {
    i++;
    if (props) {
      for (let key in props) {
        el[0][key] = props[key];
      }
    }
  }
  for (; i < arguments.length; i++) {
    el.append(arguments[i]);
  }
  return el;
};
Q.textNode = function (s) {
  return new Q(document.createTextNode(s));
};
Q.withId = function (id) {
  return new Q(document.getElementById(id));
};
Q.query = function (q) {
  return new Q(document.querySelectorAll(q));
};
Q.prototype.query = function (q) {
  var list = new Q();
  var j = 0;
  for (var i = 0; i < this.length; i++) {
    this[i].querySelectorAll(q).forEach(e => {
      list[j++] = e;
    });
  }
  list.length = j;
  return list;
};
Q.prototype.forEach = function (f) {
  for (var i = 0; i < this.length; i++) {
    f(new Q(this[i]), i);
  }
};
Q.prototype.append = function (/*varargs*/) {
  for (let i = 0; i < arguments.length; i++) {
    let node = arguments[i];
    if (node instanceof Q) {
      node.appendTo(this);
    } else if (node instanceof Element) {
      this[0].appendChild(node);
    } else if (node instanceof Array) {
      node.forEach(n => this.append(n));
    } else {
      this[0].appendChild(document.createTextNode('' + node));
    }
  }
  return this;
};
Q.prototype.appendTo = function (node) {
  if (node instanceof Q) {
    node = node[0];
  }
  for (var i = 0; i < this.length; i++) {
    node.appendChild(this[i]);
  }
  return this;
};
Q.prototype.remove = function () {
  for (var i = 0; i < this.length; i++) {
    if (this[i].parentNode !== null) {
      this[i].parentNode.removeChild(this[i]);
    }
  }
  return this;
};
Q.prototype.addClass = function (cls) {
  for (var i = 0; i < this.length; i++) {
    this[i].classList.add(cls);
  }
  return this;
};
Q.prototype.removeClass = function (cls) {
  for (var i = 0; i < this.length; i++) {
    this[i].classList.remove(cls);
  }
  return this;
};
Q.prototype.toggleClass = function (cls, /*opt*/toggle) {
  for (var i = 0; i < this.length; i++) {
    if (arguments.length >= 2) {
      this[i].classList.toggle(cls, toggle);
    } else {
      this[i].classList.toggle(cls);
    }
  }
  return this;
};
Q.prototype.on = function (event, handler, useCapture) {
  var events = event.split(' ');
  for (var j = 0; j < events.length; j++) {
    if (events[j] !== '') {
      for (var i = 0; i < this.length; i++) {
        this[i].addEventListener(events[j], handler, !!useCapture);
      }
    }
  }
  return this;
};
Q.prototype.off = function (event, handler) {
  var events = event.split(' ');
  for (var j = 0; j < events.length; j++) {
    if (events[j] !== '') {
      for (var i = 0; i < this.length; i++) {
        this[i].removeEventListener(events[j], handler);
      }
    }
  }
  return this;    
};
Q.prototype.empty = function () {
  for (var i = 0; i < this.length; i++) {
    var node = this[i];
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }
  return this;
};
Q.prototype.attr = function (k, /*opt*/v) {
  if (arguments.length === 1) {
    return this[0].getAttribute(k);
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i].setAttribute(k, v);
    }
    return this;
  }
};
Q.prototype.prop = function (k, /*opt*/v) {
  if (arguments.length === 1) {
    return this[0][k];
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i][k] = v;
    }
    return this;
  }
};
Q.prototype.value = function (/*opt*/v) {
  if (arguments.length === 0) {
    return this[0].value;
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i].value = v;
    }
    return this;
  }
};
Q.prototype.css = function (k, /*opt*/v) {
  if (arguments.length === 1) {
    return this[0].style[k];
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i].style[k] = v;
    }
    return this;
  }
};

function tag(tagname) {
  Q[tagname] = function () {
    return Q.create(tagname, ...arguments);
  };
}

tag('div'); tag('span');
tag('p');
tag('ol'); tag('ul'); tag('li');
tag('sup');
tag('a');

// Plain polynomials, stored as lists of coefficients.

class Poly extends SimpleType {
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
  is_unit() {
    return this.length === 1 && this[0] === 1;
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

  divide(q) {
    /* Divide by the polynomial q, returning the quotient. */
    assert(q instanceof Poly);
    assert(q.degree() >= 0);
    if (q.degree() === 0) {
      return this.map(c => c / q[0]);
    }
    let q_lead = q.leading_coeff();
    let r = this;
    let d = Poly.zero;
    while (true) {
      let i = r.degree() - q.degree();
      if (i < 0) break;
      let c = r.leading_coeff() / q_lead;
      d = d.add(Poly.incl(c).mul_x(i));
      r = r.add(q.scale(-c).mul_x(i));
    }
    // now this == q * d + r
    //console.log("divided " + this + " by " + q);
    //console.log("  got " + d + " rem " + r);
    return d;
  }

  static incl(c) {
    /* The natural inclusion from the base ring. */
    return Poly.make(c);
  }
}

Poly.zero = Poly.make();
Poly.unit = Poly.make(1);

// Some symbolic expressions, mainly for the purpose of pretty printing.

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

function make_int_const(a, b=1) {
  return IntConst.make(a, b);
}

function plus(...xs) {
  return Plus.make(...xs).simplify();
}

function times(...xs) {
  return Times.make(...xs).simplify();
}

function pow(a, b) {
  return Pow.make(a, b).simplify();
}

function make_var(v) {
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

// A Laurent polynomial is a list of coefficients and an offset.

class Laurent {
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
    let e = make_int_const(0);
    let evar = make_var(variable);
    for (let i = 0; i < this._coeffs.length; i++) {
      let coeff = this._coeffs[i];
      if (coeff === 0) continue;
      let exp = i + this._offset;
      e = plus(e, times(make_int_const(coeff),
                                  pow(evar,
                                           make_int_const(exp, exp_divisor))));
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
    return new Laurent(offset, coeffs.slice()).normalize();
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

// Planar diagrams

class PD extends SimpleType {
  toMathematica() {
    return "PD[" + this.map(x => x.toMathematica()).join(", ") + "]";
  }
  toSnappy() {
    /* Gives the unoriented PD (Xp and Xm degrade to X). */
    let crossings = this.map(x => {
      if (x instanceof P) {
        throw new Error("SnapPy doesn't support P paths");
      } else {
        return x.toSnappy();
      }
    });
    return "Link([" + crossings.join(", ") + "])";
  }
}

class X extends SimpleType {
  static make(a, b, c, d) {
    /* Represents a crossing like
       
         c \ / b
            /
         d / \ a

       where a, b, c, and d are edge ids.
    */

    assert(arguments.length === 4);
    return super.make(a, b, c, d);
  }
  toMathematica() {
    return "X[" + this.join(",") + "]";
  }
  toSnappy() {
    return "(" + this.join(",") + ")";
  }
}

class P extends SimpleType {
  static make(a, b) {
    /* Represents a path between edge ids a and b. */
    assert(arguments.length === 2);
    return super.make(a, b);
  }
  toMathematica() {
    return "P[" + this.join(",") + "]";
  }
}

class Xp extends X {
  /* Represents a right-handed oriented crossing like
       
       c ^ ^ b
          /
       d / \ a

     where a, b, c, and d are edge ids. */

  toMathematica() {
    return "Xp[" + this.join(",") + "]";
  }
}

class Xm extends X {
  /* Represents a left-handed oriented crossing like
       
       d ^ ^ c
          \
       a / \ b

     where a, b, c, and d are edge ids. */

  toMathematica() {
    return "Xm[" + this.join(",") + "]";
  }
}

class Virtual extends SimpleType {
  static make(a, b, c, d) {
    /* Represents a virtual crossing like

         c \ / b
            O
         d / \ a

       where a, b, c, and d are edge ids.
    */

    assert(arguments.length === 4);
    return super.make(a, b, c, d);
  }
  toMathematica() {
    let [a, b, c, d] = this;
    return "P[" + a + "," + c + "], P[" + b + "," + d + "]";
  }
  toSnappy() {
    let [a, b, c, d] = this;
    return "(" + a + "," + c + "), (" + b + "," + d + ")";
  }
}

function pd_eliminate_paths(diagram) {
  /* Takes a PD diagram, returns {unknots: int, diagram: PD}, where
  the resulting diagram has no P or Virtual entities anymore. */
  assert(diagram instanceof PD);

  let n_unknots = 0;
  diagram = diagram.map(entity => entity.slice());

  function join(a, b) {
    if (a === b) {
      n_unknots++;
    } else {
      for (let j = 0; j < diagram.length; j++) {
        diagram[j] = diagram[j].map(arc => arc === b ? a : arc);
      }
    }
  }

  for (let i = 0; i < diagram.length;) {
    let entity = diagram[i];
    if (entity.constructor === P) {
      join(entity[0], entity[1]);
      diagram.splice(i, 1);
    } else if (entity.constructor === Virtual) {
      join(entity[0], entity[2]);
      join(entity[1], entity[3]);
      diagram.splice(i, 1);
    } else {
      i++;
    }
  }

  return {
    unknots: n_unknots,
    diagram: diagram
  };
}

function pd_first_free_id(diagram) {
  assert(diagram instanceof PD);
  let free_id = 1;
  diagram.forEach(entity => {
    entity.forEach(i => {
      free_id = Math.max(free_id, i + 1);
    });
  });
  return free_id;
}

function pd_writhe_normalize(diagram) {
  /* Given an oriented PD, returns a PD with each component having zero writhe.
     Each crossing must be an Xp or Xm node. */
  assert(diagram instanceof PD);

  let eliminated = pd_eliminate_paths(diagram);
  let n_unknots = eliminated.unknots;
  diagram = eliminated.diagram;

  // Calculate writhes of components
  let arc_comps = new Map; // arc_id -> component_id (a canonical arc id)
  function arc_find(arc) {
    while (arc_comps.has(arc)) {
      arc = arc_comps.get(arc);
    }
    return arc;
  }
  function arc_join(arc1, arc2) {
    arc1 = arc_find(arc1);
    arc2 = arc_find(arc2);
    if (arc1 !== arc2) {
      arc_comps.set(arc2, arc1);
    }
  }
  diagram.forEach(entity => {
    if (entity.constructor === Xp || entity.constructor === Xm) {
      arc_join(entity[0], entity[2]);
      arc_join(entity[1], entity[3]);
    } else {
      throw new TypeError;
    }
  });
  let writhes = new Map;
  function update_writhe(arc, delta) {
    arc = arc_find(arc);
    if (writhes.has(arc)) {
      writhes.set(arc, writhes.get(arc) + delta);
    } else {
      writhes.set(arc, delta);
    }
  }
  diagram.forEach(entity => {
    if (arc_find(entity[0]) === arc_find(entity[1])) {
      if (entity.constructor === Xp) {
        update_writhe(entity[0], 1);
      } else {
        update_writhe(entity[1], -1);
      }
    }
  });

  let free_id = pd_first_free_id(diagram);

  let new_entities = [];
  function maybe_insert_twists(entity, idx) {
    let i = entity[idx];
    if (!writhes.has(i))
      return;
    let wr = writhes.get(i);
    writhes.delete(i);

    while (wr > 0) {
      wr--;
      let j = free_id++;
      let k = free_id++;
      new_entities.push(Xm.make(j, k, k, i));
      i = j;
    }
    while (wr < 0) {
      wr++;
      let j = free_id++;
      let k = free_id++;
      new_entities.push(Xp.make(k, k, i, j));
      i = j;
    }
    entity[idx] = i;
  }
  diagram.forEach(entity => {
    if (entity.constructor === Xp) {
      maybe_insert_twists(entity, 1);
      maybe_insert_twists(entity, 2);
    } else {
      maybe_insert_twists(entity, 2);
      maybe_insert_twists(entity, 3);
    }
  });

  diagram = diagram.concat(new_entities);

  // Reinsert unknots
  for (let i = 0; i < n_unknots; i++) {
    let a = free_id++;
    diagram.push(P.make(a, a));
  }

  return diagram;
}

function pd_form_cabling(diagram, cables) {
  diagram = pd_writhe_normalize(diagram);

  let eliminated = pd_eliminate_paths(diagram);
  let n_unknots = eliminated.unknots;
  diagram = eliminated.diagram;

  let free_id = pd_first_free_id(diagram);

  free_id = 1 + cables + cables * free_id;
  let cabled = PD.make();
  diagram.forEach(entity => {
    let idxs = [], endidxs = [];
    if (entity.constructor === Xp) {
      for (let i = 0; i < cables; i++) {
        idxs.push(cables*entity[3] + i);
        endidxs.push(cables*entity[1] + i);
      }
    } else {
      for (let i = 0; i < cables; i++) {
        idxs.push(cables*entity[3] + (cables - i - 1));
        endidxs.push(cables*entity[1] + (cables - i - 1));
      }
    }

    for (let j = 0; j < cables; j++) {
      let c = cables*entity[2] + j;
      let idxs2 = [];
      for (let i = 0; i < cables; i++) {
        let d = idxs[i];
        let b = j + 1 === cables ? endidxs[i] : free_id++;
        let a = i + 1 === cables ? cables*entity[0] + j : free_id++;
        cabled.push(entity.constructor.make(a, b, c, d));
        idxs2.push(b);
        c = a;
      }
      idxs = idxs2;
    }
  });

  // Reinsert unknots
  for (let i = 0; i < n_unknots * cables; i++) {
    let a = free_id++;
    cabled.push(P.make(a, a));
  }

  return cabled;
}

function pd_to_tangle(pd) {
  /* Open up a PD so that it is a 1-1 tangle.
     If the PD is empty, returns null.
     Otherwise, returns `{pd: tangle PD, boundary: [idx1, idx2]}`

     Assumes that the PD is a closed link. */
  assert(pd instanceof PD);

  if (pd.length === 0) {
    return null;
  }

  let idx1 = pd[0][0];
  let idx2 = pd_first_free_id(pd);

  let pd2 = pd.map(entity => entity.slice());
  pd2[0][0] = idx2;

  return {
    pd: pd2,
    boundary: [idx1, idx2]
  };
}

class Point {
  /* A point in two-dimensional Euclidean space. */
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
  copy() {
    return new Point(this.x, this.y);
  }
  toString() {
    return "new Point(" + this.x + ", " + this.y + ")";
  }

  static equal(p1, p2) {
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    return p1.x === p2.x && p1.y === p2.y;
  }

  static similar(p1, p2, error=1e-10) {
    /* Checks to see if the points are close to each other, within the
       given error in each coordinate. */
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    return Math.abs(p1.x - p2.x) < error && Math.abs(p1.y - p2.y) < error;
  }

  static dist(p1, p2) {
    /* Returns the distance between p1 and p2. */
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    var dx = p1.x - p2.x,
        dy = p1.y - p2.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  static norm_diff(p1, p2) {
    /* Gives p1 - p2, normalized.  Returns a point even though it
    should return a vector. Assumes the points are distinct. */
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    let dx = p1.x - p2.x,
        dy = p1.y - p2.y;
    let norm = Math.sqrt(dx*dx + dy*dy);
    assert(norm > 0);
    return new Point(dx/norm, dy/norm);
  }
}

function pseudo_angle(p0, p1) {
  /* Takes the ray from p0 through p1 and gives an "angle" with respect to the x-axis.  The "angle" is a monotonically increasing function of angle, and it lies in [0,1). */
  // Modified from delaunator.js
  let dx = p1.x - p0.x,
      dy = p1.y - p0.y;
  let p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy >= 0 ? 1 - p : 3 + p) / 4;
}

function segment_contains(p1, p2, q, error=1e-10) {
  return segment_distance(p1, p2, q) <= error;
}

function segment_distance(p1, p2, q) {
  /* Gives the distance from q to the line segment (p1, p2). */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  assert(q instanceof Point);
  if (Point.equal(p1, p2)) {
    return Point.dist(p1, q);
  }
  let vx = p2.x - p1.x,
      vy = p2.y - p1.y;
  let wx = q.x - p1.x,
      wy = q.y - p1.y;
  let norm2 = vx*vx + vy*vy;
  let t = (vx*wx + vy*wy)/norm2;
  if (t < 0) {
    return Point.dist(q, p1);
  } else if (t > 1) {
    return Point.dist(q, p2);
  } else {
    return Math.abs((-vy*wx + vx*wy)/Math.sqrt(norm2));
  }
}

function lines_intersect(p1, p2, q1, q2) {
  /* Checks if the lines given by the segments (p1,p2) and (q1,q2) intersect.
     Returns the intersection point if they do intersect. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  assert(q1 instanceof Point);
  assert(q2 instanceof Point);

  let a = p1, b = p2,
      c = q1, d = q2;

  let det = (a.x-b.x)*(c.y-d.y) - (a.y-b.y)*(c.x-d.x);
  if (det === 0) {
    return null;
  }
  let d1 = a.x*b.y - a.y*b.x,
      d2 = c.x*d.y - c.y*d.x;
  let pt = new Point((d1*(c.x-d.x) - d2*(a.x-b.x)) / det,
                     (d1*(c.y-d.y) - d2*(a.y-b.y)) / det);

  return pt;
}

function segments_intersect(p1, p2, q1, q2, epsilon=1e-10) {
  let pt = lines_intersect(p1, p2, q1, q2);
  if (!pt || segment_distance(p1, p2, pt) > epsilon || segment_distance(q1, q2, pt) > epsilon) {
    return null;
  } else {
    return pt;
  }
}

function point_along(p1, p2, t) {
  /* Given a line parameterized so that t=0 is p1 and t=1 is p2,
     returns the point corresponding to t. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  return new Point((1-t)*p1.x + t*p2.x,
                   (1-t)*p1.y + t*p2.y);
}

function* line_points(p1, p2) {
  /* Bresenham line drawing algorithm. Returns a generator of Points
     from p1 to p2.  The coordinates of these points are expected to
     be integers. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  
  var x1 = p1.x, y1 = p1.y,
      x2 = p2.x, y2 = p2.y;
  var dx = Math.abs(x2-x1),
      sx = x1 < x2 ? 1 : -1,
      dy = -Math.abs(y2-y1),
      sy = y1 < y2 ? 1 : -1;
  var err = dx+dy;

  while (true) {
    yield new Point(x1, y1);
    if (x1 === x2 && y1 === y2) break;
    var e2 = 2*err;
    if (e2 >= dy) { err += dy; x1 += sx; }
    if (e2 <= dx) { err += dx; y1 += sy; }
  }
}

class KnotGraph {
  constructor(verts, edges, adjs) {
    this.verts = verts; // [Point,...]
    this.edges = edges; // [[vtx id, vtx id, comp],...]
    this.adjs = adjs; // [P or X,...] where the P and X objects contain dart ids
    // a dart is edgeid+1 or -edgeid-1 depending on which side the edge is
  }

  copy() {
    return new KnotGraph(
      this.verts.map(pt => pt.copy()),
      this.edges.map(edge => edge.slice()),
      this.adjs.map(list => list.slice())
    );
  }

  consistency_check() {
    assert(this.verts.length === this.adjs.length);
    assert(this.verts.every(p => p instanceof Point));
    assert(this.edges.every(e => e.length >= 3));
    assert(this.adjs.every(a => a instanceof P || a instanceof X || a instanceof Virtual));

    let seen_darts = new Set();
    this.adjs.forEach(adj => {
      adj.forEach(dart => {
        assert(dart !== 0);
        assert(Math.abs(dart) - 1 < this.edges.length);
        seen_darts.add(dart);
      });
    });
    assert(seen_darts.size === 2 * this.edges.length);

    this.edges.forEach((edge, eid) => {
      assert(0 <= edge[0] && edge[0] < this.verts.length);
      assert(0 <= edge[1] && edge[1] < this.verts.length);
      if (this.adjs[edge[0]].includes(eid + 1)) {
        assert(this.adjs[edge[1]].includes(-eid - 1));
      } else if (this.adjs[edge[0]].includes(-eid - 1)) {
        assert(this.adjs[edge[1]].includes(eid + 1));
      } else {
        assert(false);
      }
    });
  }
  
  ensure_orientation() {
    /* Goes through edges and makes sure they are oriented so that
       [dart_start, dart_end] are the two vertices. The first edge in
       the edge list determines the orientation if there is a
       discrepancy. */
    let seen_darts = new Set();
    this.edges.forEach((edge, eid) => {
      if (seen_darts.has(eid+1) || seen_darts.has(-eid-1)) {
        return;
      }
      let dart = eid + 1;
      let d = dart;
      do {
        seen_darts.add(d);
        seen_darts.add(-d);
        let curr_edge = this.dart_edge(d);
        if (this.dart_start(d) !== curr_edge[0]) {
          d = -d;

          // swap vertices on edge
          [curr_edge[0], curr_edge[1]] = [curr_edge[1], curr_edge[0]];

          // swap darts in adj
          let adj, idx;
          adj = this.adjs[curr_edge[0]];
          idx = adj.indexOf(-d);
          assert(idx >= 0);
          adj[idx] = d;
          
          adj = this.adjs[curr_edge[1]];
          idx = adj.indexOf(d);
          assert(idx >= 0);
          adj[idx] = -d;

          assert(this.dart_start(d) === curr_edge[0]);
        }
        d = this.through_dart(d);
      } while (d !== dart);
    });
    //console.log("seen darts " + seen_darts.size);
    //console.log("edges " + this.edges.length);
    this.consistency_check();
  }
  
  reverse_orientation(dart_id) {
    /* Reverses the orientation of the entire component given by
       dart_id.  Assumes the diagram is already oriented. */
    let circuit = this.dart_circuit(dart_id);
    circuit.forEach(dart => {
      let edge = this.dart_edge(dart);
      // edge[0] is dart_start, by assumption
      
      // swap vertices on edge
      [edge[0], edge[1]] = [edge[1], edge[0]];

      // swap darts in adj
      let adj, idx;
      adj = this.adjs[edge[1]];
      idx = adj.indexOf(dart);
      assert(idx >= 0);
      adj[idx] = -dart;

      adj = this.adjs[edge[0]];
      idx = adj.indexOf(-dart);
      assert(idx >= 0);
      adj[idx] = dart;
    });
    this.consistency_check();
  }
  
  make_alternating() {
    /* Changes crossings to make this into an alternating
       diagram. Assumes the diagram is oriented.  Leaves an
       already-alternating diagram alone. */
    let seen_edges = [];
    let to_see = [];
    let visit_edges = () => {
      while (to_see.length) {
        let eid = to_see.pop();
        if (!seen_edges[eid]) {
          let sign = null;
          this.dart_circuit(eid + 1).forEach(dart => {
            seen_edges[Math.abs(dart) - 1] = true;
            let vid = this.dart_start(dart);
            let this_sign = this.adjs[vid].indexOf(dart) % 2 === 0;
            if (this.adjs[vid] instanceof X) {
              this.adjs[vid].forEach(dart => to_see.push(Math.abs(dart) - 1));
              if (sign === this_sign) {
                this.adjs[vid].push(this.adjs[vid].shift()); // rotate crossing
                this_sign = !this_sign;
              }
              sign = this_sign;
            }
          });
        }
      }
    };
    for (let i = 0; i < this.edges.length; i++) {
      if (!seen_edges[i]) {
        to_see.push(i);
        visit_edges();
      }
    }
    this.consistency_check();
  }

  is_alternating() {
    /* Returns whether this is an alternating diagram.  Assumes the diagram is oriented. */
    let seen_edges = [];
    for (let eid = 0; eid < this.edges.length; eid++) {
      if (!seen_edges[eid]) {
        let sign = null;
        let circ = this.dart_circuit(eid + 1);
        for (let di = 0; di < circ.length; di++) {
          let dart = circ[di];
          seen_edges[Math.abs(dart) - 1] = true;
          let vid = this.dart_start(dart);
          let this_sign = this.adjs[vid].indexOf(dart) % 2 === 0;
          if (this.adjs[vid] instanceof X) {
            if (sign === this_sign) {
              // Not alternating
              return false;
            }
            sign = this_sign;
          }
        }
      }
    }
    return true;
  }

  bridge_number() {
    /* Returns the bridge number (in the classical sense: the number
       of arcs that are everywhere-over) of the diagram.  Assumes the
       diagram is oriented. Split unknotted loops have bridge number 1. */
    let seen_edges = [];
    let bridges = 0;
    for (let eid = 0; eid < this.edges.length; eid++) {
      if (!seen_edges[eid]) {
        let circ = this.dart_circuit(eid + 1);
        circ.forEach(d => {
          seen_edges[Math.abs(d) - 1] = true;
        });
        if (circ.every(d => this.dart_adj(d) instanceof P || this.dart_adj(d) instanceof Virtual)) {
          bridges++;
        } else {
          circ = circ.filter(d => this.dart_adj(d) instanceof X);
          let j = 0;
          while (j < circ.length && this.dart_is_over(circ[j])) {
            j++;
          }
          if (j === circ.length) {
            // this was an unknot on top of the diagram
            bridges++;
            continue;
          }
          for (let i = 0; i < circ.length;) {
            let k = (i + j) % circ.length;
            assert(!this.dart_is_over(circ[k]));
            let cr = 0;
            while(true) {
              i++;
              k = (i + j) % circ.length;
              if (!this.dart_is_over(circ[k])) {
                break;
              }
              cr++;
            }
            if (cr > 0) {
              bridges++;
            }
          }
        }
      }
    }
    return bridges;
  }
  
  auto_color(max_colors) {
    /* Assigns colors to the components in an arbitrary order */
    assert(max_colors > 0);
    let next_color = 0;
    let seen = new Array(this.edges.length);
    for (let eid = 0; eid < this.edges.length; eid++) {
      if (!seen[eid]) {
        let color = (next_color++) % max_colors;
        this.dart_circuit(eid + 1).forEach(dart => {
          let deid = Math.abs(dart) - 1;
          seen[deid] = true;
          this.edges[deid][2] = color + 1;
        });
      }
    }
  }
  
  delete_component(dart_id) {
    /* Deletes the entire component containing the given dart. Assumes
       the diagram is oriented.*/
    let edge_ids = this.dart_circuit(dart_id).map(dart => Math.abs(dart) - 1);
    // remove edges and vertices from the graph by setting them to null, then compact
    edge_ids.forEach(eid => {
      let edge = this.edges[eid];
      remove_value(this.adjs[edge[0]], eid+1);
      remove_value(this.adjs[edge[0]], -eid-1);
      remove_value(this.adjs[edge[1]], eid+1);
      remove_value(this.adjs[edge[1]], -eid-1);
      this.edges[eid] = null;
    });
    this.compact();
  }
  
  compact() {
    /* The edge and vertex lists are allowed to have nulls.  Deletes
       any degree-0 vertices, and renumbers everything so there are no
       nulls. */
    let newverts = [];
    for (let i = 0; i < this.verts.length; i++) {
      if (this.adjs[i] && this.adjs[i].length === 0) {
        this.verts[i] = null;
      } else if (this.verts[i] !== null) {
        let new_vid = newverts.length;
        newverts.push(this.verts[i]);
        this.verts[i] = new_vid; // store forwarding pointer
      }
    }
    let newedges = [];
    for (let i = 0; i < this.edges.length; i++) {
      let edge = this.edges[i];
      if (edge !== null) {
        let new_eid = newedges.length;
        this.edges[i] = new_eid; // store forwarding pointer
        newedges.push([this.verts[edge[0]], this.verts[edge[1]], edge[2]]);
      }
    }
    let newadjs = [];
    for (let i = 0; i < this.verts.length; i++) {
      let adj = this.adjs[i];
      if (this.verts[i] !== null) {
        let adj2 = [];
        adj.forEach(dart => {
          let fwd = this.edges[Math.abs(dart)-1];
          if (fwd !== null) {
            adj2.push(Math.sign(dart) * (fwd + 1));
          }
        });
        if (adj2.length === 2) {
          newadjs.push(P.make(...adj2));
        } else {
          newadjs.push(adj.constructor.make(...adj2));
        }
      }
    }
    this.verts = newverts;
    this.edges = newedges;
    this.adjs = newadjs;
    this.consistency_check();
  }

  dart_start(dart_id) {
    /* Takes a dart id and returns a vertex id. */
    return this.dart_edge(dart_id)[dart_id > 0 ? 0 : 1];
  }
  dart_end(dart_id) {
    /* Takes a dart id and returns a vertex id. */
    assert(typeof dart_id === "number");
    return this.dart_edge(dart_id)[dart_id > 0 ? 1 : 0];
  }
  dart_edge(dart_id) {
    /* Takes a dart id and returns its underlying edge object. */
    assert(typeof dart_id === "number");
    return this.edges[Math.abs(dart_id)-1];
  }
  dart_adj(dart_id) {
    return this.adjs[this.dart_start(dart_id)];
  }
  dart_order(dart_id) {
    /* Takes a dart id and returns the number of incident darts at its vertex. */
    return this.dart_adj(dart_id).length;
  }
  dart_is_over(dart_id) {
    /* Assuming the dart id is for a dart at a crossing, gives whether the dart is part of the over-strand. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    assert(adj instanceof X);
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return (idx % 2) === 1;
  }
  next_dart(dart_id) {
    /* Takes a dart id and returns the next dart in counter-clockwise
       order about its vertex. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return adj[(idx + 1) % adj.length];
  }
  prev_dart(dart_id) {
    /* Takes a dart id and returns the previous dart in counter-clockwise
       order about its vertex. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return adj[(idx + adj.length - 1) % adj.length];
  }
  opp_dart(dart_id) {
    /* Takes a dart id and returns the other dart on its edge. */
    assert(typeof dart_id === "number");
    assert(dart_id !== 0 && Math.abs(dart_id) <= this.edges.length);
    return -dart_id;
  }
  dart_oriented(dart_id) {
    /* Returns whether this dart is pointing in the orientation of its circuit. */
    let edge = this.dart_edge(dart_id);
    return this.dart_start(dart_id) === edge[0];
  }
  through_dart(dart_id) {
    /* Takes a dart id and returns the next dart in a circuit. */
    let d = this.opp_dart(dart_id);
    switch (this.dart_order(d)) {
    case 2:
      return this.next_dart(d);
    case 4:
      return this.next_dart(this.next_dart(d));
    default:
      throw new Error("Unexpected dart order");
    }
  }
  dart_circuit(dart_id) {
    /* Takes a dart id and returns the circuit of darts, using through_dart. */
    let path = [];
    let d = dart_id;
    do {
      path.push(d);
      d = this.through_dart(d);
    } while (d !== dart_id);
    return path;
  }
  dart_face(dart_id) {
    /* Takes a dart id and returns the darts that comprise a face of the ribbon graph
       associated to the (virtual) knot diagram */
    let path = [];
    let d = dart_id;
    do {
      path.push(d);
      d = this.opp_dart(d);
      if (this.dart_adj(d) instanceof Virtual) {
        d = this.next_dart(this.next_dart(d));
      } else {
        d = this.next_dart(d);
      }
    } while (d !== dart_id);
    return path;
  }

  crossing_number() {
    let num = 0;
    this.adjs.forEach(a => {
      if (a instanceof X) {
        num++;
      }
    });
    return num;
  }

  virtual_crossing_number() {
    // the number of virtual crossings in this diagram
    let num = 0;
    this.adjs.forEach(a => {
      if (a instanceof Virtual) {
        num++;
      }
    });
    return num;
  }

  writhe() {
    /* Gives the total writhe of the diagram. */
    let wr = 0;
    this.adjs.forEach((a, vi) => {
      if (a instanceof X) {
        if (this.dart_oriented(a[1]) === this.dart_oriented(a[2])) {
          wr += 1;
        } else {
          wr -= 1;
        }
      }
    });
    return wr;
  }

  linking_matrix() {
    /* Gives the linking numbers between different colored components
       as a matrix.  The diagonal is the writhe of that colored
       component. */
    let matrix = new Map();
    function ensure_component(c) {
      if (!matrix.has(c)) {
        matrix.set(c, new Map());
        matrix.get(c).set(c, 0);
      }
    }
    function inc(c1, c2, delta) {
      let m1 = matrix.get(c1);
      m1.set(c2, (m1.get(c2)||0) + delta);
      let m2 = matrix.get(c2);
      m2.set(c1, (m2.get(c1)||0) + delta);
    }
    this.adjs.forEach((a, vi) => {
      if (a instanceof P) {
        let c = this.dart_edge(a[0])[2];
        ensure_component(c);
      } else if (a instanceof Virtual) {
        let c1 = this.dart_edge(a[1])[2],
            c2 = this.dart_edge(a[2])[2];
        ensure_component(c1);
        ensure_component(c2);
      } else if (a instanceof X) {
        // recall: a[0] is dart for undercrossing
        //  a[2] \ / a[1]
        //        /
        //  a[3] / \ a[0]
        let c1 = this.dart_edge(a[1])[2],
            c2 = this.dart_edge(a[2])[2];
        ensure_component(c1);
        ensure_component(c2);
        if (this.dart_oriented(a[1]) === this.dart_oriented(a[2])) {
          // so the crossing is positive
          inc(c1, c2, 1/2);
        } else {
          inc(c1, c2, -1/2);
        }
      } else {
        assert(false);
      }
    });
    return matrix;
  }

  num_components() {
    // Assumes edges are properly oriented
    let seen_darts = new Set();
    let n = 0;
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (seen_darts.has(edge_i)) {
        continue;
      }
      n++;
      this.dart_circuit(edge_i + 1).forEach(dart => {
        seen_darts.add(dart);
        seen_darts.add(-dart);
      });
    }
    return n;
  }

  seifert_circuit(dart) {
    /* Gives the Seifert circuit through the dart. */
    let circuit = [];
    let d = dart;
    do {
      circuit.push(d);
      d = this.opp_dart(d);
      if (this.dart_adj(d) instanceof P) {
        d = this.next_dart(d);
      } else if (this.dart_adj(d) instanceof Virtual) {
        d = this.next_dart(this.next_dart(d));
      } else {
        assert(this.dart_adj(d) instanceof X);
        if (this.dart_oriented(d) === this.dart_oriented(this.next_dart(d))) {
          d = this.prev_dart(d);
        } else {
          d = this.next_dart(d);
        }
      }
    } while (d !== dart);
    return circuit;
  }

  genus() {
    /* The canonical Seifert genus of this particular diagram. For
       split diagrams, it is the sum of the genera of each component. */

    assert(this.virtual_genus() === 0);

    let seen_darts = new Set();

    let component_faces = (start_dart) => {
      let nfaces = 0;
      let to_see = [start_dart];
      while (to_see.length > 0) {
        let dart = to_see.pop();
        if (seen_darts.has(dart)) {
          continue;
        }
        nfaces++;
        this.seifert_circuit(dart).forEach(d => {
          to_see.push(...this.adjs[this.dart_start(d)]);
          seen_darts.add(d);
          seen_darts.add(this.opp_dart(d));
        });
      }
      return nfaces;
    };

    let b_0 = 0;
    let nfaces = 0;
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (!seen_darts.has(edge_i + 1)) {
        b_0++;
        nfaces += component_faces(edge_i + 1);
      }
    }
    return b_0 - (nfaces - this.crossing_number() + this.num_components())/2;
  }

  num_diagram_components() {
    /* The number of disconnected components of the diagram */
    let seen_verts = new Set;
    let b_0 = 0;
    for (let vid = 0; vid < this.verts.length; vid++) {
      if (!seen_verts.has(vid)) {
        b_0++;
        let to_see = [vid];
        while (to_see.length > 0) {
          let vid2 = to_see.pop();
          if (seen_verts.has(vid2)) {
            continue;
          }
          seen_verts.add(vid2);
          this.adjs[vid2].forEach(dart => {
            to_see.push(this.dart_end(dart));
          });
        }
      }
    }
    return b_0;
  }

  virtual_genus() {
    /* Gives the virtual genus of this particular diagram. Classical
       knot diagrams have virtual genus 0.  The virtual genus of a
       virtual knot is the minimum of the virtual genus of all
       diagrams. */
    let seen_darts = new Set();

    let nfaces = 0;
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (!seen_darts.has(edge_i + 1)) {
        nfaces++;
        this.dart_face(edge_i + 1).forEach(dart => seen_darts.add(dart));
      }
      if (!seen_darts.has(-edge_i - 1)) {
        nfaces++;
        this.dart_face(-edge_i - 1).forEach(dart => seen_darts.add(dart));
      }
    }
    return this.num_diagram_components() - (nfaces - this.crossing_number())/2;
  }

  seifert_form() {
    /* Gives the Seifert linking form of the diagram with respect to
       some basis.  This is represented as [matrix, matrix, ...] with
       one matrix per connected component of the diagram, where
       together these form a block diagonal matrix. It should be
       understood that the full linking form has in additional c-1
       extra 0's on the diagonal (where c is the number of diagram
       components), since a Seifert surface should be connected. */

    let seen_edges = new Array(this.edges.length); // contains corresp. circuit ids
    seen_edges.fill(-1);
    let next_circuit_id = 0;
    function circuit_id(edge_id) {
      if (seen_edges[edge_id] === -1) {
        return (seen_edges[edge_id] = next_circuit_id++);
      } else {
        return seen_edges[edge_id];
      }
    }

    let visit_component = (start_edge) => {

      // the first part is constructing a Seifert surface for this component.
      // the meaning of circuits and twists will be described after it is constructed

      let to_see = [start_edge]; // [edge_id, ...]

      let circuits = new Map();
      let twists = [];

      function twist_id(edge1, edge2, x) {
        for (let i = 0; i < twists.length; i++) {
          let tw = twists[i];
          if (tw[1] === edge1 && tw[2] === edge2) {
            assert(x === tw[3]);
            return tw[0];
          }
        }
        let id = twists.length;
        twists.push([id, edge1, edge2, x]);
        return id;
      }

      while (to_see.length > 0) {
        let eid = to_see.pop();
        if (seen_edges[eid] !== -1) {
          continue;
        }
        let circ_id = circuit_id(eid);
        let circuit = this.seifert_circuit(eid + 1);
        circuit.forEach(d => {
          assert(d > 0);
          seen_edges[d - 1] = circ_id;
        });
        circuit = circuit.filter(d => this.dart_adj(d) instanceof X);
        let circuit_adj = [];
        circuits.set(circ_id, circuit_adj);
        circuit.forEach(d => {
          let eid1 = d - 1;
          let adj = this.adjs[this.dart_start(d)];
          let i = adj.indexOf(d);
          let eid2, x, front;
          if (this.dart_oriented(this.next_dart(d))) {
            eid2 = this.next_dart(d) - 1;
            x = 1 - 2 * (i % 2);
            front = false;
          } else {
            eid2 = this.prev_dart(d) - 1;
            x = 2 * (i % 2) - 1;
            front = true;
          }
          assert(eid2 >= 0);
          to_see.push(eid2);
          if (front) {
            let tw = twist_id(eid1, eid2, x);
            circuit_adj.push(tw+1);
          } else {
            let tw = twist_id(eid2, eid1, x);
            circuit_adj.push(-tw-1);
          }
        });
      }

      // replace edge ids with the correct circuit ids
      twists.forEach(twist => {
        twist[1] = seen_edges[twist[1]];
        twist[2] = seen_edges[twist[2]];
      });

      let tree = new Map; // circuit_id -> (dart_id | null).  null means root
      tree.set(twists[0][1], null);
      let to_visit = twists.slice();
      let cross_edges = [];
      while (to_visit.length > 0) {
        let twist;
        for (let i = 0; i < to_visit.length; i++) {
          twist = to_visit[i];
          if (tree.has(twist[1]) || tree.has(twist[2])) {
            to_visit.splice(i, 1);
            break;
          }
        }
        assert(twist);
        if (tree.has(twist[1]) && tree.has(twist[2])) {
          cross_edges.push(twist);
        } else if (tree.has(twist[1])) {
          tree.set(twist[2], -twist[0]-1);
        } else {
          tree.set(twist[1], twist[0]+1);
        }
      }

      // Next is to compute the cycles corresponding to the cross_edge
      // representations, and then to convert this into a form that is
      // convenient for computing the Seifert pairing.

      function find_twist(id) {
        for (let i = 0; i < twists.length; i++) {
          if (twists[i][0] === id) {
            return twists[i];
          }
        }
        return assert(false);
      }

      function cycle(cross_edge) {
        // path is [[same_orientation, edge], ...] for the cycle
        let path = [[true, cross_edge]];
        let cid;
        cid = cross_edge[1];
        while (tree.get(cid) !== null) {
          let dart = tree.get(cid);
          let twist = find_twist(Math.abs(dart) - 1);
          path.unshift([dart < 0, twist]);
          cid = twist[1 + (dart > 0)];
        }
        cid = cross_edge[2];
        while (tree.get(cid) !== null) {
          let dart = tree.get(cid);
          let twist = find_twist(Math.abs(dart) - 1);
          path.push([dart > 0, twist]);
          cid = twist[1 + (dart > 0)];
        }
        // remove backtracking from the tree part
        while (path[0][1][0] === path[path.length-1][1][0]) {
          path.pop();
          path.shift();
        }
        // now all edge ids are distinct
        return path;
      }

      //cross_edges.forEach(ce => console.log(toString(cycle(ce))));
      
      function make_vector(cycle) {
        // the cycle is as in the output of cycle()
        let edges = []; // list of [eid, x, oriented]
        let verts = []; // list of [vid, from_idx, front, to_idx, front]
        for (let i = 0; i < cycle.length; i++) {
          let [ori1, edge1] = cycle[i],
              [ori2, edge2] = cycle[(i+1) % cycle.length];
          edges.push([edge1[0], edge1[3], ori1]);

          let vtx = edge1[1 + ori1];
          let adj = circuits.get(vtx);
          let dart1 = ori1 ? -edge1[0]-1 : edge1[0]+1,
              dart2 = ori2 ? edge2[0]+1 : -edge2[0]-1;
          let from = adj.indexOf(dart1),
              to = adj.indexOf(dart2);
          assert(from !== -1 && to !== -1);
          verts.push([vtx, from, dart1 > 0, to, dart2 > 0]);
        }
        return {edges:edges, verts:verts};
      }

      //cross_edges.forEach(ce => console.log(make_vector(cycle(ce))));

      function linking(vect1, vect2) {
        // vect2 is pushed off
        // count linking of vect2 over vect1
        let link = 0;
        vect1.edges.forEach(edge1 => {
          let [eid, x, ori1] = edge1;
          vect2.edges.forEach(edge2 => {
            if (eid === edge2[0]) {
              let ori2 = edge2[2];
              if (x > 0) {
                link += 2 * (ori1 === ori2) - 1;
              }
            }
          });
        });
        vect1.verts.forEach(vert1 => {
          let [vtx, from1, from1_front, to1, to1_front] = vert1;
          vect2.verts.forEach(vert2 => {
            if (vtx === vert2[0]) {
              let [_, from2, from2_front, to2, to2_front] = vert2;

              let ori1 = 1;
              if (from1 > to1) {
                ori1 = -1;
                [from1, from1_front, to1, to1_front] = [to1, to1_front, from1, from1_front];
              }
              let ori2 = 1;
              if (from2 > to2) {
                ori2 = -1;
                [from2, from2_front, to2, to2_front] = [to2, to2_front, from2, from2_front];
              }

              if (from1_front && (from2 < from1 && from1 <= to2)) {
                link += ori1 * ori2;
              }
              if (to1_front && (from2 < to1 && to1 <= to2)) {
                link -= ori1 * ori2;
              }
            }
          });
        });
        return link;
      }

      let vecs = cross_edges.map(ce => make_vector(cycle(ce)));

      let matrix = vecs.map(v1 => vecs.map(v2 => linking(v1, v2)));
      console.log(toString$1(matrix));

      return matrix;
    };


    let matrices = [];
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (this.dart_adj(edge_i + 1) instanceof X && seen_edges[edge_i] === -1) {
        matrices.push(visit_component(edge_i));
      }
    }
    // Will be missing trivial unknot diagram components
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      let adj = this.dart_adj(edge_i + 1);
      if ((adj instanceof P || adj instanceof Virtual) && seen_edges[edge_i] === -1) {
        matrices.push([]);
        this.dart_circuit(edge_i + 1).forEach(dart => {
          seen_edges[Math.abs(dart) - 1] = true;
        });
      }
    }
    return matrices;
  }

  turaev() {
    /* Returns {genus:g, plus:p, minus:m} where g is the Turaev genus
       of the diagram and p and m are whether the diagram is
       plus-adequate and minus-adequate, respectively. */

    assert(this.virtual_genus() === 0);

    let seen_darts = new Set();

    let b_0 = 0;
    let n_faces = 0;
    let plus = true, // still plus-adequate
        minus = true; // still minus-adequate
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (!seen_darts.has(edge_i + 1)) {
        b_0++;

        let to_see = [[edge_i + 1, false]]; // [[dart, is_black], ...]
        while (to_see.length > 0) {
          let [dart, is_black] = to_see.pop();
          if (seen_darts.has(dart)) {
            continue;
          }
          n_faces++;
          // walk the Turaev face corresponding to the dart
          let face_fringe = new Set();
          let d = dart;
          do {
            if (face_fringe.has(d)) {
              if (is_black) {
                plus = false;
              } else {
                minus = false;
              }
            }

            {
              // Add adjacent darts to to_see, using checkerboard coloring
              let color = is_black;
              let adj_d = d;
              do {
                color = !color;
                adj_d = this.next_dart(adj_d);
                to_see.push([adj_d, color]);
              } while (d !== adj_d);
            }
            seen_darts.add(d);
            d = this.opp_dart(d);
            let adj = this.adjs[this.dart_start(d)];
            if (adj instanceof P) {
              d = this.next_dart(d);
            } else if (adj instanceof Virtual) {
              d = this.next_dart(this.next_dart(d));
            } else {
              assert(adj instanceof X);
              if ((adj.indexOf(d) % 2 === 0) === is_black) {
                d = this.next_dart(d);
              } else {
                d = this.prev_dart(d);
              }

              adj.forEach(adj_d => {
                if (d !== adj_d) {
                  face_fringe.add(adj_d);
                  face_fringe.add(this.opp_dart(adj_d));
                }
              });
            }
          } while (d !== dart);
        }
      }
    }
    return {genus: b_0 + (this.crossing_number() - n_faces)/2,
            plus: plus,
            minus: minus};
  }

  get_pd(oriented=false) {
    /* Gets an unoriented/oriented PD object.

       Chooses edge ids in ascending order of component. Makes sure a -> c is the orientation.
       If oriented=true, then Xr/Xl are used to determine the orientation of b--d.
    */
    let dart_arc = new Map();
    let next_arc_id = 1;
    let pd = PD.make();
    let edge_ids = this.edges.map((edge, i) => i);
    edge_ids.sort((i1, i2) => this.edges[i1][2] - this.edges[i2][2]);
    for (let ii = 0; ii < edge_ids.length; ii++) {
      let i = edge_ids[ii];
      if (dart_arc.has(i + 1)) {
        continue;
      }
      let circuit = this.dart_circuit(i + 1);
      if (circuit.every(d => !(this.dart_adj(d) instanceof X))) {
        // then this is a loop
        let arc = next_arc_id++;
        pd.push(P.make(arc, arc));
        circuit.forEach(d => {
          dart_arc.set(d, arc);
          dart_arc.set(-d, arc);
        });
      } else {
        let j = 0;
        while (!(this.dart_adj(circuit[j]) instanceof X)) {
          j++;
        }
        circuit = circuit.slice(j).concat(circuit.slice(0, j));
        // now the first dart is at a crossing
        let arc_id = null;
        circuit.forEach(dart => {
          if (this.dart_adj(dart) instanceof X) {
            arc_id = next_arc_id++;
          }
          dart_arc.set(dart, arc_id);
          dart_arc.set(-dart, arc_id);
        });
      }
    }
    this.adjs.forEach(adj => {
      if (adj instanceof X) {
        if (!this.dart_oriented(adj[2])) {
          adj = adj.slice(2).concat(adj.slice(0, 2));
        }
        let arcs = adj.map(d => dart_arc.get(d));
        if (!oriented) {
          pd.push(X.make(...arcs));
        } else {
          if (this.dart_oriented(adj[1])) {
            pd.push(Xp.make(...arcs));
          } else {
            pd.push(Xm.make(...arcs));
          }
        }
      }
    });
    return pd;
  }

  get_dt() {
    /* If this is not a knot, return null.  Otherwise, return a
       Dowker-Thistlethwaite code for the knot. */
    if (this.num_components() !== 1 || this.virtual_genus() > 0) {
      return null;
    }
    let circuit = this.dart_circuit(1).filter(d => this.dart_adj(d) instanceof X);
    if (circuit.length === 0) {
      return [];
    }
    let n = circuit.length;

    let code_from = (k) => {
      let dart_crossing = new Map();
      circuit.forEach((d, i) => {
        dart_crossing.set(d, (i+n-k)%n);
      });
      let get_crossing = (dart) => {
        let i = dart_crossing.get(this.next_dart(dart));
        if (i === void 0) {
          i = dart_crossing.get(this.prev_dart(dart));
        }
        return i;
      };
      let code = [];
      for (let i = 0; i < circuit.length; i += 2) {
        let j = get_crossing(circuit[(i+k)%n]);
        if (this.dart_is_over(circuit[(i+k)%n])) {
          code.push(-j-1);
        } else {
          code.push(j+1);
        }
      }
      if (code[0] < 0) {
        for (let i = 0; i < code.length; i++) {
          code[i] = -code[i];
        }
      }
      return code;
    };

    let codes = [];
    for (let k = 0; k < circuit.length; k++) {
      codes.push(code_from(k));
    }
    circuit = this.dart_circuit(-1).filter(d => this.dart_adj(d) instanceof X);
    for (let k = 0; k < circuit.length; k++) {
      codes.push(code_from(k));
    }

    codes.sort(compare);

    return codes[0];
  }

  skeleton() {
    let parts = [];
    let loops = []; /* disconnected loops; array of component ids */
    let seen_edges = new Set;

    for (let teid = 0; teid < this.edges.length; teid++) {
      if (seen_edges.has(teid)) {
        continue;
      }

      let circuit = this.dart_circuit(teid + 1);

      if (circuit.every(d => this.dart_adj(d) instanceof P)) {
        loops.push(this.edges[teid][2]);
        circuit.forEach(d => seen_edges.add(Math.abs(d) - 1));
        continue;
      }

      let next_arc_id = 1;
      let edge_arcs = new Map; /* map from edge id to arc id for non-loops */
      let arc_comps = new Map; /* map from arc ids to component ids */
      let part_verts = new Set;

      let to_visit = [teid];
      while (to_visit.length > 0) {
        let eid = to_visit.pop();
        if (seen_edges.has(eid)) {
          continue;
        }

        let comp = this.edges[eid][2];
        let circuit = this.dart_circuit(eid + 1);

        // Combine edges into arcs

        let j = 0;
        while (this.dart_order(circuit[j]) !== 4) {
          j++;
        }
        circuit = circuit.slice(j).concat(circuit.slice(0, j));
        // ^ now the first dart is at a (virtual)crossing (i.e., is of order 4).
        let arc_id = null;
        circuit.forEach(dart => {
          if (this.dart_order(dart) === 4) {
            arc_id = next_arc_id++;
            arc_comps.set(arc_id, comp);
            // record that this vertex is in this part
            let vid = this.dart_edge(dart)[0];
            part_verts.add(vid);
            // add other edges at vertex to to_visit
            this.adjs[vid].forEach(d => {
              let e = Math.abs(d) - 1;
              if (!seen_edges.has(e)) {
                to_visit.push(e);
              }
            });
          }
          edge_arcs.set(Math.abs(dart) - 1, arc_id);
          seen_edges.add(Math.abs(dart) - 1);
        });
      }

      // Construct vertex lists
      let verts = [];
      part_verts.forEach(vid => {
        let adj = this.adjs[vid].map(d => {
          let arc_id = edge_arcs.get(Math.abs(d) - 1);
          if (d > 0) {
            return arc_id;
          } else {
            return -arc_id;
          }
        });
        for (let i = 0; i < adj.length; i++) {
          if (adj[i] < 0 &&
              (adj[i] === -adj[(i + 1) % adj.length]
               || adj[i] === -adj[(i + adj.length - 1) % adj.length])) {
            // Reidemeister I loop.
            // Add in an extra degree-2 vertex so that the graph has no loop edges
            let arc_id = -adj[i];
            let arc_id2 = next_arc_id++;
            verts.push(P.make(arc_id2, -arc_id));
            adj[i] = -arc_id2;
            if (arc_comps.has(arc_id)) {
              arc_comps.set(arc_id2, arc_comps.get(arc_id));
            } else {
              arc_comps.set(-arc_id2, arc_comps.get(-arc_id));
            }
          }
        }
        verts.push(adj);
      });
      parts.push({
        // A list of dart lists
        verts: verts,
        // A description of how the vertex arose ("" is default)
        vert_types: verts.map(v => ""),
        // A list of vertices for the knot; these are lists of darts
        knot: verts,
        // A map from darts for the knot to components. Only includes darts that match the knot's orientation.
        comps: arc_comps
      });
    }
    return {
      // A list components.  There is one loop per entry
      loops: loops,
      parts: parts
    };
  }

  beautify() {
    /* Re-embed using the Tutte embedding of a barycentric subdivision. */

    function face_darts(skel, dart) {
      let darts = [];
      let curr_dart = dart;
      face_loop:
      while (true) {
        for (let vid = 0; vid < skel.verts.length; vid++) {
          let idx = skel.verts[vid].indexOf(-curr_dart);
          if (idx !== -1) {
            curr_dart = skel.verts[vid][(idx + skel.verts[vid].length - 1) % skel.verts[vid].length];
            darts.push(curr_dart);
            if (curr_dart === dart) {
              break face_loop;
            } else {
              continue face_loop;
            }
          }
        }
        throw new Error;
      }
      return darts;
    }

    function barycentric(skel, medial=false) {
      /* When medial is true, do the medial subdivision rather than the barycentric subdivision. */
      function face_dart(dart) {
        // Get a representative dart for the face
        return Math.min(...face_darts(skel, dart));
      }

      var fresh_dart = 1;
      var darts = new Map;
      function vert_key(vid) {
        return "[v " + vid + "]";
      }
      function edge_key(dart) {
        return "[e " + Math.abs(dart) + "]";
      }
      function face_key(dart) {
        return "[f " + face_dart(dart) + "]";
      }
      function dart_for(key) {
        if (!darts.has(key)) {
          darts.set(key, fresh_dart++);
        }
        return darts.get(key);
      }

      let dart_remap = new Map;
      let dart_remap_over_edge = new Map;

      let verts = [];
      let vert_types = [];
      // vertices
      skel.verts.forEach((vert, vid) => {
        let new_vert = [];
        vert.forEach((dart, i) => {
          new_vert.push(dart_for(vert_key(vid) + edge_key(dart)));
          dart_remap.set(dart, dart_for(vert_key(vid) + edge_key(dart)));
          if (!medial) {
            new_vert.push(dart_for(vert_key(vid) + i + face_key(dart)));
          }
        });
        verts.push(new_vert);
        vert_types.push(skel.vert_types[vid] + "v");
      });
      // edges
      skel.verts.forEach((vert, vid) => {
        vert.forEach((dart, i) => {
          if (dart < 0) return;
          let new_vert = [];
          new_vert.push(dart_for(edge_key(dart) + face_key(dart)));
          new_vert.push(-dart_for(vert_key(vid) + edge_key(dart)));
          dart_remap_over_edge.set(-dart, -dart_for(vert_key(vid) + edge_key(dart)));
          for (let vid = 0; vid < skel.verts.length; vid++) {
            let idx = skel.verts[vid].indexOf(-dart);
            if (idx != -1) {
              new_vert.push(dart_for(edge_key(dart) + face_key(-dart)));
              new_vert.push(-dart_for(vert_key(vid) + edge_key(dart)));
              dart_remap_over_edge.set(dart, -dart_for(vert_key(vid) + edge_key(dart)));
              verts.push(new_vert);
              vert_types.push("e");
              return;
            }
          }
          throw new Error;
        });
      });
      // faces
      let seen_faces = new Set;
      skel.verts.forEach(vert => {
        vert.forEach(dart => {
          let face = face_dart(dart);
          if (seen_faces.has(face)) {
            return;
          }
          seen_faces.add(face);
          let new_vert = [];
          face_darts(skel, dart).forEach(dart => {
            // `dart` ranges over darts in face `face`.
            if (!medial) {
              for (let vid = 0; vid < skel.verts.length; vid++) {
                let i = skel.verts[vid].indexOf(dart);
                if (i !== -1) {
                  new_vert.push(-dart_for(vert_key(vid) + i + face_key(face)));
                  break;
                }
              }
            }
            new_vert.push(-dart_for(edge_key(dart) + face_key(face)));
          });
          verts.push(new_vert);
          vert_types.push("f");
        });
      });

      let new_knot = skel.knot.map(p => p.map(d => dart_remap.get(d)));
      let new_comps = new Map;
      skel.comps.forEach((comp, d) => {
        let d1 = dart_remap.get(d);
        let d2 = dart_remap_over_edge.get(d);
        new_comps.set(d1, comp);
        new_comps.set(d2, comp);
        new_knot.push(P.make(-d1, d2));
      });

      { // check that verts is well-formed
        let darts = new Set;
        verts.forEach(adj => adj.forEach(d => {
          assert(!darts.has(d));
          darts.add(d);
        }));
        darts.forEach(d => {
          assert(darts.has(-d));
        });
        new_knot.forEach(adj => {
          assert(adj instanceof P || adj instanceof X || adj instanceof Virtual);
        });
      }

      return {
        verts: verts,
        vert_types: vert_types,
        knot: new_knot,
        comps: new_comps
      };
    }

    let skel = this.skeleton();
    console.log(skel);

    this.verts = [];
    this.edges = [];
    this.adjs = [];

    let num_parts = skel.loops.length + skel.parts.length;
    let cols = Math.ceil(Math.sqrt(num_parts));
    let row = 0;
    let col = 0;

    // Draw the unknot parts
    skel.loops.forEach(comp => {
      let cx = 800 / cols * (col + 0.5);
      let cy = 800 / cols * (row + 0.5);
      let r = 0.8 * 800 / cols / 2;

      const SUBDIV = 30;
      let vids = [];
      for (let i = 0; i < SUBDIV; i++) {
        let vid = this.verts.length;
        this.verts.push(new Point(cx + r * Math.cos(2 * Math.PI * i / SUBDIV),
                                  cy - r * Math.sin(2 * Math.PI * i / SUBDIV)));
        vids.push(vid);
      }
      let edges = [];
      for (let i = 0; i < SUBDIV; i++) {
        let eid = this.edges.length;
        this.edges.push([vids[i], vids[(i + 1) % SUBDIV], comp]);
        edges.push(eid);
      }
      for (let i = 0; i < SUBDIV; i++) {
        this.adjs.push(P.make(edges[i] + 1,
                              -edges[(i + SUBDIV - 1) % SUBDIV] - 1));
      }

      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    });

    // Draw the knotted parts
    skel.parts.forEach(part => {
      let cx = 800 / cols * (col + 0.5);
      let cy = 800 / cols * (row + 0.5);
      let r = 0.8 * 800 / cols / 2;

      const FACE_VERT_TYPE = "fvv";
      //console.log(part);
      part = barycentric(part, true);
      //console.log(part);
      part = barycentric(part, true);
      part = barycentric(part, true);
      console.log(part);
      //const FACE_VERT_TYPE = "fvv";
      //part = barycentric(barycentric(barycentric(part)));

      // locate best outside face.
      let outside = null;
      let max_degree = 0;
      part.verts.forEach((vert, vid) => {
        if (part.vert_types[vid] == FACE_VERT_TYPE && max_degree < vert.length) {
          max_degree = vert.length;
          outside = vid;
        }
      });
      console.log("best: " + outside);

      let vid_of_dart = new Map;
      part.verts.forEach((vert, vid) => {
        vert.forEach(dart => {
          vid_of_dart.set(dart, vid);
        });
      });

      function row_reduce(matrix) {
        let rows = matrix.length,
            cols = matrix[0].length;
        let i = 0, j = 0; // current pivot
        while (i < rows && j < cols) {
          let besti = i;
          for (let k = i + 1; k < rows; k++) {
            if (Math.abs(matrix[k][j]) > Math.abs(matrix[besti][j])) {
              besti = k;
            }
          }
          if (besti !== i) {
            [matrix[i], matrix[besti]] = [matrix[besti], matrix[i]];
          }
          if (matrix[i][j] === 0) {
            j++;
            continue;
          }
          let c = matrix[i][j];
          matrix[i] = matrix[i].map(v => v / c);
          for (let k = 0; k < rows; k++) {
            if (k !== i) {
              c = matrix[k][j];
              matrix[k][j] = 0;
              for (let l = j + 1; l < cols; l++) {
                matrix[k][l] -= c * matrix[i][l];
              }
            }
          }
          i++;
          j++;
        }
      }

      let matrixx = [];
      let matrixy = [];
      let is_fixed = new Set;
      let outside_verts = [];
      part.verts[outside].forEach(dart => {
        let verts = face_darts(part, dart).map(d => vid_of_dart.get(d));
        let idx = verts.indexOf(outside);
        verts = verts.slice(idx + 1).concat(verts.slice(0, idx));
        verts.pop();
        outside_verts.push(...verts);
      });
      outside_verts.forEach((vid, i) => {
        is_fixed.add(vid);
        let rowx = new Array(part.verts.length+1).fill(0);
        rowx[vid] = 1;
        rowx[part.verts.length] = Math.cos(2 * Math.PI * i / outside_verts.length);
        let rowy = new Array(part.verts.length+1).fill(0);
        rowy[vid] = 1;
        rowy[part.verts.length] = Math.sin(2 * Math.PI * i / outside_verts.length);
        matrixx.push(rowx);
        matrixy.push(rowy);
      });

      part.verts.forEach((vert, vid) => {
        if (vid === outside || is_fixed.has(vid)) {
          return;
        }
        let rowx = new Array(part.verts.length+1).fill(0);
        vert.forEach(dart => {
          let vid2 = vid_of_dart.get(-dart);
          rowx[vid2] += 1;
          rowx[vid] -= 1;
        });
        matrixx.push(rowx);
        matrixy.push(rowx.slice());
      });

      //console.log("{" + matrixx.map(row => "{" + row.join(",") + "}").join(",") + "}");
      //console.log("{" + matrixy.map(row => "{" + row.join(",") + "}").join(",") + "}");

      row_reduce(matrixx);
      row_reduce(matrixy);

      function vid_point(vid) {
        if (vid < outside) {
          assert(matrixx[vid][vid] === 1);
          assert(matrixy[vid][vid] === 1);
          return new Point(matrixx[vid][part.verts.length], matrixy[vid][part.verts.length]);
        } else if (vid === outside) {
          throw new Error;
        } else {
          assert(matrixx[vid - 1][vid] === 1);
          assert(matrixy[vid - 1][vid] === 1);
          return new Point(matrixx[vid - 1][part.verts.length], matrixy[vid - 1][part.verts.length]);
        }
      }

      var points = [];
      part.knot.forEach(p => {
        points.push(vid_point(vid_of_dart.get(p[0])));
      });
      let minx = 1e10, maxx = -1e10,
          miny = 1e10, maxy = -1e10;
      points.forEach(pt => {
        minx = Math.min(minx, pt.x);
        maxx = Math.max(maxx, pt.x);
        miny = Math.min(miny, pt.y);
        maxy = Math.max(maxy, pt.y);
      });
      points.forEach(pt => {
        let x = pt.x - (minx + maxx)/2,
            y = pt.y - (miny + maxy)/2;
        let scale = Math.max(maxx - minx, maxy - miny)/2;
        pt.x = cx + x/scale * r;
        pt.y = cy + y/scale * r;
      });

      let vids = [];
      points.forEach(pt => {
        let vid = this.verts.length;
        this.verts.push(pt);
        vids.push(vid);
      });
      let knot_vid_of_dart = new Map;
      part.knot.forEach((vert, vid) => {
        vert.forEach(dart => {
          knot_vid_of_dart.set(dart, vid);
        });
      });
      let edges = new Map;
      part.comps.forEach((comp, d) => {
        let eid = this.edges.length;
        edges.set(d, eid);
        this.edges.push([
          vids[knot_vid_of_dart.get(d)],
          vids[knot_vid_of_dart.get(-d)],
          comp
        ]);
      });
      part.knot.forEach((adj, knot_vid) => {
        this.adjs.push(adj.map(d => {
          if (edges.has(d)) {
            return edges.get(d) + 1;
          } else {
            return -1-edges.get(-d);
          }
        }));
      });

      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    });

    console.log(this);
    this.consistency_check();

  }
}

// The Temperley--Lieb category

class TLPath {
  /* A pair of edge ids (integers). */
  constructor(a, b) {
    if (a > b) {
      [a, b] = [b, a];
    }
    this[0] = a;
    this[1] = b;
  }
  equal(path2) {
    assert(path2 instanceof TLPath);
    return this[0] === path2[0] && this[1] === path2[1];
  }
  compare(path2) {
    assert(path2 instanceof TLPath);
    let d = this[0] - path2[0];
    if (d !== 0) {
      return d;
    } else {
      return this[1] - path2[1];
    }
  }
  static make(a, b) {
    assert(arguments.length === 2);
    return new this(a, b);
  }
  toString() {
    return "TLPath.make(" + this[0] + ", " + this[1] + ")";
  }
}

class TLTerm {
  /* A Laurent coefficient and a [TLPath,...] list */
  constructor(coeff, paths) {
    this.coeff = coeff;
    this.paths = paths;
  }
  static make(coeff, paths) {
    /* Create a normalized TLTerm. */
    let term = new this(coeff, paths);
    return term.normalize();
  }
  toString() {
    return "TLTerm.make(" + this.coeff + ", " + toString$1(this.paths) + ")";
  }
  equal(term2) {
    assert(term2 instanceof TLTerm);
    return equal(this.coeff, term2.coeff) && equal(this.paths, term2.paths);
  }
/*  compare(term2) {
    assert(term2 instanceof TLTerm);
    if (this.coeff !
  }*/
  normalize() {
    /* In-place normalization of the TLTerm. */
    let coeff = this.coeff,
        paths = this.paths;
    let i = 0;
    main_loop:
    while (i < paths.length) {
      let p1 = paths[i];
      if (p1[0] === p1[1]) { // self-loop
        coeff = coeff.mul(TL.loop);
        paths.splice(i, 1);
        continue main_loop;
      }
      let j = i + 1;
      while (j < paths.length) {
        let p2 = paths[j];
        for (let k1 = 0; k1 < 2; k1++) {
          for (let k2 = 0; k2 < 2; k2++) {
            if (p1[k1] === p2[k2]) {
              paths[i] = TLPath.make(p1[1-k1], p2[1-k2]);
              paths.splice(j, 1);
              continue main_loop;
            }
          }
        }
        j++;
      }
      i++;
    }
    this.coeff = coeff;

    // now paths are simplified

    paths.sort((p1, p2) => p1[0] - p2[0]); // this is lexicographic since all edge indices are different

    return this;
  }
  scale(c) {
    return new TLTerm(this.coeff.mul(c), this.paths);
  }
}

class TL extends SimpleType {
  // A list of TLTerms
  copy() {
    return this.slice(); // ok since normalization keeps the term "the same"
  }
  normalize() {
    /* In-place normalization of the TL. */

    // each TLTerm is assumed to be pre-normalized
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
        this[i] = new TLTerm(sum, term.paths);
        if (j-i-1 > 0) {
          this.splice(i+1, j-i-1);
        }
        i++;
      }
    }

    return this;
  }

  add(tl2) {
    assert(tl2 instanceof TL);
    // Reference implementation:
    // return this.concat(tl2).normalize();

    let tl1 = this;
    let i1 = 0, i2 = 0;
    let result = new TL();

    while (i1 < tl1.length && i2 < tl2.length) {
      let t1 = tl1[i1], t2 = tl2[i2];

      let comp = compare(t1.paths, t2.paths);
      if (comp === 0) {
        let coeff = t1.coeff.add(t2.coeff);
        if (!coeff.is_zero()) {
          result.push(new TLTerm(coeff, t1.paths));
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
    while (i1 < tl1.length) {
      result.push(tl1[i1]);
      i1++;
    }
    while (i2 < tl2.length) {
      result.push(tl2[i2]);
      i2++;
    }
    return result;
  }

  scale(c, paths) {
    if (c.is_zero()) {
      return TL.zero;
    }
    if (paths.length === 0) {
      return this.map(term => term.scale(c));
    }
    let result = this.map(term =>
                          TLTerm.make(term.coeff.mul(c),
                                      term.paths.concat(paths)));
    return result.normalize();
  }

  mul(tl2) {
    /* Multiplies this with tl2. Should run faster if tl2 is "smaller" */
    assert(tl2 instanceof TL);
    let tl = TL.make();
    tl2.forEach(term2 => {
      tl = tl.add(this.scale(term2.coeff, term2.paths));
    });
    // In other order:
    /*this.forEach(term1 => {
      tl = tl.add(tl2.scale(term1.coeff, term1.paths));
    });*/
    return tl;
  }
}
TL.zero = TL.make();
TL.unit = TL.make(TLTerm.make(Laurent.unit, []));
TL.loop = Laurent.fromCoeffs([-1,0,0,0,-1], -2);

// Knot invariant caches

let invariant_caches = new WeakMap;

let invariant_handlers = {};

let running_mts = [];

function get_invariant(name, diagram, /*args*/) {
  /* Returns a promise.  The extra arguments should be toString-able.
     Technically, diagram can be any object, but it ought to be a
     KnotGraph or a PD. */

  assert(name in invariant_handlers);

  let args = Array.prototype.slice.call(arguments, 2);
  let key = name + toString$1(args);

  let cache = invariant_caches.get(diagram);
  if (cache && cache[key]) {
    return cache[key];
  }
  if (!cache) {
    cache = {};
    invariant_caches.set(diagram, cache);
  }
  let mt = {
    _canceled: false,
    cancel: () => { mt._canceled = true; },
    next_turn: () => new Promise((resolve, reject) => {
      if (mt._canceled) {
        reject("canceled");
      } else {
        setTimeout(resolve, 0);
      }
    })
  };
  running_mts.push(mt);
                                
  let promise = new Promise((resolve, reject) => {
    setTimeout(async function () {
      try {
        let val = invariant_handlers[name](mt, diagram, ...args);
        resolve(val);
      } catch (x) {
        reject(x);
      } finally {
        remove_value(running_mts, mt);
      }
    }, 0);
  });
  cache[key] = promise;

  return promise;
}

function define_invariant(name, f) {
  /* f is a function (mt, diagram, ...args) -> Promise, where mt is
     the "multitasking system", which has two functions next_turn()
     (which the function can await for doing cooperative multitasking)
     and cancel().  */
  assert(!invariant_handlers[name]);
  invariant_handlers[name] = f;
}

// Jones polynomial

function sort_pd_heuristic$1(pd, boundary=null) {
  /* Sorts the entities in the PD so that each entity is chosen to minimize the next frontier. */
  assert(pd instanceof PD);
  pd = pd.slice();
  //console.log("pre-sorted:", toString(pd));

  let frontier = boundary ? boundary.slice() : [];
  let sorted = [];

  while (pd.length > 0) {
    // find "best" next entity, using the least-new-frontier heuristic
    //console.log("frontier:", toString(frontier));
    let best_delta = Infinity;
    let best_eid = null;
    pd.forEach((entity, eid) => {
      let delta = entity.length;
      entity.forEach(i => {
        if (frontier.indexOf(i) !== -1) {
          delta -= 2;
        }
      });
      if (delta < best_delta) {
        best_delta = delta;
        best_eid = eid;
      }
    });
    let entity = pd[best_eid];
    sorted.push(entity);
    pd.splice(best_eid, 1);
    //console.log("best:", toString(entity));

    // update frontier
    entity.forEach(i => {
      if (!remove_value(frontier, i)) {
        frontier.push(i);
      }
    });
  }
  //console.log("sorted:", toString(sorted));
  return sorted;
}

function mk_tl_P(a,b) {
  return TL.make(TLTerm.make(Laurent.unit, [TLPath.make(a, b)])).normalize();
}

function mk_tl_X(a,b,c,d) {
  return TL.make(TLTerm.make(Laurent.t, [TLPath.make(a, b),
                                         TLPath.make(c, d)]),
                 TLTerm.make(Laurent.tinv, [TLPath.make(a, d),
                                            TLPath.make(b, c)])).normalize();
}

define_invariant("kauffman_bracket", async function (mt, pd) {
  if (!(pd instanceof PD)) {
    return await get_invariant("kauffman_bracket", pd.get_pd());
  }

  let tangle = pd_to_tangle(pd);

  if (tangle === null) {
    return null;
  }

  pd = sort_pd_heuristic$1(tangle.pd, [tangle.boundary[0]]);

  let bracket = TL.unit;

  for (let i = 0; i < pd.length; i++) {
    if (i % 2 === 0) await mt.next_turn();
    let entity = pd[i];

    if (entity.constructor === P) {
      bracket = bracket.mul(mk_tl_P(entity[0], entity[1]));
    } else if (entity.constructor === Virtual) {
      bracket = bracket.mul(mk_tl_P(entity[0], entity[2]));
      bracket = bracket.mul(mk_tl_P(entity[1], entity[3]));
    } else {
      // Otherwise it should be an X, Xp, or Xm
      bracket = bracket.mul(mk_tl_X(entity[0], entity[1], entity[2], entity[3]));
    }
  }

  assert(bracket.length === 1); // the kauffman bracket never vanishes
  assert(bracket[0].paths.length === 1); // path corresponds to tangle.boundary
  return bracket[0].coeff;
});

function kb_to_jones(kb) {
  /* Given a normalized Kauffman bracket (a Laurent polynomial) return
     the corresponding Jones polynomial. */

  // The following polynomial is in T=t^2.
  let jp = Laurent.zero;
  for (let i = 0; i < kb._coeffs.length; i++) {
    let coeff = kb._coeffs[i];
    if (coeff !== 0) {
      let new_exp = -(kb._offset + i)/2;
      assert(new_exp === (0|new_exp));
      jp = jp.add(Laurent.fromCoeffs([coeff], new_exp));
    }
  }
  return jp;
}

define_invariant("jones_poly", async function (mt, diagram) {
  /* Computes the Jones polynomial from a KnotGraph (or an oriented
     PD). Returns a polynomial in T=t^2, or null for the empty diagram. */

  let wr;
  if (diagram instanceof PD) {
    wr = 0;
    diagram.forEach(entity => {
      if (entity.length === 4) {
        if (entity.constructor === Xp) {
          wr++;
        } else if (entity.constructor === Xm) {
          wr--;
        } else {
          throw new TypeError;
        }
      }
    });
  } else {
    assert(diagram instanceof KnotGraph);
    wr = diagram.writhe();
  }

  let kb = await get_invariant('kauffman_bracket', diagram);
  if (kb === null) {
    return null;
  }

  let normalized_kb = kb.simple_mul(Math.pow(-1, wr), -3*wr);
  return kb_to_jones(normalized_kb);
});

define_invariant("cabled_jones_poly", async function (mt, diagram, cables) {
  /* Computes the cabeled Jones polynomial from a KnotGraph (or an oriented
     PD). Returns a polynomial in A=t^-4, or null for the empty diagram. */
  assert(cables > 0);
  if (diagram instanceof KnotGraph) {
    diagram = diagram.get_pd(true);
  }
  assert(diagram instanceof PD);

  if (diagram.length === 0) {
    return null;
  }

  let kb = await get_invariant("kauffman_bracket", pd_form_cabling(diagram, cables));
  if (kb === null) {
    return null;
  }
  return kb; // we are using the Kauffman bracket parameterization
});

function det(NumberSystem, matrix) {
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

// Free group algebra

class FGWord extends SimpleType {
  /* A FGWord is gen,exp,gen,exp,... where the exponents are numbers
     and the generators are tested by ===. */
  normalize() {
    /* Reduce the freegroup word.  Accepts FGWords inside the FGWord in place of generators,
       which are spliced in. (In Mathematica-speak, this symbol is flattenable.)*/
    let i = 0;
    while (i < this.length) {
      if (this[i] instanceof FGWord) {
        let w = this[i];
        let exp = this[i+1];
        if (exp < 0) {
          w = w.inverse();
          exp = -exp;
        }
        this.splice(i, 2);
        for (let k = 0; k < exp; k++) {
          this.splice(i, 0, ...w);
        }
        i = Math.max(0, i - 2);
        continue;
      }
      let exp = this[i+1];
      let j = i+2;
      while (j < this.length && this[i] === this[j]) {
        exp += this[j+1];
        j += 2;
      }
      if (exp === 0) {
        this.splice(i, j-i);
        i = Math.max(0, i - 2);
      } else {
        this[i+1] = exp;
        if (j-i-2 > 0) {
          this.splice(i+2, j-i-2);
        }
        i += 2;
      }
    }
    assert(i === this.length);
    return this;
  }

  normalize_conj(full_normalize=true) {
    /* Reduce the word, allowing conjugation and inversion, putting it
       into a normal form. Returns a new word.  If full_normalize is
       true, then returns the lexicographically minimal word among all
       conjugates. */
    let w = this.slice();
    while (true) {
      w.normalize();
      if (w.length > 2) {
        if (w[0] === w[w.length-2]) {
          // Can conjugate to move end to front and reduce length
          w[1] += w[w.length-1];
          w.length = w.length - 2;
          continue;
        }
      }
      break;
    }
    if (!full_normalize || w.length === 0) {
      return w;
    }
    let shifts = [];
    for (let i = 0; i < w.length; i += 2) {
      let sw = w.slice(i).concat(w.slice(0, i));
      shifts.push(sw);
      shifts.push(sw.inverse());
    }
    shifts.sort(compare);
    return shifts[0];
  }

  inverse() {
    let w = FGWord.make();
    for (let i = this.length-2; i >= 0; i -= 2) {
      w.push(this[i], -this[i+1]);
    }
    return w;
  }

  fox_deriv(gen) {
    /* Returns an FGA of the Fox derivative with respect to gen.
       (Not used by alexander polynomial implementation.)*/
    if (this.length === 0) {
      return FGA.zero;
    } else if (this.length === 2 && this[1] === 1) {
      return gen === this[0] ? FGA.unit : FGA.zero;
    } else if (this.length === 2 && this[1] === -1) {
      if (gen === this[0]) {
        return FGA.make([-1, FGWord.make(this[0], -1)]);
      } else {
        return FGA.zero;
      }
    } else {
      let u = this.slice(0,2), v = this.slice(2);
      if (v.length === 0) {
        v.push(u[0], u[1]-Math.sign(u[1]));
        u[1] = Math.sign(u[1]);
      }
      return u.fox_deriv(gen)
        .add(FGA.make([1,u]).mul(v.fox_deriv(gen)));
    }
  }

  substitute(g, val) {
    /* If g is a function, for each generator for which g is true,
       replace with val.  Otherwise, do the same by checking === with g. */
    let w = this.slice();
    for (let i = 0; i < this.length; i += 2) {
      if ((g instanceof Function && g(w[i])) || g === w[i]) {
        w[i] = val;
      }
    }
    return w.normalize();
  }
}

class FGA extends SimpleType {
  /* A list of terms, which are [coeff,FGWord] pairs. */

  static gen(g, exp=1, c=1) {
    let x = FGA.make([c,FGWord.make(g, exp)]);
    return x.normalize();
  }

  normalize() {
    this.forEach(term => term[1].normalize());
    this.sort((term1, term2) => compare(term1[1], term2[1]));

    let i = 0;
    while (i < this.length) {
      let term = this[i];
      let sum = term[0];
      let j = i + 1;
      while (j < this.length && compare(term[1], this[j][1]) === 0) {
        sum += this[j][0];
        j++;
      }
      if (sum.length === 0) {
        this.splice(i, j-i);
      } else {
        term[0] = sum;
        if (j-i-1 > 0) {
          this.splice(i+1, j-i-1);
        }
        i++;
      }
    }

    return this;
  }

  scale(c) {
    assert(typeof c === "number");
    if (c === 0) {
      return FGA.zero;
    }
    let w = FGA.make();
    this.forEach(term => {
      w.push([term[0]*c, term[1]]);
    });
    return w;
  }

  add(w2) {
    assert(w2 instanceof FGA);
    return this.concat(w2).normalize();
  }

  mul(w2) {
    assert(w2 instanceof FGA);
    let w = FGA.make();
    this.forEach(term1 => {
      w2.forEach(term2 => {
        w.push([term1[0] * term2[0],
                term1[1].concat(term2[1])]);
      });
    });
    return w.normalize();
  }

  substitute(g, val) {
    /* Calls substitute for each term. */
    return this.map(term => [term[0], term[1].substitute(g, val)]).normalize();
  }

  toLaurent() {
    /* Assumes g |-> t is a homomorphism and gives the image. */
    let p = Laurent.zero;
    this.forEach(term => {
      let exp = 0;
      for (let i = 0; i < term[1].length; i += 2) {
        exp += term[1][i+1];
      }
      p = p.add(Laurent.fromCoeffs([term[0]], exp));
    });
    return p;
  }
}
FGA.zero = FGA.make();
FGA.unit = FGA.make([1,FGWord.make()]);

// Alexander polynomials

function wirtinger_presentation(pd) {
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

function alexander_module(pres) {
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
          term = Laurent.fromCoeffs([1], ab);
        } else {
          term = Laurent.fromCoeffs([-1], ab-1);
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
    while (pmatrix.length > 0 && j < pmatrix[0].length) {
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

function alexander_polynomial(module, n=0) {
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

// Rational functions, as pairs of polynomials

class RatFun {
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

// Conway potential

function ratfun_det(lmatrix) {
  /* compute the determinant of a matrix of Laurent polynomials */
  if (lmatrix.length == 0) {
    return Laurent.unit;
  }

  //console.log("{" + lmatrix.map(row => "{" + row.join(", ") + "}").join(", ") + "}");

  let matrix = lmatrix.map(row => row.map(p => RatFun.from_laurent(p)));
  let rows = matrix.length,
      cols = matrix[0].length;
  assert(rows === cols); // only square matrices

  //console.log("{" + matrix.map(row => "{" + row.join(", ") + "}").join(", ") + "}");

  let det = RatFun.unit;

  // proceed by row reduction
  let i = 0,
      j = 0;
  while (i < rows && j < cols) {
    if (matrix[i][j].is_zero()) {
      for (let k = i + 1; k < rows; k++) {
        if (!matrix[k][j].is_zero()) {
          [matrix[i], matrix[k]] = [matrix[k], matrix[i]];
          det = det.scale(-1);
          break;
        }
      }
      if (matrix[i][j].is_zero()) {
        return Laurent.zero;
        //j++;
        //continue;
      }
    }
    let c = matrix[i][j];
    det = det.mul(c);
    if (det.is_zero()) {
      return Laurent.zero;
    }
    matrix[i] = matrix[i].map(v => v.div(c));
    for (let k = i + 1; k < rows; k++) {
      c = matrix[k][j];
      matrix[k][j] = RatFun.zero;
      for (let l = j + 1; l < cols; l++) {
        matrix[k][l] = matrix[k][l].add(matrix[i][l].mul(c).scale(-1));
      }
    }
    i++;
    j++;
  }
  // verify denominator is of right form
  for (let i = 0; i < det.q.length - 1; i++) {
    assert(det.q[i] === 0);
  }
  assert(det.q.leading_coeff() === 1);
  return Laurent.fromCoeffs(det.p).simple_mul(1, -det.q.degree());
}

define_invariant("conway_poly", async function (mt, diagram) {
  let matrices = diagram.seifert_form();
  if (matrices.length !== 1) {
    // the number of connected components is not 1
    return Laurent.zero;
  }
  let A = matrices[0];
  // calculate C = -tA+t^{-1}A^T
  // (chose +/- convention to match Linkinfo's conway polynomials)
  let C = [];
  for (let i = 0; i < A.length; i++) {
    C.push([]);
    for (let j = 0; j < A.length; j++) {
      C[i][j] = Laurent.add(Laurent.mul(Laurent.incl(-A[i][j]), Laurent.t),
                            Laurent.mul(Laurent.incl(A[j][i]), Laurent.tinv));
    }
  }
  // pre_poly is the normalized Alexander polynomial
//  let pre_poly = det(Laurent, C);
//  console.log("det");
//  console.log(ratfun_det(C));
  let pre_poly = ratfun_det(C);
  if (pre_poly.is_zero()) {
    return Laurent.zero;
  }
  let z = Laurent.add(Laurent.t, Laurent.negate(Laurent.tinv));
  let zpows = [];
  let pow = Laurent.unit;
  for (let i = 0; pow.minexp() >= pre_poly.minexp(); i++) {
    zpows.push(pow);
    pow = Laurent.mul(pow, z);
  }
  let conway = Laurent.zero;
  for (let i = -pre_poly.minexp(); i >= 0; i--) {
    if (pre_poly.is_zero()) {
      // done
      break;
    }
    if (-pre_poly.minexp() === i) {
      let zpow = zpows[i];
      let c = pre_poly._coeffs[0] / zpow._coeffs[0];
      conway = conway.add(Laurent.fromCoeffs([c], i));
      pre_poly = pre_poly.add(Laurent.incl(-c).mul(zpow));
    }
  }

  return conway;
});

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

class MLaurent extends SimpleType {
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
    let e = make_int_const(0);
    for (let term of this.terms()) {
      let eterm = make_int_const(term.coeff);
      term.exps.forEach((e, i) => {
        eterm = times(eterm, pow(make_var(variables(i)), make_int_const(e, exp_divisor)));
      });
      e = plus(e, eterm);
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

  mirror() {
    /* Flip the first variable, for taking mirror image of arrow polynomial */

    let res = MLaurent.zero;
    for (var term of this.terms()) {
      if (term.exps.length > 0) {
        term.exps[0] = -term.exps[0];
      }
      res = res.add(MLaurent.make(term.exps.length, term.coeff, ...term.exps));
    }
    return res;
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

// A modification of the Temperley--Lieb planar algebra for calculating the arrow polynomial

class ADir {
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

class ATerm {
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
    return "ATerm.make(" + this.coeff + ", " + toString$1(this.paths) + ")";
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

class ATL extends SimpleType {
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

// Arrow polynomial (Dye--Kauffman, Miyazawa)

function sort_pd_heuristic(pd, boundary=null) {
  /* Sorts the entities in the PD so that each entity is chosen to minimize the next frontier. */
  assert(pd instanceof PD);
  pd = pd.slice();
  //console.log("pre-sorted:", toString(pd));

  let frontier = boundary ? boundary.slice() : [];
  let sorted = [];

  while (pd.length > 0) {
    // find "best" next entity, using the least-new-frontier heuristic
    //console.log("frontier:", toString(frontier));
    let best_delta = Infinity;
    let best_eid = null;
    pd.forEach((entity, eid) => {
      let delta = entity.length;
      entity.forEach(i => {
        if (frontier.indexOf(i) !== -1) {
          delta -= 2;
        }
      });
      if (delta < best_delta) {
        best_delta = delta;
        best_eid = eid;
      }
    });
    let entity = pd[best_eid];
    sorted.push(entity);
    pd.splice(best_eid, 1);
    //console.log("best:", toString(entity));

    // update frontier
    entity.forEach(i => {
      if (!remove_value(frontier, i)) {
        frontier.push(i);
      }
    });
  }
  //console.log("sorted:", toString(sorted));
  return sorted;
}

define_invariant("arrow_bracket", async function (mt, pd) {
  if (!(pd instanceof PD)) {
    return await get_invariant("arrow_bracket", pd.get_pd(true));
  }

  let tangle = pd_to_tangle(pd);

  if (tangle === null) {
    return null;
  }

  pd = sort_pd_heuristic(tangle.pd, [tangle.boundary[0]]);

  let bracket = ATL.unit;

  for (let i = 0; i < pd.length; i++) {
    if (i % 2 === 0) await mt.next_turn();
    let entity = pd[i];
    let atl = null;
    if (entity instanceof P) {
      let [a, b] = entity;
      atl = ATL.make(ATerm.make(MLaurent.unit, [ADir.make(0, a, b)]));
    } else if (entity instanceof Xp) {
      let [a, b, c, d] = entity;
      atl = ATL.make(ATerm.make(MLaurent.x(0, 1), [ADir.make( 0, a, b),
                                                   ADir.make( 0, c, d)]),
                     ATerm.make(MLaurent.x(0,-1), [ADir.make(-1, a, d),
                                                   ADir.make( 1, c, b)]));
      atl = atl.normalize();
    } else if (entity instanceof Xm) {
      let [a, b, c, d] = entity;
      atl = ATL.make(ATerm.make(MLaurent.x(0,-1), [ADir.make( 0, b, c),
                                                   ADir.make( 0, d, a)]),
                     ATerm.make(MLaurent.x(0, 1), [ADir.make(-1, b, a),
                                                   ADir.make( 1, d, c)]));
      atl = atl.normalize();
    } else {
      assert(false);
      throw new Error("Unexpected entity type");
    }
    bracket = bracket.mul(atl);
  }

  let result = MLaurent.zero;
  bracket.forEach(term => {
    assert(term.paths.length === 1);
    let path = term.paths[0];
    assert(path.a === Math.min(...tangle.boundary));
    assert(path.b === Math.max(...tangle.boundary));
    let poly = term.coeff;
    // multiply in last bit of weight from this last path
    if (path.n !== 0) {
      poly = poly.mul(MLaurent.x(Math.abs(path.n)/2));
    }
    result = result.add(poly);
  });
  return result;
});

define_invariant("cabled_arrow_poly", async function (mt, diagram, cables) {
  /* Computes the writhe-normalized arrow polynomial.  To get a "jones" polynomial, set A=T^-4. */
  assert(cables > 0);
  if (diagram instanceof KnotGraph) {
    diagram = diagram.get_pd(true);
  }
  assert(diagram instanceof PD);

  if (diagram.length === 0) {
    return null;
  }

  let ab = await get_invariant("arrow_bracket", pd_form_cabling(diagram, cables));
  if (ab === null) {
    return null;
  }
  return ab;
});

/* Added to a file's GET request to help override browser cache. */
const file_version = 2;

/* The knot table.  As tables are loaded, this array is populated with
 * knot data.  The key is the knot name (accd to KnotInfo/LinkInfo) */
const table = new Map;
self.knot_table = table;

/* a object containing objects that describe how to load this part of
 * the table and whether it's loaded. */
var table_loaders = {};

/* A list of files that have already been requested. */
var requested_files = [];

/* A list of callbacks waiting on things being loaded */
var waiting = [];

function mk_table_loader_key(db, components, crossing_number, property) {
  return "/" + db + "/" + components + "/" + crossing_number + "/" + property;
}

function get_table_loader_entry(db, components, crossing_number, property) {
  let key = mk_table_loader_key(db, components, crossing_number, property);
  let entry = table_loaders[key];
  if (!entry) {
    entry = table_loaders[key] = {
      file: null,
      loaded: false
    };
  }
  return entry;
}

self.provides_knot_data = function (file, db, components, crossing_numbers, properties) {
  /* Declare a file as being able to provide some knot data. */
  crossing_numbers.forEach(crossing_number => {
    components.forEach(comps => {
      properties.forEach(property => {
        let entry = get_table_loader_entry(db, comps, crossing_number, property);
        if (!entry.loaded && !entry.file) {
          entry.file = file;
        }
      });
    });
  });
};

self.loaded_knot_data = function (db, components, crossing_numbers, properties) {
  /* Record that some knot data has been loaded, to notify anyone who might be waiting for it. */
  crossing_numbers.forEach(crossing_number => {
    components.forEach(comps => {
      properties.forEach(property => {
        let entry = get_table_loader_entry(db, comps, crossing_number, property);
        entry.loaded = true;
      });
    });
  });
  console.log("Loaded knot data db=%s; crossings=%s; components=%s; properties=%s", db, crossing_numbers.join(','), components.join(','), properties.join(','));

  // Update keys for waiting things
  var to_notify = [];
  waiting.forEach(entry => {
    entry.keys = entry.keys.filter(key => !table_loaders[key].loaded);
    if (entry.keys.length === 0) {
      to_notify.push(entry.callback);
    }
  });
  waiting = waiting.filter(entry => entry.keys.length > 0);
  // Notify things waiting on no more keys
  to_notify.forEach(callback => callback());
};

self.add_knot_data = function (db, properties, data) {
  /* Add data to the knot table.  (Does not notify anyone about the loaded data.  Use `loaded_knot_data`). */

  for (let i = 0; i < data.length; i += 1 + properties.length) {
    let name = data[i];
    let entry = table.get(name);
    if (!entry) {
      entry = {name: name, db: db};
      table.set(name, entry);
    }
    properties.forEach((property, j) => {
      entry[property] = data[i + j + 1];
    });
  }
};

function needed_files(db, components, crossing_number, properties) {
  /* Get a list of filenames that still need to be loaded. The `incomplete` key
   refers to whether there are no data files that satisfy the request . */
  let files = [];
  let incomplete = false;
  let missing_entries = [];
  for (let c = 0; c <= crossing_number; c++) {
    properties.forEach(property => {
      let entry = get_table_loader_entry(db, components, c, property);
      if (entry.file) {
        if (!entry.loaded) {
          if (!files.includes(entry.file)) {
            files.push(entry.file);
          }
          missing_entries.push(mk_table_loader_key(db, components, c, property));
        }
      } else {
        incomplete = true;
      }
    });
  }
  return {
    files: files,
    incomplete: incomplete,
    missing_entries: missing_entries
  };
}
self.needed_files = needed_files;

function load_data(filename) {
  if (!requested_files.includes(filename)) {
    requested_files.push(filename);
    let tag = document.createElement("script");
    tag.src = filename + "?v=" + file_version;
    tag.type = "text/javascript";
    tag.async = true;
    document.getElementsByTagName('head')[0].appendChild(tag);
  }
}

function get_knots(db, components, crossings, properties) {
  /* Get list of all knots/links with at most the given number of crossings */

  // First determine which files to load (if any)
  let needed = needed_files(db, components, crossings, properties);
  console.log(needed);

  function _get_knots(resolve) {
    let knots = [];
    table.forEach(knot => {
      if (knot.db === db && knot.components === components && knot.crossing_number <= crossings) {
        knots.push(knot);
      }
    });
    resolve({
      knots: knots,
      incomplete: needed.incomplete
    });
  }

  return new Promise((resolve, reject) => {
    if (needed.files.length > 0) {
      needed.files.forEach(filename => load_data(filename));
      waiting.push({
        callback: () => _get_knots(resolve),
        keys: needed.missing_entries
      });
    } else {
      _get_knots(resolve);
    }
  });
}

self.get_knots = get_knots;

define_invariant("identify_link", async function (mt, diagram) {
  let max_crossing = diagram.crossing_number();
  let is_virtual = diagram.virtual_crossing_number() > 0;

  let names = [];
  let incomplete = false;

  if (is_virtual) {
    let alex_poly = await get_invariant('alexander_poly', diagram);
    let arrow1 = await get_invariant('cabled_arrow_poly', diagram, 1);
    let arrow2 = await get_invariant('cabled_arrow_poly', diagram, 2);

    incomplete = true;

    let table = await get_knots("green", diagram.num_components(), max_crossing,
                                         ["alexander", "arrow1", "arrow2"]);
    incomplete = table.incomplete;

    let alex_coeffs = alex_poly.coeffs();
    let arrowA = [[...arrow1], [...arrow2]];
    let arrowB = [[...arrow1.mirror()], [...arrow2.mirror()]];

    let options = table.knots.filter(o => {
      let matches = equal(alex_coeffs, o.alexander);
      let arrowO = [o.arrow1, o.arrow2];
      matches = matches && (equal(arrowA, arrowO) || equal(arrowB, arrowO));
      return matches;
    });

    names = options.map(o => {
      let obj = {name: o.name};
      if (o.crossing_number <= 4) {
        obj.katlas = "https://www.math.toronto.edu/drorbn/Students/GreenJ/" + o.name + ".html";
      }
      return obj;
    });

  } else {
    let conway_poly = await get_invariant('conway_poly', diagram);
    let conway_coeffs = [conway_poly.minexp()].concat(conway_poly.coeffs());
    let conway_mirror = conway_coeffs.slice();
    for (let i = 1; i < conway_mirror.length; i++) {
      if ((conway_mirror[0] + i - 1) % 2 == 1) {
        conway_mirror[i] = -conway_mirror[i];
      }
    }

    let jones_poly = await get_invariant('jones_poly', diagram);
    let jones_coeffs = jones_poly ? [jones_poly.minexp()].concat(jones_poly.coeffs()) : [0];
    let jones_coeffs_rev = [-jones_coeffs.length + 2 - jones_coeffs[0]].concat(jones_coeffs.slice(1).reverse());

    let table = await get_knots("knotinfo", diagram.num_components(), max_crossing,
                                         ["conway", "jones"]);
    incomplete = table.incomplete;

    let options = table.knots.filter(o => {
      let matches = equal(conway_coeffs, o.conway) && equal(jones_coeffs, o.jones);
      if (!matches) {
        matches = equal(conway_mirror, o.conway) && equal(jones_coeffs_rev, o.jones);
      }
      return matches;
    });

    names = options.map(o => {
      let obj = {name: o.name};
      if (o.katlas) {
        obj.katlas = "http://katlas.math.toronto.edu/wiki/" + o.katlas;
      }
      return obj;
    });
  }

  return {
    names: names,
    incomplete: incomplete
  };
});

const WIDTH = 800;
const HEIGHT = 800;
const PAINT_RADIUS = 1;
const PAINT_GAP = 2;
const ERASE_RADIUS = 5;
const MIN_LINE_LENGTH = 2; // between mouse events
const MAX_PPREV_DIST = 2*PAINT_RADIUS+1 + 2*PAINT_GAP; // for pencil-under
const SPUR_LENGTH = 5; // the maximum-length spurs that will be auto-deleted in clean-up
const ERROR_RADIUS = 6.5; // the radius of the red "error circles"
//export const MAX_GAP_LENGTH = 70; // for under-crossings and gaps in lines

const DIAGRAM_LINE_WIDTH = 3; // the width of the lines when drawing a diagram
const CROSSING_GAP = 8; // the gap for drawing crossings
const CROSSING_CHANGE_RADIUS = 10; // the radius of the disk shown when hovering over a crossing
const VIRTUAL_RADIUS = 8; // the radius for the circle at a virtual crossing

/* Colors for link components */
const palette = [
  0x000000,
  0x0000ff,
  0xff0000,
  0x00cc00,
  0x888888,
  0x00aaee,
  0x00ff00,
  0xee00ee,
  0xee8800,
  0xffee00
];

let global_tool_state$1 = {
  tool: "crossing-change"
};

let default_pd_type = "KnotTheory";
let default_laurent_type = "DOM";

let global_details_states = {
  "linking-matrix": true,
  "seifert-matrix": false,
  "alexander-module": false
};
function attach_details_handler(name, $details) {
  let initial_state = Boolean(global_details_states[name]);
  $details.prop("open", initial_state);
  $details.on("toggle", e => {
    global_details_states[name] = $details.prop("open");
  });
}

class KnotDiagramView {
  constructor(width, height, diagram) {
    assert(width > 0);
    assert(height > 0);
    assert(diagram instanceof KnotGraph);
    this.width = width;
    this.height = height;
    this.diagram = diagram;

    this.c = new Point(0, 0);
    this.zoom = 1;
    this.moving = null; // if we are currently translating the diagram, is a Point

    this.mode_name = "Diagrams"; // constant
  }

  copy() {
    let view = new KnotDiagramView(this.width, this.height, this.diagram.copy());
    view.c = this.c.copy();
    view.zoom = this.zoom;
    return view;
  }

  reset_zoom() {
    this.c = new Point(0, 0);
    this.zoom = 1;
  }

  mouse_to_pt(pt) {
    assert(pt instanceof Point);
    return new Point(this.zoom*(pt.x - this.c.x), this.zoom*(pt.y - this.c.y));
  }

  find_closest_crossing(pt) {
    /* Returns a vertex id for the diagram, or null.  Gets a non-P vertex. */
    let diag = this.diagram;
    let dist = CROSSING_CHANGE_RADIUS*this.zoom;
    let closest = null;
    diag.verts.forEach((vert, vid) => {
      if (!(diag.adjs[vid] instanceof P)) {
        let d = Point.dist(pt, vert);
        if (d <= dist) {
          dist = d;
          closest = vid;
        }
      }
    });
    return closest;
  }
  
  draw_crossing_disk(ctxt, cpt) {
    let getX = (x) => {
      return x/this.zoom+this.c.x;
    };
    let getY = (y) => {
      return y/this.zoom+this.c.y;
    };
    ctxt.save();
    ctxt.fillStyle = "#0000ff";
    ctxt.globalAlpha = 0.2;
    ctxt.beginPath();
    ctxt.arc(getX(cpt.x)+0.5, getY(cpt.y)+0.5, CROSSING_CHANGE_RADIUS, 0, 2*Math.PI);
    ctxt.fill();
    ctxt.restore();
  }

  find_closest_circuit(pt) {
    /* Returns a list of darts of the closest circuit to the given point. */
    let diag = this.diagram;
    let dist = 3*DIAGRAM_LINE_WIDTH*this.zoom;
    let closest_eid = null;
    diag.edges.forEach((edge, eid) => {
      let d = segment_distance(diag.verts[edge[0]], diag.verts[edge[1]], pt);
      if (d <= dist) {
        dist = d;
        closest_eid = eid;
      }
    });
    if (closest_eid == null) {
      return null;
    }
    return diag.dart_circuit(closest_eid+1);
  }
  highlight_circuit(ctxt, circuit) {
    let getX = (x) => {
      return x/this.zoom+this.c.x;
    };
    let getY = (y) => {
      return y/this.zoom+this.c.y;
    };

    let diag = this.diagram;
    let pts = circuit.map(dart => diag.verts[diag.dart_start(dart)]);
    ctxt.save();
    ctxt.strokeStyle = "#0000ff";
    ctxt.globalAlpha = 0.2;
    ctxt.lineWidth = 3*DIAGRAM_LINE_WIDTH;
    ctxt.beginPath();
    pts.forEach(cpt => {
      ctxt.lineTo(getX(cpt.x)+0.5, getY(cpt.y)+0.5);
    });
    ctxt.closePath();
    ctxt.stroke();
    ctxt.restore();

  }

  mousedown(pt, e, undo_stack, ctxt) {
    pt = this.mouse_to_pt(pt);
    let tool = global_tool_state$1.tool;
    if (this.moving) {
      tool = "";
    }
    // In each tool, fall-through means the view movement tool should take over.
    // An explicit return is necessary to prevent this.
    if (tool === "crossing-change") {
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        let view = this.copy();
        let adj = view.diagram.adjs[closest];
        if (adj instanceof X) {
          adj.push(adj.shift());
        } else if (adj instanceof Virtual) {
          view.diagram.adjs[closest] = X.make(...adj);
        } else {
          assert(false);
        }
        undo_stack.push(view);
        view.draw_crossing_disk(ctxt, view.diagram.verts[closest]);
        return;
      }
    } else if (tool === "virtual-crossing") {
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        let view = this.copy();
        let adj = view.diagram.adjs[closest];
        if (adj instanceof X) {
          view.diagram.adjs[closest] = Virtual.make(...adj);
        } else if (adj instanceof Virtual) {
          view.diagram.adjs[closest] = X.make(...adj);
        } else {
          assert(false);
        }
        undo_stack.push(view);
        view.draw_crossing_disk(ctxt, view.diagram.verts[closest]);
        return;
      }
    } else if (tool === "toggle-orientation") {
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        view.diagram.reverse_orientation(circuit[0]);
        undo_stack.push(view);
        view.highlight_circuit(ctxt, circuit);
        return;
      }
    } else if (tool === "delete-component") {
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        view.diagram.delete_component(circuit[0]);
        undo_stack.push(view);
        return;
      }
    } else if (tool.startsWith("set-color-")) {
      let color = +tool.slice("set-color-".length);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        circuit.forEach(dart => {
          let edge = view.diagram.dart_edge(dart);
          edge[2] = color;
        });
        undo_stack.push(view);
        view.highlight_circuit(ctxt, circuit);
        return;
      }
    }
    // Fell through, so set up view translation.
    if (e.button === 0) {
      this.moving = pt;
    }
  }
  mousemove(pt, e, undo_stack, ctxt) {
    pt = this.mouse_to_pt(pt);
    if (this.moving) {
      let old_c = this.c.copy();
      this.c.x += (pt.x - this.moving.x) / this.zoom;
      this.c.y += (pt.y - this.moving.y) / this.zoom;
      this.paint(ctxt);
      this.c = old_c;
      return;
    }
    let tool = global_tool_state$1.tool;
    if (tool === "crossing-change") {
      this.paint(ctxt);
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        this.draw_crossing_disk(ctxt, this.diagram.verts[closest]);
      }
    } else if (tool === "virtual-crossing") {
      this.paint(ctxt);
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        this.draw_crossing_disk(ctxt, this.diagram.verts[closest]);
      }
    } else if (tool === "toggle-orientation") {
      this.paint(ctxt);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        this.highlight_circuit(ctxt, circuit);
      }
    } else if (tool === "delete-component") {
      this.paint(ctxt);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        this.highlight_circuit(ctxt, circuit);
      }
    } else if (tool.startsWith("set-color-")) {
      this.paint(ctxt);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        this.highlight_circuit(ctxt, circuit);
      }
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    pt = this.mouse_to_pt(pt);
    if (this.moving) {
      this.c.x += (pt.x - this.moving.x) / this.zoom;
      this.c.y += (pt.y - this.moving.y) / this.zoom;
      this.moving = null;
      this.paint(ctxt);
      return;
    }
  }
  mousewheel(pt, e, undo_stack, ctxt) {
    if (this.moving) {
      // Let's not try interleaving these operations
      return;
    }
    let delta = Math.sign(e.deltaY);
    let kpt = this.mouse_to_pt(pt);
    this.zoom *= Math.pow(1.05, delta);
    let zkpt = this.mouse_to_pt(pt);
    this.c.x += (zkpt.x - kpt.x) / this.zoom;
    this.c.y += (zkpt.y - kpt.y) / this.zoom;
    this.paint(ctxt);
  }
  toolbox(undo_stack) {
    let $div = this.$div = Q.div();

    let diagram = this.diagram;

    /* Modification tools */
    Q.create("h2").append("Modification tools").appendTo($div);
    let $tools = Q.div().appendTo($div);

    Q.span(Q.span({className:"icon24-crossing"}))
        .addClass("icon-button")
        .prop("data-tool", "crossing-change")
        .prop("title", "Change crossing type")
        .appendTo($tools);

    Q.span(Q.span({className:"icon24-virtual-crossing"}))
        .addClass("icon-button")
        .prop("data-tool", "virtual-crossing")
        .prop("title", "Toggle virtual crossing")
        .appendTo($tools);

    Q.span(Q.span({className:"icon24-two-arrows"}))
        .addClass("icon-button")
        .prop("data-tool", "toggle-orientation")
        .prop("title", "Toggle component orientation")
        .appendTo($tools);

    Q.span(Q.span({className:"icon24-trash"}))
        .addClass("icon-button")
        .prop("data-tool", "delete-component")
        .prop("title", "Delete component")
        .appendTo($tools);

    $tools.append(Q.create("br"));
    palette.forEach((hex, i) => {
      let $b = Q.span().addClass("icon-button")
          .prop("data-tool", "set-color-" + (i+1))
          .prop("title", "Recolor component to color " + (i+1))
          .appendTo($tools);
      Q.span(" ").addClass("icon-color")
          .css("background", hex_to_rgb(hex))
          .appendTo($b);
    });

    this.update_tool = (toolname) => {
      $div.query(".icon-button").forEach($e => {
        let button_tool = $e.prop("data-tool");
        if (typeof button_tool === "string") {
          $e.toggleClass("active", button_tool === toolname);
        }
      });
    };
    this.update_tool(global_tool_state$1.tool);

    $tools.on("click", e => {
      let el = e.target.closest('.icon-button');
      if (el) {
        let tool = Q(el).prop('data-tool');
        if (typeof tool === "string") {
          e.preventDefault();
          e.stopPropagation();
          global_tool_state$1.tool = tool;
          this.update_tool(tool);
        }
      }
    });

    let $mirror = Q.create("input")
        .prop("type", "button")
        .value("Mirror")
        .prop("title", "Change the types of all crossings")
        .appendTo($div);
    $mirror.on("click", e => {
      let view = this.copy();
      view.diagram.adjs.forEach(a => {
        a.push(a.shift());
      });
      undo_stack.push(view);
    });

    let $invert = Q.create("input")
        .prop("type", "button")
        .value("Invert")
        .prop("title", "Change orientations of each component")
        .appendTo($div);
    $invert.on("click", e => {
      let view = this.copy();
      view.diagram.edges.forEach(edge => {
        let t_vert = edge[0];
        edge[0] = edge[1];
        edge[1] = t_vert;
      });
      view.diagram.adjs = view.diagram.adjs.map(a => a.map(d => -d));
      undo_stack.push(view);
    });

    let $alternating = Q.create("input")
        .prop("type", "button")
        .value("Make alternating")
        .prop("title", "Change types of crossings to make an alternating diagram")
        .appendTo($div);
    $alternating.on("click", e => {
      let view = this.copy();
      view.diagram.make_alternating();
      undo_stack.push(view);
    });
    $div.append(Q.create("input", {type: "button",
                                   title: "Assign distinct colors to each component"})
                .value("Auto-color")
                .on("click", e => {
                  let view = this.copy();
                  view.diagram.auto_color(palette.length);
                  undo_stack.push(view);
                }));

    $div.append(Q.create("br"));

    let $to_drawing = Q.create("input")
        .prop("type", "button")
        .value("Convert to drawing")
        .prop("title", "Convert the diagram back into a drawing for free-form editing (no round-trip guarantee)")
        .appendTo($div);
    $to_drawing.on("click", e => {
      let canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      let ctxt = canvas.getContext("2d");
      this.paint(ctxt, false, false);
      let view = new KnotRasterView(this.width, this.height);
      view.fromImage(ctxt.getImageData(0, 0, this.width, this.height));
      undo_stack.push(view);
    });

    $div.append(Q.create("h2").append("Isotopy tools"));

    let $beautify = Q.create("input")
        .prop("type", "button")
        .value("Beautify")
        .prop("title", "Redraw using a Tutte embedding of a subdivision of the diagram")
        .appendTo($div);
    $beautify.on("click", e => {
      let view = this.copy();
      view.diagram.beautify();
      view.reset_zoom();
      undo_stack.push(view);
    });

    let $reset_zoom = Q.create("input")
        .prop("type", "button")
        .value("Reset view")
        .prop("title", "Reset center of diagram and zoom level")
        .appendTo($div);
    $reset_zoom.on("click", e => {
      let view = this.copy();
      view.reset_zoom();
      undo_stack.push(view);
    });

    $div.append(Q.create("hr"));

    let $laurent_types = Q.create("form", {className: "inline-form"},
                                  Q.create("label",
                                           {title: "Pretty print data using fancy HTML"},
                                           Q.create("input", {type: "radio",
                                                              name: "laurent-type",
                                                              value: "DOM"}),
                                           "Pretty"),
                                  Q.create("label",
                                           {title: "Print data in a Mathematica-compatible format"},
                                           Q.create("input", {type: "radio",
                                                              name: "laurent-type",
                                                              value: "Mathematica"}),
                                           "Mathematica"));
    $laurent_types[0].elements['laurent-type'].value = default_laurent_type;
    let laurent_handlers = [];
    $laurent_types.on("change", function (e) {
      let name = this.elements['laurent-type'].value;
      $laurent_types[0].elements['laurent-type'].value = default_laurent_type = name;
      laurent_handlers.forEach(h => h());
    });
    $div.append(Q.create("div", {style: "float: right;"},
                         $laurent_types));


    $div.append(Q.create("h2").append("Diagram information"));

    let virtual_crossings = this.diagram.virtual_crossing_number();
    let virtual_genus = this.diagram.virtual_genus();

    let $idiv = Q.create("div").prop("id", "diag-info").appendTo($div);
    {
      let $table = Q.create("table", {className:"diag-props"});
      $idiv.append($table);

      $table.append(Q.create("tr",
                             Q.create("th", "Crossings:"),
                             Q.create("td", ''+this.diagram.crossing_number())));

      if (virtual_crossings > 0) {
        $table.append(Q.create("tr",
                               Q.create("th", "Virtual crossings:"),
                               Q.create("td", ''+virtual_crossings)));
      }

      $table.append(Q.create("tr",
                             Q.create("th", "Components:"),
                             Q.create("td", ''+this.diagram.num_components())));

      $table.append(Q.create("tr",
                             Q.create("th", "Writhe:"),
                             Q.create("td", ''+this.diagram.writhe())));

      $table.append(Q.create("tr",
                             Q.create("th", "Bridges:"),
                             Q.create("td", ''+this.diagram.bridge_number())));

      if (virtual_crossings > 0) {
        $table.append(Q.create("tr", {title: "The virtual genus for this diagram"},
                               Q.create("th", "Virtual genus:"),
                               Q.create("td", ''+virtual_genus)));
      }

      if (virtual_crossings === 0) {
        $table.append(Q.create("tr", {title: "The canonical Seifert genus for this diagram"},
                               Q.create("th", "Can. genus:"),
                               Q.create("td", ''+this.diagram.genus())));
      }

      let props = [];
      if (diagram.is_alternating()) {
        props.push("alternating");
      }

      if (virtual_genus === 0) {
        let turaev = this.diagram.turaev();
        $table.append(Q.create("tr",
                               Q.create("th", "Turaev genus:"),
                               Q.create("td", ''+turaev.genus)));
        if (turaev.plus && turaev.minus) {
          props.push("adequate");
        } else if (turaev.plus) {
          props.push("plus-adequate");
        } else if (turaev.minus) {
          props.push("minus-adequate");
        }
      }

      $table.append(Q.create("tr",
                             Q.create("th", "Properties:"),
                             Q.create("td", props.length > 0 ? props.join(", ") : Q.create("em", "none"))));

      let $lm = Q.create("details",
                         {title: "Pairwise linking numbers between colored components. Self linking number is writhe."},
                         Q.create("summary", "Linking matrix"))
          .appendTo($idiv);
      attach_details_handler("linking-matrix", $lm);
      {
        let matrix = this.diagram.linking_matrix();
        let comps = Array.from(matrix.keys());
        comps.sort((a, b) => a-b);
        let $table = Q.create("table").addClass("linking-matrix");
        comps.forEach(j => {
          let $tr = Q.create("tr").appendTo($table);
          comps.forEach(i => {
            let $td = Q.create("td").appendTo($tr);
            $td.append(''+(matrix.get(j).get(i)||0));
            if (i === j) {
              $td.prop("style").color = "white";
              $td.prop("style").background = hex_to_rgb(palette[i-1]);
            }
          });
        });
        $lm.append($table);
      }
    }

    if (virtual_genus === 0) {
      let $sf = Q.create("details",
                         {title:"There is one Seifert linking matrix per connected component of the diagram."},
                         Q.create("summary", "Seifert form"))
          .appendTo($idiv);

      attach_details_handler("seifert-matrix", $sf);

      let $sf_div = Q.create("div").appendTo($sf);

      function mk_seifert_matrix() {
        $sf_div.empty();
        switch (default_laurent_type) {
        case "DOM":
          diagram.seifert_form().forEach(matrix => {
            let $table = Q.create("table", {className:"seifert-matrix"});
            matrix.forEach(row => {
              let $tr = Q.create("tr").appendTo($table);
              row.forEach(c => {
                $tr.append(Q.create("td", ''+c));
              });
            });
            $sf_div.append($table);
          });
          break;
        case "Mathematica":
        default:
          diagram.seifert_form().forEach(matrix => {
            let m = '{' + matrix.map(row => '{' + row.map(c => ''+c).join(', ') + '}').join(', ') + '}';
            $sf_div.append(Q.create('div').append(m));
          });
          break;
        }
      }

      mk_seifert_matrix();
      laurent_handlers.push(mk_seifert_matrix);
    }

    // let $sig;
    // $table.append(Q.create("tr", {title: "The program currently uses floating point arithmetic to compute eigenvalues, hence the warning."},
    //                        Q.create("th", "Signature:"),
    //                        $sig = Q.create("td", ''+the_signature+" ",
    //                                        Q.create("em", "(warning: estimated)"))));


    let $pd = Q.create("textarea")
        .attr("readonly", true)
        .addClass("code-data");
    let $pdtypes = Q.create("form", {className: "inline-form"},
                            Q.create("label",
                                     Q.create("input", {type: "radio",
                                                        name: "pd-type",
                                                        value: "KnotTheory"}),
                                     "KnotTheory"),
                            Q.create("label",
                                     Q.create("input", {type: "radio",
                                                        name: "pd-type",
                                                        value: "KnotTheory-oriented"}),
                                     "Oriented KnotTheory"),
                            Q.create("label",
                                     Q.create("input", {type: "radio",
                                                        name: "pd-type",
                                                        value: "SnapPy"}),
                                     "SnapPy"),
                           );
    function pd_change(name) {
      $pdtypes[0].elements['pd-type'].value = default_pd_type = name;
      try {
        if (name === "KnotTheory") {
          $pd.value(diagram.get_pd().toMathematica());
        } else if (name === "KnotTheory-oriented") {
          $pd.value(diagram.get_pd(true).toMathematica());
        } else if (name === "SnapPy") {
          $pd.value(diagram.get_pd().toSnappy());
        }
      } catch (x) {
        $pd.value("" + x);
      }
    }
    $pdtypes.on("change", function (e) {
      let name = this.elements['pd-type'].value;
      pd_change(name);
    });
    $idiv.append(Q.create("p")
                 .append("PD: ")
                 .append($pdtypes, Q.create("br"), $pd));
    pd_change(default_pd_type);

    if (virtual_genus === 0) {
      let dt = diagram.get_dt();
      if (dt) {
        $idiv.append(Q.create("p", {title: "The Dowker-Thistlethwaite code for the knot."})
                     .append("DT: " + toString$1(dt)));
      }
    }

    function laurent_invariant(promise, div, variable="t", exp_divisor=1) {
      div.append(Q.create("em", "calculating..."));
      promise.then(poly => {
        let e = poly.toExpr(variable, exp_divisor);
        function show_poly() {
          div.empty();
          switch (default_laurent_type) {
          case "DOM":
            div.append(e.toDOM());
            break;
          case "Mathematica":
          default:
            div.append(e.toMathematica());
            break;
          }
        }
        if (poly) {
          show_poly();
          laurent_handlers.push(show_poly);
        } else {
          div.append("n/a");
        }
      }, err => {
        console.log(err);
        div.addClass("calc-error");
        div.append('Error: '+err);
      });
    }

    function mlaurent_invariant(promise, div, variables, exp_divisor=1) {
      div.append(Q.create("em", "calculating..."));
      promise.then(poly => {
        let split = make_int_const(0);
        poly.coeffs().forEach(pair => {
          split = plus(split,
                            times(pair[0].toExpr(variables, exp_divisor),
                                       pair[1].toExpr(variables)));
        });
        function show_poly() {
          div.empty();
          switch (default_laurent_type) {
          case "DOM":
            div.append(split.toDOM());
            break;
          case "Mathematica":
          default:
            div.append(split.toMathematica());
            break;
          }
        }
        if (poly) {
          show_poly();
          laurent_handlers.push(show_poly);
        } else {
          div.append("n/a");
        }
      }, err => {
        console.log(err);
        div.addClass("calc-error");
        div.append('Error: '+err);
      });
    }

    var $kb_div;
    $idiv.append(Q.create("p")
                 .append("Kauffman bracket:")
                 .append($kb_div = Q.create("div")));
    laurent_invariant(get_invariant("kauffman_bracket", this.diagram), $kb_div, "A");

    $idiv.append(Q.create("h2").append("Identification"));
    let $ident = Q.create("p").appendTo($idiv);
    get_invariant('identify_link', this.diagram).then(
      res => {
        if (res.names.length === 0) {
          $ident.append("Unknown link");
        } else {
          $ident.append("Candidates: ");
          res.names.forEach((c, i) => {
            if (i > 0) {
              $ident.append(", ");
            }
            if (c.katlas) {
              $ident.append(Q.create("a", {href: c.katlas,
                                           target: "_blank"},
                                     c.name));
            } else {
              $ident.append(c.name);
            }
          });
        }
        if (res.incomplete) {
          $ident.append(" (warning: possibly incomplete)");
        }
      },
      err => {
        console.error(err);
        $ident.addClass("calc-error");
        $ident.append('Error: '+err);
      }
    );

    $idiv.append(Q.create("h2").append("Invariants"));

    {
      let $table = Q.create("table", {className:"diag-props"});
      $idiv.append($table);

      let $det;
      $table.append(Q.create("tr",
                             Q.create("th", "Determinant:"),
                             $det = Q.create("td")));

      (async function () {
        let poly = await get_invariant("alexander_poly", diagram, 0);
        let coeffs = poly.coeffs();
        let det = 0;
        for (let i = 0; i < coeffs.length; i++) {
          det += coeffs[i] * (2 * (i % 2) - 1);
        }
        $det.append('' + Math.abs(det));
      })();


      let next_cjones = 1;

      let $nextJones = Q.create("input")
          .prop("type", "button")
          .value("Next")
          .prop("title", "Compute next cabled Jones polynomial");
      $nextJones.on("click", e => {
        do_cjones(next_cjones++);
      });

      let $jones = Q.create("div");
      $idiv.append(Q.create("p")
                   .append("(Cabled) Jones polynomials: ")
                   .append($nextJones)
                   .append($jones));

      const do_cjones = (i) => {
        next_cjones = i + 1;
        let $cj = Q.create("span");
        $jones.append(Q.create("div").append("V", Q.create("sub", i), " = ", $cj));
        laurent_invariant(get_invariant('cabled_jones_poly', this.diagram, i), $cj, "t", -4);
      };

      do_cjones(1);

      if (virtual_genus > 0) {

        let next_carrow = 1;

        let $next_carrow = Q.create("input")
            .prop("type", "button")
            .value("Next")
            .prop("title", "Compute next cabled Arrow polynomial");
        $next_carrow.on("click", e => {
          do_carrow(next_carrow++);
        });

        let $carrow = Q.create("div");
        $idiv.append(Q.create("p")
                     .append("(Cabled) Arrow polynomials: ")
                     .append($next_carrow)
                     .append($carrow));

        const do_carrow = (i) => {
          next_carrow = i + 1;
          let $cj = Q.create("span");
          $carrow.append(Q.create("div").append("A", Q.create("sub", i), " = ", $cj));
          function arrow_varnames_t(i) {
            if (i === 0) {
              return "t";
            } else {
              return "K" + i;
            }
          }
          mlaurent_invariant(get_invariant('cabled_arrow_poly', this.diagram, i), $cj, arrow_varnames_t, -4);
        };

        do_carrow(1);

      }

      if (virtual_genus === 0) {
        let $conway_poly;
        $idiv.append(Q.create("p")
                     .append("Conway potential:")
                     .append($conway_poly = Q.create("div")));
        laurent_invariant(get_invariant("conway_poly", diagram), $conway_poly, "z");
      }

      let $alex_polys = Q.create("p").append("Alexander polynomials:").appendTo($idiv);
      (async function () {
        try {
          for (let n = 0; ; n++) {
            let poly = await get_invariant("alexander_poly", diagram, n);
            if (n >= 1 && poly.equal(Laurent.unit)) {
              break;
            }
            $alex_polys.append(Q.create("br"));
            $alex_polys.append("\u0394");
            $alex_polys.append(Q.create("sup").append(''+n));
            $alex_polys.append("(t) = "); //, poly.toDOM("t"));
            let $span = Q.create("span").appendTo($alex_polys);
            laurent_invariant(new Promise((resolve) => resolve(poly)),
                              $span);
          }
        } catch (x) {
          $alex_polys.append(Q.create("div", {className: "calc-error"}, ''+x));
          throw x;
        }
      })();

      let $alex_mod = Q.create("details",
                               {title:"Mildly simplified (not normalized since Z[t,t^-1] is not a PID)"},
                               Q.create("summary", "An Alexander module presentation matrix:"))
          .appendTo($idiv);
      attach_details_handler("alexander-module", $alex_mod);
      (async function () {
        let matrix = await get_invariant('alexander_module', diagram);
        let $table = Q.create("table").addClass("alexander-matrix");
        matrix.forEach(row => {
          let $tr = Q.create("tr").appendTo($table);
          row.forEach(entry => {
            let $td = Q.create("td").appendTo($tr);
            $td.append(entry.toExpr("t").toDOM());
          });
        });
        $alex_mod.append($table);
        $alex_mod.append(Q.create("em").append("(" + matrix.length + " generator(s))"));
      })();

    }
    
    return $div;
  }

  paint(ctxt, with_arrows=true, with_virtual=true) {
    ctxt.save();
    ctxt.fillStyle = "white";
    ctxt.fillRect(0, 0, this.width, this.height);

    let getX = (x) => {
      return x/this.zoom+this.c.x;
    };
    let getY = (y) => {
      return y/this.zoom+this.c.y;
    };

    let diag = this.diagram;

    let seen_darts = new Set;

    let visit_dart = (dart) => {
      if (seen_darts.has(dart)) return;

      // locate beginning of path
      function opp_is_under(d) {
        /* Is the opposite of the dart an under-dart? */
        d = diag.opp_dart(d);
        return diag.dart_adj(d) instanceof X && !diag.dart_is_over(d);
      }
      // Switch to opposite orientation if needed, then walk until we get to beginning of arc.
      if (diag.dart_start(dart) === diag.dart_edge(dart)[0]) {
        dart = diag.opp_dart(dart);
      }
      let d = dart;
      while (!opp_is_under(d)) {
        d = diag.through_dart(d);
        if (d === dart) break;
      }
      dart = diag.opp_dart(d);
      // now dart is beginning of an arc (or some random dart from a loop)

      let path = [];
      let loop = false;
      d = dart;
      while (true) {
        seen_darts.add(d);
        seen_darts.add(diag.opp_dart(d));
        path.push(diag.verts[diag.dart_start(d)]);
        if (opp_is_under(d)) {
          path.push(diag.verts[diag.dart_end(d)]);
          break;
        }
        if (path.length > 1 && d === dart) {
          loop = true;
          break;
        }
        d = diag.through_dart(d);
      }

      if (!loop) {
        let to_remove = CROSSING_GAP * this.zoom;
        while (to_remove > 0 && path.length >= 2) {
          let d = Point.dist(path[0], path[1]);
          if (d <= to_remove) {
            to_remove -= d;
            path.shift();
          } else {
            path[0] = point_along(path[0], path[1], to_remove/d);
            break;
          }
        }
        to_remove = CROSSING_GAP * this.zoom;
        while (to_remove > 0 && path.length >= 2) {
          let d = Point.dist(path[path.length-2], path[path.length-1]);
          if (d <= to_remove) {
            to_remove -= d;
            path.pop();
          } else {
            path[path.length-1] = point_along(path[path.length-1], path[path.length-2], to_remove/d);
            break;
          }
        }
      }

      ctxt.beginPath();
      ctxt.moveTo(getX(path[0].x)+0.5, getY(path[0].y)+0.5);
      for (let i = 1; i < path.length; i++) {
        let v = path[i];
        ctxt.lineTo(getX(v.x)+0.5, getY(v.y)+0.5);
      }
      ctxt.strokeStyle = hex_to_rgb(palette[diag.dart_edge(dart)[2]-1]);
      ctxt.lineWidth = DIAGRAM_LINE_WIDTH;
      ctxt.lineCap = "round";
      ctxt.stroke();

      // arrow head
      if (with_arrows) {
        let p = path[path.length-1];
        let dx = 0, dy = 0;
        let dist = 5;
        for (let i = path.length-2; i >= 0 && dist > 0; i--) {
          let p1 = path[i], p2 = path[i+1];
          dx += p2.x - p1.x;
          dy += p2.y - p1.y;
          dist -= Point.dist(p1, p2);
        }
        let norm = Math.sqrt(dx*dx + dy*dy);
        if (norm > 0) {
          dx /= norm;
          dy /= norm;
          ctxt.beginPath();
          function f_x(x, y) {
            // x is in direction of arrow tip
            return getX(p.x) + dx*x - dy*y + 0.5;
          }
          function f_y(x, y) {
            return getY(p.y) + dy*x + dx*y + 0.5;
          }
          ctxt.moveTo(f_x(-5, 2), f_y(-5, 2));
          ctxt.lineTo(f_x(0, 0), f_y(0, 0));
          ctxt.lineTo(f_x(-5, -2), f_y(-5, -2));
          ctxt.stroke();
        }
      }
    };

    diag.edges.forEach((e, i) => {
      visit_dart(i+1);
    });

    // draw virtual crossing circles
    if (with_virtual) {
      diag.adjs.forEach((adj, vid) => {
        if (adj instanceof Virtual) {
          let pt = diag.verts[vid];
          ctxt.beginPath();
          ctxt.arc(getX(pt.x)+0.5, getY(pt.y)+0.5, VIRTUAL_RADIUS, 0, 2*Math.PI);
          ctxt.stroke();
        }
      });
    }

    ctxt.restore();
  }
}

// View for painting knots

const EPSILON = 1e-2;

let global_painting_state = {
  mode: "pencil",
  color: 1,
  go_over: 1
};

class KnotRasterView {
  constructor(width, height) {
    assert(width > 0);
    assert(height > 0);
    this.width = width;
    this.height = height;
    this.buffer = new Int8Array(this.width * this.height);
    this.temp = new Int8Array(this.width * this.height);

    this.mode_name = "Painting"; // constant
    this.next_knot = null;
  }
  
  copy() {
    let kb = new KnotRasterView(this.width, this.height);
    kb.buffer.set(this.buffer);
    return kb;
  }

  mousedown(pt, e, undo_stack, ctxt) {
    if (e.button === 0 || e.button === 2) {
      if (this.next_knot) {
        this.mousemove(pt, e, undo_stack, ctxt);
        return;
      }
      this.next_knot = this.copy();
      if (e.button === 0) {
        if (global_painting_state.mode === "eraser") {
          this.the_color = 0;
        } else {
          this.the_color = global_painting_state.color;
        }
      } else {
        this.the_color = 0;
        if (this.mark_tool) {
          this.mark_tool("eraser");
        }
      }
      let go_over = global_painting_state.go_over * (e.shiftKey ? -1 : 1);
      this.mark_height(go_over);
      this.next_knot.draw_line(null, null, pt, this.the_color, go_over);
      this.pprev = [];
      this.pt1 = pt;
      this.paint(ctxt);
    }
  }
  mousemove(pt2, e, undo_stack, ctxt) {
    if (this.next_knot) {
      if (Point.dist(this.pt1, pt2) < MIN_LINE_LENGTH) {
        return;
      }
      let go_over = global_painting_state.go_over * (e.shiftKey ? -1 : 1);
      this.mark_height(go_over);
      this.next_knot.draw_line(this.pprev, this.pt1, pt2, this.the_color, go_over);
      this.pprev.push(this.pt1);
      this.pt1 = pt2;

      { // Keep only MAX_PPREV_DIST of pprev.
        let length = Point.dist(this.pprev[this.pprev.length-1], this.pt1);
        for (let i = 1; i + 1 < this.pprev.length; i++) {
          length += Point.dist(this.pprev[i], this.pprev[i+1]);
        }
        while (length >= MAX_PPREV_DIST && this.pprev.length > 2) {
          this.pprev.shift();
          length -= Point.dist(this.pprev[0], this.pprev[1]);
        }
      }

      this.paint(ctxt);
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    if (this.next_knot) {
      this.mousemove(pt, e, undo_stack, ctxt);
      let knot = this.next_knot;
      this.next_knot = null;
      undo_stack.push(knot);
    }
  }
  toolbox(undo_stack) {
    let $div = this.$div = Q.div();

    /* Tools */
    $div.append(
      Q.create("div",
               Q.create("h2", "Tools"),

               Q.create("span", {"data-tool": "pencil",
                                 title: "Pencil",
                                 className: "icon-button"},
                        Q.create("span", {className: "icon24-pencil"})),

               Q.create("span", {"data-tool": "eraser",
                                 title: "Eraser [right click]",
                                 className: "icon-button"},
                        Q.create("span", {className: "icon24-eraser"}))
              )
        .on("click", e => {
          let el = e.target.closest('.icon-button');
          if (el) {
            let mode = el['data-tool'];
            if (mode) {
              e.preventDefault();
              e.stopPropagation();
              global_painting_state.mode = mode;
              this.mark_tool(mode);
            }
          }
        })
    );

    this.mark_tool = function (toolname) {
      /* Set a tool button to be active, depending on the mode */

      $div.query(".icon-button").forEach($e => {
        let button_tool = $e.prop("data-tool");
        if (typeof button_tool === "string") {
          $e.toggleClass("active", button_tool === toolname);
        }
      });
    };
    this.mark_tool(global_painting_state.mode);

    /* Over/under */
    $div.append(
      Q.create("div",
               Q.create("h2").append("Pencil mode"),

               /* over */
               Q.create("span", {"data-height": 1,
                                 title: "Go over",
                                 className: "icon-button"},
                        Q.create("span", {className: "icon24-go-over"})),
               /* same */
               Q.create("span", {"data-height": 0,
                                 title: "Go through (no auto-gaps)",
                                 className: "icon-button"},
                        Q.create("span", {className: "icon24-go-through"})),
               /* under */
               Q.create("span", {"data-height": -1,
                                 title: "Go under [shift]",
                                 className: "icon-button"},
                        Q.create("span", {className: "icon24-go-under"})),

              )
        .on("click", e => {
          let el = e.target.closest('.icon-button');
          if (el) {
            let height = Q(el).prop("data-height");
            if (typeof height === "number") {
              e.preventDefault();
              e.stopPropagation();
              global_painting_state.go_over = height;
              this.mark_height(height);
              global_painting_state.mode = "pencil";
              this.mark_tool("pencil");
            }
          }
        })
    );

    this.mark_height = function (go_over) {
      $div.query(".icon-button").forEach($e => {
        let button_height = $e.prop("data-height");
        if (typeof button_height === "number") {
          $e.toggleClass("active", go_over === button_height);
        }
      });
    };
    this.mark_height(global_painting_state.go_over);

    { /* Colors */
      let $colors = Q.div().appendTo($div);
      $colors.append(Q.create("h2", "Pencil colors"));
      palette.forEach((hex, i) => {
        $colors.append(Q.create("span", {className: "icon-button",
                                         "data-color": i+1,
                                         title: "Color " + (i+1)},
                                Q.create("span", {className: "icon-color"})
                                .css("background", hex_to_rgb(hex))));
      });
      $colors.on("click", e => {
        let el = e.target.closest('.icon-button');
        if (el) {
          let color = Q(el).prop("data-color");
          if (color) {
            e.preventDefault();
            e.stopPropagation();
            global_painting_state.color = color;
            this.mark_color(color);
            global_painting_state.mode = "pencil";
            this.mark_tool("pencil");
          }
        }
      }, true);

      this.mark_color = function (i) {
        /* Set a color button to be active, depending on the color index i. */
        $colors.query(".icon-button").forEach(b => {
          b.toggleClass("active", b.prop("data-color") === i);
        });
      };
      this.mark_color(global_painting_state.color);
    }

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Load an image from a file (can also drag and drop from the filesystem or sometimes copy and paste)"},
               "Load image: ",
               Q.create("input", {type: "file", accept: "image/*"})
               .on("change", e => {
                 let file = e.target.files[0];
                 if (file) {
                   let reader = new FileReader();
                   reader.readAsDataURL(file);
                   reader.onloadend = () => {
                     let img = document.createElement("img");
                     img.onload = () => {
                       undo_stack.push(new KnotImageImportView(WIDTH, HEIGHT, img));
                     };
                     img.src = reader.result;
                   };
                 }
               })
              ));

    $div.append(Q.create("hr"));

    $div.append(Q.create("input", {type: "button",
                                   title: "Find cores of curves by morphological thinning"})
                .value("Clean up")
                .on("click", e => {
                  let knot = this.copy();
                  knot.clean_up();
                  undo_stack.push(knot);
                }));

    $div.append(Q.create("br"));

    $div.append(Q.create("input", {type: "button",
                                   title: "Clear boundary pixels of curves"})
                .value("Thin")
                .on("click", e => {
                  let knot = this.copy();
                  knot.thin();
                  undo_stack.push(knot);
                }));

    $div.append(Q.create("input", {type: "button",
                                   title: "Add boundary pixels to curves"})
                .value("Thicken")
                .on("click", e => {
                  let knot = this.copy();
                  knot.thicken();
                  undo_stack.push(knot);
                }));

    $div.append(Q.create("hr"));

    $div.append(Q.create("input", {type: "button",
                                   title: "Analyze picture and convert to a diagram"})
                .value("Convert to diagram")
                .on("click", e => {
                  undo_stack.push(this.convert());
                }));

    if (this.the_error) {
      let $error = Q.div({className: "error"},
                         Q.create("h2", "Error"))
          .appendTo($div);
      if (this.the_error instanceof Array) {
        this.the_error.forEach(err => $error.append(Q.p(''+err)));
      } else {
        $error.append(Q.p(''+this.the_error));
      }
    }

    return $div;
  }

  paint(ctxt) {
    let imgdata = ctxt.getImageData(0, 0, this.width, this.height);
    this.writeImage(imgdata);
    ctxt.putImageData(imgdata, 0, 0);
  }

  writeImage(imageData) {
    /* writes the buffer */
    assert(imageData.height >= this.height);
    assert(imageData.width >= this.width);
    let data = imageData.data;
    let w = this.width,
        h = this.height;
    let buf = this.next_knot ? this.next_knot.buffer : this.buffer;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let off = w*y+x;
        let c = buf[off];
        if (c > 0) {
          let hex = palette[c-1];
          data[4*off+0] = (hex >>> 16) & 0xFF;
          data[4*off+1] = (hex >>> 8) & 0xFF;
          data[4*off+2] = hex & 0xFF;
          data[4*off+3] = 255;
        } else if (c === 0) {
          data[4*off+0] = 255;
          data[4*off+1] = 255;
          data[4*off+2] = 255;
          data[4*off+3] = 255;
        } else {
          // error color
          data[4*off+0] = 255;
          data[4*off+1] = 150;
          data[4*off+2] = 150;
          data[4*off+3] = 255;
        }
      }
    }
  }

  fromImage(imageData) {
    /* Attempts to get buffer out of the imageData. */
    assert(imageData.height >= this.height);
    assert(imageData.width >= this.width);
    let data = imageData.data;
    let w = this.width,
        h = this.height;
    let buf = this.buffer;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let off = w*y+x;
        let color = (data[4*off+0] << 16) | (data[4*off+1] << 8) | data[4*off+2];
        let idx = palette.indexOf(color);
        if (idx >= 0) {
          buf[off] = idx + 1;
        } else {
          buf[off] = 0;
        }
      }
    }
  }

  draw_line(pprev, p1, p2, v, go_over = 1) {
    /* Draw a line from p1 to p2, given that there had already been a
       line through the points in the array pprev to p1.  We allow pprev
       to be null, meaning this is a fresh start.  If pprev is null, then
       we allow p1 to be null, meaning this is the first point. */
    let buf = this.buffer;
    let temp = this.temp;

    let width = 0|this.width,
        height = 0|this.height;

    //console.log("draw_line(["+pprev+'],'+p1+','+p2+','+v+','+go_over+')');

    let getPixel = (x, y) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        return buf[y*width + x];
      } else {
        return 0;
      }
    };
    let setPixel = (x, y, v) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        buf[y*width + x] = v;
      }
    };
    let getTempPixel = (x, y) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        return temp[y*width + x];
      } else {
        return -1;
      }
    };
    let setTempPixel = (x, y, v) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        temp[y*width + x] = v;
      }
    };


    function with_radius(x, y, r, f) {
      /* Calls f with all pairs within a box of radius r of the given (x,y) point. */
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          f(x + i, y + j);
        }
      }
    }

    if (v === 0) {
      // This is erase mode
      for (let p of line_points(p1 || p2, p2)) {
        with_radius(p.x, p.y, ERASE_RADIUS, (x, y) => setPixel(x, y, 0));
      }
    } else {
      // This is draw mode

      temp.fill(-1);
      // non-negative means something to write.
      // -2 marks pre-existing stuff that won't be re-written.

      function find_existing(r, x, y) {
        if (r < 0 || getTempPixel(x, y) !== -1 || getPixel(x, y) !== v) {
          return;
        }
        setTempPixel(x, y, -2);
        with_radius(x, y, 1, (x2, y2) => find_existing(r-1, x2, y2));
      }

      p1 = p1 || p2;

      // See if this is, roughly, the start of a new line
      let p0 = null;
      if (pprev === null || pprev.length === 0) {
        p0 = p1;
      } else {
        let length = Point.dist(p1, p2);
        let last_p = p1;
        for (let i = pprev.length-1; i >= 0; i--) {
          length += Point.dist(last_p, pprev[i]);
          last_p = pprev[i];
        }
        if (length <= MAX_PPREV_DIST) {
          p0 = pprev[0];
        }
      }
      if (p0 !== null) {
        // Start of a new line, so look for anything it might be extending.
        with_radius(p0.x, p0.y, PAINT_RADIUS+1, (x, y) => find_existing(PAINT_RADIUS + PAINT_GAP, x, y));
      }

      // mark everything in the line through pprev to p1 as being part of the current line
      if (pprev !== null) {
        let last_p = p1;
        fill_old:
        for (var i = pprev.length-1; i >= 0; i--) {
          for (let p of line_points(last_p, pprev[i])) {
            if (getPixel(p.x, p.y) === -1) {
              // for go_over < 0
              break fill_old;
            }
            with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => setTempPixel(x, y, -2));
          }
          last_p = pprev[i];
        }
      }

      for (let p of line_points(p1, p2)) {
        if (go_over > 0) {
          with_radius(p.x, p.y, PAINT_RADIUS + PAINT_GAP, (x, y) => {
            if (getTempPixel(x, y) === -1) {
              setTempPixel(x, y, 0);
            }
          });
          with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => setTempPixel(x, y, v));
        } else if (go_over < 0) {
          with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => {
            let avoid = false;
            with_radius(x, y, PAINT_GAP, (x2, y2) => {
              if (getTempPixel(x2, y2) === -1 && getPixel(x2, y2) > 0) {
                avoid = true;
              }
            });
            if (!avoid) {
              setTempPixel(x, y, v);
            }
          });
        } else {
          with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => setTempPixel(x, y, v));
        }
      }

      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        let t = temp[i];
        if (t >= 0) {
          buf[i] = t;
        }
      }
    }
  }

  strip_errors() {
    let buf = this.buffer;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] < 0) buf[i] = 0;
    }
  }
  add_error(pt, r = ERROR_RADIUS) {
    assert(pt instanceof Point);
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let ir = Math.ceil(r);
    for (let dy = -ir; dy <= ir; dy++) {
      let y = Math.floor(pt.y) + dy;
      if (y < 0 || y >= height) {
        continue;
      }
      for (let dx = -ir; dx <= ir; dx++) {
        let x = Math.floor(pt.x) + dx;
        if (x < 0 || x >= width) {
          continue;
        }
        if (dx*dx + dy*dy <= r*r && buf[width*y+x] <= 0) {
          buf[width*y+x] = -1;
        }
      }
    }
  }

  thin() {
    /* Remove all pixels that have neighbor not of the same color */
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let tbuf = this.temp;
    tbuf.fill(0);

    this.strip_errors();

    // put -1 into tbuf to mark the pixel should be cleared
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let erase = false;
        let c = buf[y*width+x];
        if (y === 0 || y === height - 1) {
          erase = true;
        } else if (x === 0 || x === width - 1) {
          erase = true;
        } else if (c > 0) {
          find:
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (buf[(y+dy)*width+(x+dx)] !== c) {
                erase = true;
                break find; 
              }
            }
          }
        }

        if (erase) {
          tbuf[y*width+x] = -1;
        }
      }
    }

    // clear pixels marked by tbuf
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (tbuf[y*width+x] === -1) {
          buf[y*width+x] = 0;
        }
      }
    }
  }

  thicken() {
    /* Add boundary pixels to colored regions */
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let tbuf = this.temp;
    tbuf.fill(0);

    this.strip_errors();

    // put colors into tbuf to mark the pixel should be colored
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (buf[y*width+x] > 0) {
          continue;
        }
        let c = 0;
        find:
        for (let y2 = y-1; y2 <= y+1; y2++) {
          if (y2 < 0 || y2 >= height) continue;
          for (let x2 = x-1; x2 <= x+1; x2++) {
            if (x2 < 0 || x2 >= width) continue;
            c = buf[y2*width+x2];
            if (c > 0)
              break find;
          }
        }

        tbuf[y*width+x] = c;
      }
    }

    // set pixels marked by tbuf
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let c = tbuf[y*width+x];
        if (c > 0) {
          buf[y*width+x] = c;
        }
      }
    }
  }

  clean_up() {
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let tbuf = this.temp;

    this.strip_errors();

    // clear boundary
    for (let x = 0; x < width; x++) {
      buf[width*0+x] = 0;
      buf[width*(height-1)+x] = 0;
    }
    for (let y = 0; y < height; y++) {
      buf[width*y+0] = 0;
      buf[width*y+width-1] = 0;
    }

    // morphological thinning of buf

    let nbuf = new Int8Array(3*3);
    function mthin(min_pcount, max_pcount) {
      let changed = false;
      for (let y = 1; y <= height - 2; y++) {
        for (let x = 1; x <= width - 2; x++) {
          let c = buf[width*y+x];
          if (c <= 0) {
            continue;
          }
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (buf[width*(y+dy)+(x+dx)] === c) {
                nbuf[3*(dy+1)+(dx+1)] = 1;
              } else {
                nbuf[3*(dy+1)+(dx+1)] = 0;
              }
            }
          }
          // fill in corners based on direct neighbors
          if (nbuf[3*0+1]) { // top
            if (nbuf[3*1+0]) { // left
              nbuf[3*0+0] = 1;
            }
            if (nbuf[3*1+2]) { // right
              nbuf[3*0+2] = 1;
            }
          }
          if (nbuf[3*2+1]) { // bottom
            if (nbuf[3*1+0]) { // left
              nbuf[3*2+0] = 1;
            }
            if (nbuf[3*1+2]) { // right
              nbuf[3*2+2] = 1;
            }
          }
          
          let state = nbuf[3*1+2];
          let pcount = 0; // pixel count
          let ccount = 0; // component changes
          function step(dx, dy) {
            let c2 = nbuf[3*(1+dy)+(1+dx)];
            if (c2 !== state) {
              ccount++;
              state = c2;
            }
            if (c2 > 0) {
              pcount++;
            }
          }
          // step counterclockwise around point
          step(1,1);
          step(0,1);
          step(-1,1);
          step(-1,0);
          step(-1,-1);
          step(0,-1);
          step(1,-1);
          step(1,0);
          if (pcount === 0) {
            // this is isolated vertex
            buf[width*y+x] = 0;
            // no need to set changed to true since there are no consequences to removing this
          } else if (ccount === 2) {
            // this is not a cut vertex
            if (min_pcount <= pcount && pcount <= max_pcount) {
              // this is not an end vertex
              buf[width*y+x] = 0;
              changed = true;
            }
          }
        }
      }
      return changed;
    }

    let changed = true;
    while (changed) {
      changed = mthin(3, 4);
      if (!changed) {
        changed = mthin(2, 6);
      }
      //changed = false;
    }

    // remove tips
    tbuf.fill(0);
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[width*y+x];
        if (c > 0) {
          let icount = -1;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (buf[width*(y+dy)+(x+dx)] === c) {
                icount++;
              }
            }
          }
          if (icount === 1) {
            tbuf[width*y+x] = 1;
          }
        }
      }
    }
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (tbuf[width*y+x] > 0) {
          buf[width*y+x] = 0;
        }
      }
    }
  }

  convert() {
    /* Returns a View of either a cleaned up version (with errors) or an interpreted knot diagram. */

    let knot = this.copy();
    knot.clean_up();

    let width = 0|knot.width,
        height = 0|knot.height,
        buf = knot.buffer;

    function n_neighbors(x, y) {
      /* number of neighbors of same color */
      let c = buf[y*width+x];
      let count = -1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (buf[(y+dy)*width+(x+dx)] === c) {
            count++;
          }
        }
      }
      return count;
    }

    /// Spur deletion
    
    function maybe_delete_spur(x, y, gas) {
      if (gas <= 0) {
        // this wasn't actually a spur
        return false;
      }
      let count = n_neighbors(x, y);
      if (count === 0) {
        return false;
      } else if (count === 1) {
        let c = buf[y*width+x];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!(dx === 0 && dy === 0) && buf[(y+dy)*width+(x+dx)] === c) {
              buf[y*width+x] = 0;
              let ok = maybe_delete_spur(x+dx, y+dy, gas-1);
              if (ok) {
                return true;
              } else {
                // revert!
                buf[y*width+x] = c;
                return false;
              }
            }
          }
        }
        throw new Error("Cannot get here.");
      } else {
        return true;
      }
    }

    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (buf[y*width+x] > 0 && n_neighbors(x, y) === 1) {
          // this is an endpoint
          maybe_delete_spur(x, y, SPUR_LENGTH);
        }
      }
    }

    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (buf[y*width+x] > 0 && n_neighbors(x, y) === 0) {
          // this is an isolated point
          buf[y*width+x] = 0;
        }
      }
    }

    /// Locate any junctions (errors)

    let found_error = false;
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (buf[y*width+x] > 0 && n_neighbors(x, y) > 2) {
          knot.add_error(new Point(x, y));
          found_error = true;
        }
      }
    }
    if (found_error) {
      knot.the_error = "The marked junctions cannot be interpreted. Usually this is because one of the understrands has fused to the overstrand, which can be fixed with a little erasing.";
      return knot;
    }

    /// Match up endpoints

    // Since we removed isolated points, we know there is an even number of endpoints per color

    // for counting number of times a line crosses:
    let tknot = knot.copy();
    tknot.thicken();

    let endpoints = new Map(); // Map(color => [Point])
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[y*width+x];
        if (c > 0 && n_neighbors(x, y) === 1) {
          let ep_list = endpoints.get(c);
          if (!ep_list) {
            ep_list = [];
            endpoints.set(c, ep_list);
          }
          ep_list.push(new Point(x, y));
        }
      }
    }
    function match_up(points, color) {
      /* Looks for a perfect matching that optimizes a heuristic (sum
      of distances divided by (number of segments crossed - 1)).*/

      // graph[i][j] == score for path between i and j
      let graph = new Array(points.length);
      for (let i = 0; i < points.length; i++) {
        let row = graph[i] = new Array(points.length);
        row.fill(Infinity);
      }
      // a list of [i,j,score] for i<j, when score < Infinity
      let all_edges = [];
      for (let i = 0; i < points.length; i++) {
        let p1 = points[i];
        for (let j = i + 1; j < points.length; j++) {
          let p2 = points[j];

          let d = Point.dist(p1, p2);

          let pcount = 0;
          let state = -2;
          for (let lp of line_points(p1, p2)) {
            let c = tknot.buffer[width*lp.y+lp.x];
            if (c === 0) {
              c = 0|tknot.buffer[width*lp.y+(lp.x+1)];
            }
            if (c === 0) {
              c = 0|tknot.buffer[width*(lp.y+1)+lp.x];
            }
            if (c !== state) {
              if (c > 0) {
                pcount++;
              }
              state = c;
            }
          }
          if (pcount > 1) {
            // Then this is a non-backtracking line segment
            let count = Math.min(2, pcount-1);
            let score = (d - DIAGRAM_LINE_WIDTH*count) / count;
            score = Math.max(0, score);
            graph[i][j] = score;
            graph[j][i] = score;
            all_edges.push([i, j, score]);
          }
        }
      }
      all_edges.sort((e1, e2) => e1[2] - e2[2]);

      // construct match greedily

      let used_points = Array(points.length).fill(false);
      let edges = [];
      all_edges.forEach(edge => {
        if (used_points[edge[0]] || used_points[edge[1]]) {
          return;
        }
        edges.push([edge[0], edge[1]]);
        used_points[edge[0]] = true;
        used_points[edge[1]] = true;
      });

      if (2 * edges.length < points.length) {
        // Couldn't match everything up.  Return a too-short match
        let err_points = [];
        for (let i = 0; i < used_points.length; i++) {
          if (!used_points[i]) {
            err_points.push(points[i]);
          }
        }
        return {err_points:err_points};
      }

      // look for pairs of edges where one of the other two pairings are better
      let swaps = 0;
      let keep_going = true;
      while (keep_going) {
        keep_going = false;
        for (let i = 0; i < edges.length; i++) {
          for (let j = i + 1; j < edges.length; j++) {
            let [p1, p2] = edges[i],
                [q1, q2] = edges[j];
            let d1 = graph[p1][p2] + graph[q1][q2],
                d2 = graph[p1][q1] + graph[p2][q2],
                d3 = graph[p1][q2] + graph[q1][p2];
            if (d2 < d1 && d2 <= d3) {
              edges[i][1] = q1;
              edges[j][0] = p2;
              keep_going = true;
              swaps++;
            } else if (d3 < d1 && d3 <= d2) {
              edges[i][1] = q2;
              edges[j][1] = p2;
              keep_going = true;
              swaps++;
            }
          }
        }
      }
      console.log("swaps= " + swaps);

      return edges.map(edge => [points[edge[0]], points[edge[1]]]);
    }

    // Collect the matching now.
    let matches = []; // [p1, p2, color]
    let errors = [];
    endpoints.forEach((points, color) => {
      let match = null;
      match = match_up(points);
      if (match.err_points) {
        found_error = true;
        match.err_points.forEach(pt => knot.add_error(pt));
        errors.push("Couldn't find a way to match up endpoints in the component of color "
                    + color + ".  The unmatched points have been marked.");
        return;
      }
      match.forEach(edge => {
        // check that the matching's edges do not intersect so far
        matches.forEach(prev_match => {
          let int = segments_intersect(prev_match[0], prev_match[1], edge[0], edge[1]);
          if (int) {
            found_error = true;
            knot.add_error(int);
            errors.push("There was a pair of matched-up endpoints whose matchings intersect.  The intersection point has been marked.");
          }
        });
        // then add this edge
        matches.push([edge[0], edge[1], color]);
      });
    });

    function do_error_stuff() {
      console.log("error");
      // matches.forEach(match => {
      //   knot.draw_line(null, match[0], match[1], match[2], -1);
      // });
      // errors.push("(All found matchings are drawn in on of the thinned version of the picture, to give some idea of what the program is seeing.  This can usually be edited and converted without undoing.)");
      knot.the_error = errors;
      return knot;
    }

    if (found_error) {
      return do_error_stuff();
    }

    /// Take matches and construct 4-regular planar graph

    // walk_path destructively modifies buf
    buf = new Int8Array(buf);

    let verts = []; // [Point]
    let edges = []; // [v1, v2, color, overness]
    function vert_id(pt) {
      for (let i = 0; i < verts.length; i++) {
        if (Point.equal(verts[i], pt)) {
          return i;
        }
      }
      throw new Error("point not found");
    }

    function walk_path(c, x, y) {
      /* Walks the path from the given point.  Assumes path has at least two pixels. */
      // assumes color c at point (x,y)

      let pt1 = verts.length;
      verts.push(new Point(x, y));
      let last = null;
      if (n_neighbors(x, y) === 2) {
        last = pt1;
      }
      next_point:
      while (buf[y*width+x] === c) {
        buf[y*width + x] = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (c === buf[(y+dy)*width + (x+dx)]) {
              x = x + dx; y = y + dy;
              while (c === buf[(y+dy)*width + (x+dx)]) {
                buf[y*width + x] = 0;
                x = x + dx; y = y + dy;
              }
              let pt2 = verts.length;
              verts.push(new Point(x, y));
              edges.push([pt1, pt2, c, true]);
              pt1 = pt2;
              continue next_point;
            }
          }
        }
        if (last !== null) {
          edges.push([pt1, last, c, true]);
        }
      }
    }
    // Walk from endpoints:
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[y*width+x];
        if (c > 0 && n_neighbors(x, y) === 1) {
          walk_path(c, x, y);
        }
      }
    }
    // Unknots:
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[y*width+x];
        if (c > 0) {
          walk_path(c, x, y);
        }
      }
    }

    // edges.forEach((edge, edge_id) => {
    //   console.log("edge " + edge + "  v0="+verts[edge[0]]+"  v1="+verts[edge[1]]);
    // });
    // console.log("---");

    matches.forEach(match => {
      let seg = [vert_id(match[0]), vert_id(match[1])];
      // Maybe seg runs through current vertices.  Split it if this is the case
      verts.forEach((v, vi) => {
        for (let i = 0; i + 1 < seg.length; i++) {
          if (seg[i] === vi || seg[i+1] === vi) {
            return;
          }
          if (segment_contains(verts[seg[i]], verts[seg[i+1]], v, EPSILON)) {
            //console.log("Hit vertex " + vi);
            seg.splice(i+1, 0, vi);
            return;
          }
        }
      });
      // Maybe seg intersects current edges.  Split both if this is the case
      var new_edges = [];
      edges.forEach((edge, edge_i) => {
        for (let i = 0; i + 1 < seg.length; i++) {
          let int_pt = segments_intersect(verts[edge[0]], verts[edge[1]],
                                          verts[seg[i]], verts[seg[i+1]], EPSILON);
          if (int_pt !== null) {
            //console.log("Segment " + seg +  " hit edge " + edge);
            // we know int_pt is a new point if it's not an endpoint
            let _int_pt_i = null;
            function int_pt_i() {
              if (_int_pt_i === null) {
                _int_pt_i = verts.length;
                verts.push(int_pt);
              }
              return _int_pt_i;
            }
            if (!Point.similar(int_pt, verts[edge[0]], EPSILON)
                && !Point.similar(int_pt, verts[edge[1]], EPSILON)) {
              new_edges.push([int_pt_i(), edge[1], edge[2], true]);
              edge[1] = int_pt_i();
              //console.log("Splitting edge");
            }
            if (!Point.similar(int_pt, verts[seg[i]], EPSILON)
                && !Point.similar(int_pt, verts[seg[i+1]], EPSILON)) {
              seg.splice(i+1, 0, int_pt_i());
              //console.log("Splitting segment");
            }
            // Since seg is a straight line segment, no other part of it can intersect the current edge
            return;
          }
        }
      });
      new_edges.forEach(e => edges.push(e));
      for (let i = 0; i + 1 < seg.length; i++) {
        edges.push([seg[i], seg[i+1], match[2], false]);
      }
    });

    // now the verts and edges are constructed

    /// Construct combinatorial map

    // use edges as darts, but negative id means edge in the opposite direction
    let adj_lists = [];
    for (let i = 0; i < verts.length; i++) {
      adj_lists[i] = [];
    }
    edges.forEach((edge, edge_id) => {
      //console.log("edge " + edge + "  v0="+verts[edge[0]]+"  v1="+verts[edge[1]]);
      adj_lists[edge[0]].push(edge_id+1);
      adj_lists[edge[1]].push(-edge_id-1);
    });

    // replace lists with P and X objects
    adj_lists = adj_lists.map(list => {
      if (list.length === 2) {
        return P.make(...list);
      } else if (list.length === 4) {
        return X.make(...list);
      } else {
        return assert(false);
      }
    });

    let diagram = new KnotGraph(verts, edges, adj_lists);

    // sort adj_lists
    adj_lists.forEach((list, i) => {
      if (list instanceof P) {
        let e0 = diagram.dart_edge(list[0]), e1 = diagram.dart_edge(list[1]);
        assert(e0[2] === e1[2]); // same color
        return;
      }
      assert(list instanceof X);
      let vert = verts[i];
      let lverts = list.map(dart => diagram.dart_end(dart));
      // The angles are negative since the coordinate system has inverted y due to the canvas.
      let angles = lverts.map(vi => -pseudo_angle(vert, verts[vi]));
      function mswap(i, j) {
        /* maybe swap the angle and list arrays, depending on the value of the angle */
        if (angles[i] > angles[j]) {
          [angles[i], angles[j]] = [angles[j], angles[i]];
          [list[i], list[j]] = [list[j], list[i]];
        }
      }
      // sorting network
      mswap(1,3); mswap(0,2);
      mswap(0,1); mswap(2,3);
      mswap(1,2);
      for (let i = 0; i < 3; i++) {
        if (Math.abs((angles[i] - angles[i+1] + Math.PI) % (2 * Math.PI) - Math.PI) < 1e-6) {
          // This is an unexpected coincident pair of edges
          found_error = true;
          knot.add_error(vert);
          errors.push("The edges around the marked vertex were unexpectly coincident.  (This error has never been observed before!)");
          return;
        }
      }
      // Put undercrossing dart as first in adjacency list
      if (diagram.dart_edge(list[0])[3]) {
        list.push(list.shift());
      }
      // Consistency check
      let e0 = diagram.dart_edge(list[0]),
          e1 = diagram.dart_edge(list[1]),
          e2 = diagram.dart_edge(list[2]),
          e3 = diagram.dart_edge(list[3]);
      // is it a transverse crossing?
      if (!(!e0[3] && e1[3] && !e2[3] && e3[3]) // opposite sides are both over or under
          || !(e0[2] === e2[2] && e1[2] === e3[2])) { // opposite sides have same color
        found_error = true;
        knot.add_error(vert);
        errors.push("The marked crossing is not transverse.");
        return;
      }
    });

    if (found_error) {
      return do_error_stuff();
    }

    // now adj_lists contains correct rotation system for each vertex

    diagram.consistency_check();

    // let the diagram choose orientations
    diagram.ensure_orientation();

    return new KnotDiagramView(this.width, this.height, diagram);
  }
}

/*

This is a version of StackBlur by Mario Klingemann, modified by Kyle Miller.

Original copyright notice:

StackBlur - a fast almost Gaussian Blur For Canvas

Version: 	0.5
Author:		Mario Klingemann
Contact: 	mario@quasimondo.com
Website:	http://www.quasimondo.com/StackBlurForCanvas
Twitter:	@quasimondo

In case you find this class useful - especially in commercial projects -
I am not totally unhappy for a small donation to my PayPal account
mario@quasimondo.de

Or support me on flattr: 
https://flattr.com/thing/72791/StackBlur-a-fast-almost-Gaussian-Blur-Effect-for-CanvasJavascript

Copyright (c) 2010 Mario Klingemann

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var mul_table = [
  512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,
  454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,
  482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,
  437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,
  497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,
  320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,
  446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,
  329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,
  505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,
  399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,
  324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,
  268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,
  451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,
  385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,
  332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,
  289,287,285,282,280,278,275,273,271,269,267,265,263,261,259];


var shg_table = [
	9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 
	17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 
	19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
	20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
	21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
	21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 
	22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
	22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
	23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 
	23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
	24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24 ];


function stackBlurRGB( pixels, width, height, radius ) {
  /* pixels is a Uint8Array of length 4*width*height. */

	if ( isNaN(radius) || radius < 1 ) return;
	radius |= 0;
	
	var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
	    r_out_sum, g_out_sum, b_out_sum,
	    r_in_sum, g_in_sum, b_in_sum,
	    pr, pg, pb, rbs;
	
	var div = radius + radius + 1;
	var widthMinus1  = width - 1;
	var heightMinus1 = height - 1;
	var radiusPlus1  = radius + 1;
	var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;
	
	var stackStart = new BlurStack();
	var stack = stackStart;
	for ( i = 1; i < div; i++ ) {
		stack = stack.next = new BlurStack();
		if ( i == radiusPlus1 ) var stackEnd = stack;
	}
	stack.next = stackStart;
	var stackIn = null;
	var stackOut = null;
	
	yw = yi = 0;
	
	var mul_sum = mul_table[radius];
	var shg_sum = shg_table[radius];
	
	for ( y = 0; y < height; y++ ) {
		r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;
		
		r_out_sum = radiusPlus1 * ( pr = pixels[yi] );
		g_out_sum = radiusPlus1 * ( pg = pixels[yi+1] );
		b_out_sum = radiusPlus1 * ( pb = pixels[yi+2] );
		
		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;
		
		stack = stackStart;
		
		for( i = 0; i < radiusPlus1; i++ ) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}
		
		for( i = 1; i < radiusPlus1; i++ ) {
			p = yi + (( widthMinus1 < i ? widthMinus1 : i ) << 2 );
			r_sum += ( stack.r = ( pr = pixels[p])) * ( rbs = radiusPlus1 - i );
			g_sum += ( stack.g = ( pg = pixels[p+1])) * rbs;
			b_sum += ( stack.b = ( pb = pixels[p+2])) * rbs;
			
			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;
			
			stack = stack.next;
		}
		
		
		stackIn = stackStart;
		stackOut = stackEnd;
		for ( x = 0; x < width; x++ ) {
			pixels[yi]   = (r_sum * mul_sum) >> shg_sum;
			pixels[yi+1] = (g_sum * mul_sum) >> shg_sum;
			pixels[yi+2] = (b_sum * mul_sum) >> shg_sum;
			
			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;
			
			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;
			
			p =  ( yw + ( ( p = x + radius + 1 ) < widthMinus1 ? p : widthMinus1 ) ) << 2;
			
			r_in_sum += ( stackIn.r = pixels[p]);
			g_in_sum += ( stackIn.g = pixels[p+1]);
			b_in_sum += ( stackIn.b = pixels[p+2]);
			
			r_sum += r_in_sum;
			g_sum += g_in_sum;
			b_sum += b_in_sum;
			
			stackIn = stackIn.next;
			
			r_out_sum += ( pr = stackOut.r );
			g_out_sum += ( pg = stackOut.g );
			b_out_sum += ( pb = stackOut.b );
			
			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;
			
			stackOut = stackOut.next;

			yi += 4;
		}
		yw += width;
	}

	
	for ( x = 0; x < width; x++ ) {
		g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;
		
		yi = x << 2;
		r_out_sum = radiusPlus1 * ( pr = pixels[yi]);
		g_out_sum = radiusPlus1 * ( pg = pixels[yi+1]);
		b_out_sum = radiusPlus1 * ( pb = pixels[yi+2]);
		
		r_sum += sumFactor * pr;
		g_sum += sumFactor * pg;
		b_sum += sumFactor * pb;
		
		stack = stackStart;
		
		for( i = 0; i < radiusPlus1; i++ ) {
			stack.r = pr;
			stack.g = pg;
			stack.b = pb;
			stack = stack.next;
		}
		
		yp = width;
		
		for( i = 1; i <= radius; i++ ) {
			yi = ( yp + x ) << 2;
			
			r_sum += ( stack.r = ( pr = pixels[yi])) * ( rbs = radiusPlus1 - i );
			g_sum += ( stack.g = ( pg = pixels[yi+1])) * rbs;
			b_sum += ( stack.b = ( pb = pixels[yi+2])) * rbs;
			
			r_in_sum += pr;
			g_in_sum += pg;
			b_in_sum += pb;
			
			stack = stack.next;
		  
			if( i < heightMinus1 )
			{
				yp += width;
			}
		}
		
		yi = x;
		stackIn = stackStart;
		stackOut = stackEnd;
		for ( y = 0; y < height; y++ ) {
			p = yi << 2;
			pixels[p]   = (r_sum * mul_sum) >> shg_sum;
			pixels[p+1] = (g_sum * mul_sum) >> shg_sum;
			pixels[p+2] = (b_sum * mul_sum) >> shg_sum;
			
			r_sum -= r_out_sum;
			g_sum -= g_out_sum;
			b_sum -= b_out_sum;
			
			r_out_sum -= stackIn.r;
			g_out_sum -= stackIn.g;
			b_out_sum -= stackIn.b;
			
			p = ( x + (( ( p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1 ) * width )) << 2;
			
			r_sum += ( r_in_sum += ( stackIn.r = pixels[p]));
			g_sum += ( g_in_sum += ( stackIn.g = pixels[p+1]));
			b_sum += ( b_in_sum += ( stackIn.b = pixels[p+2]));
			
			stackIn = stackIn.next;
			
			r_out_sum += ( pr = stackOut.r );
			g_out_sum += ( pg = stackOut.g );
			b_out_sum += ( pb = stackOut.b );
			
			r_in_sum -= pr;
			g_in_sum -= pg;
			b_in_sum -= pb;
			
			stackOut = stackOut.next;
			
			yi += width;
		}
	}
}

function BlurStack() {
	this.r = 0;
	this.g = 0;
	this.b = 0;
	this.a = 0;
	this.next = null;
}

// View for image import

let global_tool_state = {
  tool: "crop"
};


class KnotImageImportView {
  constructor(width, height, img) {
    this.img = img;
    this.width = width;
    this.height = height;

    // displacement
    this.x = 0;
    this.y = 0;

    this.scale = Math.min(1, Math.min(width / img.width, height / img.height));

    // crop region
    this.sx = 0;
    this.sy = 0;
    this.swidth = img.width;
    this.sheight = img.height;

    this.invert = false;
    this.blur = 0;
    this.adaptive = 20;
    this.threshold = -0.05;

    this.tmp_canvas = document.createElement("canvas");
    this.tmp_canvas.width = this.width;
    this.tmp_canvas.height = this.height;
    this.tmp_ctxt = this.tmp_canvas.getContext("2d");

    this.mode_name = "Image importing";
  }

  copy() {
    let view = new KnotImageImportView(this.width, this.height, this.img);
    view.x = this.x;
    view.y = this.y;
    view.scale = this.scale;
    view.sx = this.sx;
    view.sy = this.sy;
    view.swidth = this.swidth;
    view.sheight = this.sheight;
    view.invert = this.invert;
    view.blur = this.blur;
    view.threshold = this.threshold;
    return view;
  }

  update_crop(pt1, pt2) {
    let x1 = clamp(Math.min(pt1.x - this.x, pt2.x - this.x) / this.scale, 0, this.img.width),
        x2 = clamp(Math.max(pt1.x - this.x, pt2.x - this.x) / this.scale, 0, this.img.width),
        y1 = clamp(Math.min(pt1.y - this.y, pt2.y - this.y) / this.scale, 0, this.img.height),
        y2 = clamp(Math.max(pt1.y - this.y, pt2.y - this.y) / this.scale, 0, this.img.height);

    this.sx = x1;
    this.sy = y1;
    this.swidth = x2 - x1;
    this.sheight = y2 - y1;
  }

  mousedown(pt, e, undo_stack, ctxt) {
    let tool = global_tool_state.tool;
    if (e.button === 2) {
      tool = "move";
      if (this.update_tool) {
        this.update_tool(tool);
      }
    }

    if (tool === "crop") {
      this.crop_start = pt;
      this.update_crop(this.crop_start, pt);
      this.paint(ctxt);
    } else if (tool === "move") {
      this.move_start = pt;
    }
  }
  mousemove(pt, e, undo_stack, ctxt) {
    if (!e.buttons) {
      this.mouseup(pt, e, undo_stack, ctxt);
      return;
    }
    if (this.crop_start) {
      this.update_crop(this.crop_start, pt);
      this.paint(ctxt);
    } else if (this.move_start) {
      this.x += (pt.x - this.move_start.x);
      this.y += (pt.y - this.move_start.y);
      this.move_start = pt;
      this.paint(ctxt);
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    if (this.crop_start) {
      this.update_crop(this.crop_start, pt);
      this.crop_start = null;
      this.paint(ctxt);
    } else if (this.move_start) {
      this.move_start = null;
      this.paint(ctxt);
    }
    this.update_tool(global_tool_state.tool);
  }
  mouse_to_pt(pt) {
    assert(pt instanceof Point);
    return new Point((pt.x - this.x)/this.scale,
                     (pt.y - this.y)/this.scale);
  }
  mousewheel(pt, e, undo_stack, ctxt) {
    let delta = Math.sign(e.deltaY);
    let kpt = this.mouse_to_pt(pt);
    this.set_scale(this.scale * Math.pow(1.05, -delta));
    let zkpt = this.mouse_to_pt(pt);
    this.x += this.scale*(zkpt.x - kpt.x);
    this.y += this.scale*(zkpt.y - kpt.y);
    this.paint(ctxt);
  }
  toolbox(undo_stack, ctxt) {
    let $div = this.$div = Q.div();

    $div.append(
      Q.div(
        Q.span({"data-tool": "move",
                title: "Move image [right click]",
                className: "icon-button"},
               Q.create("span", {className: "icon24-move"})),
        Q.span({"data-tool": "crop",
                title: "Crop image",
                className: "icon-button"},
               Q.create("span", {className: "icon24-crop"})),
      )
        .on("click", e => {
          let el = e.target.closest('.icon-button');
          if (el) {
            let tool = Q(el).prop('data-tool');
            if (typeof tool === "string") {
              e.preventDefault();
              e.stopPropagation();
              global_tool_state.tool = tool;
              this.update_tool(tool);
            }
          }
        })
    );

    this.update_tool = (toolname) => {
      $div.query(".icon-button").forEach($e => {
        let button_tool = $e.prop("data-tool");
        if (typeof button_tool === "string") {
          $e.toggleClass("active", button_tool === toolname);
        }
      });
    };
    this.update_tool(global_tool_state.tool);

    var $scale;
    $div.append(
      Q.create("label", {title: "Rescale the image [mouse wheel]"},
               "Scale: ",
               $scale = Q.create("input", { type: "range",
                                            min: "1",
                                            max: "300",
                                            step: "1",
                                            className: "slider" })
              ));
    $scale.on("input", e => {
      this.set_scale(e.target.value / 100);
      this.paint(ctxt);
    });

    this.set_scale = (new_scale) => {
      new_scale = clamp(new_scale, 0.01, 3.0);
      $scale.value(Math.floor(this.scale * 100));
      this.scale = new_scale;
    };
    this.set_scale(this.scale);

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", { title: "Invert the values of all the colors, for example if this is a chalk drawing." },
               "Invert colors: ",
               Q.create("input", {type: "checkbox"})
               .on("input", e => {
                 this.invert = e.target.checked;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Blur radius"},
               "Blur: ",
               Q.create("input", { type: "range",
                                   min: "0",
                                   max: "10",
                                   step: "1",
                                   className: "slider" })
               .value(this.blur)
               .on("input", e => {
                 this.blur = e.target.value;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Adaptive radius"},
               "Adaptive radius: ",
               Q.create("input", { type: "range",
                                   min: "1",
                                   max: "40",
                                   step: "1",
                                   className: "slider" })
               .value(this.adaptive)
               .on("input", e => {
                 this.adaptive = e.target.value;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Threshold for black"},
               "Threshold: ",
               Q.create("input", {type: "range",
                                  min: "-500",
                                  max: "500",
                                  step: "1",
                                  className: "slider"})
               .value(Math.floor(this.threshold * 1000))
               .on("input", e => {
                 this.threshold = e.target.value / 1000;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("input", {type: "button",
                         value: "Accept",
                         title: "Take selection to painting mode"})
        .on("click", e => {
          this.paint(ctxt, true);
          let view = new KnotRasterView(this.width, this.height);
          view.fromImage(ctxt.getImageData(0, 0, this.width, this.height));
          undo_stack.push(view);
        })
    );

    return $div;
  }

  paint(ctxt, onlyCropped=false) {
    ctxt.save();
    if (onlyCropped) {
      ctxt.fillStyle = "#fff";
    } else {
      ctxt.fillStyle = "#ddd";
    }
    ctxt.fillRect(0, 0, this.width, this.height);

    let rx = this.sx*this.scale+this.x,
        ry = this.sy*this.scale+this.y,
        rwidth = this.swidth*this.scale,
        rheight = this.sheight*this.scale;
    let sx = this.sx,
        sy = this.sy,
        swidth = this.swidth,
        sheight = this.sheight;

    if (rx < 0) {
      swidth += (rx) / this.scale;
      sx = (0 - this.x) / this.scale;
      rwidth += rx;
      rx = 0;
    }
    if (rwidth > this.width) {
      swidth -= (rwidth - this.width) / this.scale;
      rwidth = this.width;
    }
    if (ry < 0) {
      sheight += (ry) / this.scale;
      sy = (0 - this.y) / this.scale;
      rheight += ry;
      ry = 0;
    }
    if (rheight > this.height) {
      sheight -= (rheight - this.height) / this.scale;
      rheight = this.height;
    }


    if (!onlyCropped) {
      ctxt.globalAlpha = 0.3;
      ctxt.drawImage(this.img,
                     0, 0, this.img.width, this.img.height,
                     this.x, this.y, this.scale*this.img.width, this.scale*this.img.height);

      ctxt.globalAlpha = 1.0;
      ctxt.fillStyle = "#fff";
      ctxt.fillRect(rx, ry, rwidth, rheight);
    }

    let tmp_ctxt = this.tmp_ctxt;
    tmp_ctxt.fillStyle = "#fff";
    tmp_ctxt.fillRect(0, 0, rwidth + 1, rheight + 1);

    tmp_ctxt.drawImage(this.img,
                       sx, sy, swidth, sheight,
                       0, 0, rwidth, rheight);

    let imgdata = tmp_ctxt.getImageData(0, 0, Math.max(1, Math.floor(rwidth)), Math.max(1, Math.floor(rheight)));
    let data = imgdata.data;

    let width = imgdata.width;
    let height = imgdata.height;

    stackBlurRGB(data, width, height, this.blur);

    let gdata = new Uint8Array(width * height);

    // make grayscale (put everything into channel 1)
    let do_invert = this.invert;
    for (let i = 0; i < gdata.length; i++) {
      let c = (data[4*i] + data[4*i+1] + data[4*i+2])/3;
      if (do_invert) {
        c = 255 - c;
      }
      gdata[i] = c;
    }

    stackBlurRGB(data, width, height, this.adaptive);

    // threshold
    for (let i = 0; i < gdata.length; i++) {
      let adapt = (data[4*i] + data[4*i+1] + data[4*i+2])/3;
      let c = gdata[i] - adapt;
      c = (c/255 <= this.threshold) ? 0 : 255;
      gdata[i] = c;
    }

    for (let i = 0; i < gdata.length; i++) {
      let c = gdata[i];
      data[4*i] = data[4*i+1] = data[4*i+2] = c;
      data[4*i+3] = 255;
    }

    ctxt.putImageData(imgdata, rx, ry);

    ctxt.restore();
  }
}

// UndoStack keeps track of changes as a list of complete views

class UndoStack {
  constructor() {
    this.versions = []; // a list of Views
    this.i = -1;
    this.length = 0;
    this.listeners = [];
  }
  
  _notify() {
    this.listeners.map(f => f(this));
  }
  
  get() {
    assert(0 <= this.i && this.i < this.length);
    return this.versions[this.i];
  }
  push(version) {
    this.versions.length = this.i + 1;
    this.versions.push(version);
    this.i = this.versions.length - 1;
    this.length = this.versions.length;
    this._notify();
  }
  undo() {
    if (this.i > 0) {
      this.i--;
      this._notify();
    }
  }
  redo() {
    if (this.i + 1 < this.versions.length) {
      this.i++;
      this._notify();
    }
  }
}

Q(function () {
  window.addEventListener('error', function (e) {
    let close = Q.create("input", {type:"button", className:"program-error-close"}).value("X");
    let $box = Q.create("div", {className:"program-error"},
                        close,
                        Q.create("h1", "Unhandled error"),
                        Q.create("p", "Message: " + e.message),
                        Q.create("p", "in " + e.filename + ":" + e.lineno + ":" + e.colno),
                        Q.create("p", "Error object: " + JSON.stringify(e.error)));
    Q("body").append($box);
    close.on("click", e => $box.remove());
  });

  var undo_stack = new UndoStack();

  undo_stack.listeners.push(undo_stack => {
    Q(".undo-state").empty().append(`${undo_stack.i + 1}/${undo_stack.length}`);
    Q("input.action-undo").prop("disabled", undo_stack.i <= 0);
    Q("input.action-redo").prop("disabled", undo_stack.i + 1 >= undo_stack.length);
  });
  Q("input.action-undo").on("click", () => {
    undo_stack.undo();
  });
  Q("input.action-redo").on("click", () => {
    undo_stack.redo();
  });
  Q("input.action-clear").on("click", () => {
    undo_stack.push(new KnotRasterView(WIDTH, HEIGHT));
  });

  var canvas = Q.create("canvas").appendTo(Q("#editor"));
  canvas.prop("width", WIDTH);
  canvas.prop("height", HEIGHT);

  var ctxt = canvas[0].getContext('2d');
  undo_stack.listeners.push(undo_stack => {
    Q(".modename").empty().append(undo_stack.get().mode_name);
    undo_stack.get().paint(ctxt);

    let $tools = Q("#tools").empty();
    $tools.append(undo_stack.get().toolbox(undo_stack, ctxt));
  });

  undo_stack.push(new KnotRasterView(WIDTH, HEIGHT));

  function mousePos(e) {
    let rect = canvas[0].getBoundingClientRect();
    return new Point(Math.floor(e.clientX - rect.left-1), Math.floor(e.clientY - rect.top-1));
  }

  canvas.on("mousedown", function (e) {
    e.preventDefault();
    e.stopPropagation();
    undo_stack.get().mousedown(mousePos(e), e, undo_stack, ctxt);
  });
  canvas.on("mousemove", function (e) {
    e.preventDefault();
    e.stopPropagation();
    undo_stack.get().mousemove(mousePos(e), e, undo_stack, ctxt);
  });
  canvas.on("mouseup", function (e) {
    e.preventDefault();
    e.stopPropagation();
    undo_stack.get().mouseup(mousePos(e), e, undo_stack, ctxt);
  });
  canvas.on("contextmenu", function (e) {
    e.preventDefault();
  });
  canvas.on("wheel", function (e) {
    e.preventDefault();
    e.stopPropagation();
    let view = undo_stack.get();
    if (view.mousewheel) {
      view.mousewheel(mousePos(e), e, undo_stack, ctxt);
    }
  });

  canvas.on("touchstart", function (e) {
    if (e.touches.length > 1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.button = 0;
    e.buttons = 1;
    undo_stack.get().mousedown(mousePos(e.changedTouches[0]), e, undo_stack, ctxt);
  });
  canvas.on("touchmove", function (e) {
    if (e.touches.length > 1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.button = 0;
    e.buttons = 1;
    undo_stack.get().mousemove(mousePos(e.changedTouches[0]), e, undo_stack, ctxt);
  });
  canvas.on("touchend", function (e) {
    if (e.touches.length > 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.button = 0;
    e.buttons = 0;
    undo_stack.get().mouseup(mousePos(e.changedTouches[0]), e, undo_stack, ctxt);
  });


  function process_img_upload() {
    let img = this;
    undo_stack.push(new KnotImageImportView(WIDTH, HEIGHT, img));
  }

  function show_drop_area(shown) {
    Q("#drop-area").css("display", shown ? "block" : "none");
  }

  let drag_enter_counter = 0;
  document.addEventListener("dragenter", e => {
    e.preventDefault();
    e.stopPropagation();
    drag_enter_counter++;
    show_drop_area(drag_enter_counter > 0);
  }, true);
  document.addEventListener("dragleave", e => {
    e.preventDefault();
    e.stopPropagation();
    drag_enter_counter--;
    show_drop_area(drag_enter_counter > 0);
  }, true);
  document.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    show_drop_area(true);
  }, true);
  document.addEventListener("drop", e => {
    e.preventDefault();
    e.stopPropagation();
    drag_enter_counter = 0;
    show_drop_area(false);

    let uri = e.dataTransfer.getData('text/uri-list');
    if (uri) {
      let uris = uri.split("\n");
      for (let i = 0; i < uris.length; i++) {
        if (uris[i][0] !== "#") {
          let img = document.createElement("img");
          img.crossOrigin = "Anonymous"; // just in case the site allows it (CORS prevents most things)
          img.onload = process_img_upload;
          img.src = uris[i];
          return;
        }
      }
    }

    let files = e.dataTransfer.files;
    if (files.length > 0) {
      let file = files[0];
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        let img = document.createElement("img");
        img.onload = process_img_upload;
        img.src = reader.result;
      };
      return;
    }
  }, true);

  document.addEventListener('paste', e => {
    let items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        let file = items[i].getAsFile();
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          let img = document.createElement("img");
          img.onload = process_img_upload;
          img.src = reader.result;
        };
        return;
      }
    }
  }, false);
});
//# sourceMappingURL=main.js.map
