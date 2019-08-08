"use strict";

const WIDTH = 800;
const HEIGHT = 800;
const PAINT_RADIUS = 1;
const PAINT_GAP = 2;
const ERASE_RADIUS = 5;
const MIN_LINE_LENGTH = 2;
const MAX_PPREV_DIST = 2*PAINT_RADIUS+1 + 2*PAINT_GAP;
const SPUR_LENGTH = 5; // the maximum-length spurs that will be auto-deleted in clean-up
const ERROR_RADIUS = 6.5; // the radius of the red "error circles"
const MAX_GAP_LENGTH = 50; // for under-crossings and gaps in lines

const CROSSING_CHANGE_RADIUS = 10;
const DIAGRAM_LINE_WIDTH = 3;

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

///// Utility functions

function assert(b) {
  if (!b) {
    throw new Error("assertion failed");
  }
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

Function.prototype.def_methods = function (source) {
  /* Define prototype methods, copied from the source object. */
  for (var key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      this.prototype[key] = source[key];
    }
  }
  return this;
};

function equal(a, b) {
  /* An structural equality function that looks for an equals method
     on the first argument.  Falls back to ===. */
  if (typeof a === "object") {
    if (typeof b === "object") {
      if (a.equal) {
        return a.equal(b);
      }
      if (a instanceof Array) {
        if (!(b instanceof Array)) {
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
  /* Returns "a - b" for comparison purposes. */
  assert(typeof a === typeof b);
  if (typeof a === "object") {
    if (a instanceof Array) {
      assert(b instanceof Array);
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      for (let i = 0; i < a.length; i++) {
        let c = compare(a[i], b[i]);
        if (c !== 0) return c;
      }
      return 0;
    }
    return a.compare(b);
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

class SimpleType extends Array {
  /* A Mathematica-like type where the "head" is the constructor. */
  constructor() {
    super();
    for (let i = 0; i < arguments.length; i++) {
      this.push(arguments[i]);
    }
  }
  equal(b) {
    assert(b instanceof self.constructor);
    if (this.length !== b.length)
      return false;
    for (let i = 0; i < this.length; i++) {
      if (!equal(this[i], b[i]))
        return false;
    }
    return true;
  }
  compare(b) {
    assert(b instanceof self.constructor);
    if (this.length !== b.length)
      return this.length - b.length;
    for (let i = 0; i < this.length; i++) {
      let c = compare(this[i], b[i]);
      if (c !== 0) return c;
    }
    return 0;
  }
  toString() {
    return this.constructor.name + "(" + this.join(", ") + ")";
  }
}

///// Basic geometry

class Point {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
}
Point.def_methods({
  toString: function () {
    return "Point(" + this.x + ", " + this.y + ")";
  }
});
Point.equal = function (p1, p2) {
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  return p1.x === p2.x && p1.y === p2.y;
};
Point.similar = function (p1, p2, error=1e-10) {
  /* Checks to see if the points are close to each other, within the
     given error in each coordinate. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  return Math.abs(p1.x - p2.x) < error && Math.abs(p1.y - p2.y) < error;
};
Point.dist = function (p1, p2) {
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  var dx = p1.x - p2.x,
      dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
};

function calculate_angle(p0, p1, p2) {
  /* Given segments (p0, p1) and (p0, p2), calculates the angle from p1 to p2. Returns an angle in (-pi,pi].*/
  assert(p0 instanceof Point);
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  let vx = p1.x - p0.x,
      vy = p1.y - p0.y,
      wx = p2.x - p0.x,
      wy = p2.y - p0.y;
  // Put w into the orthogonal frame given by v
  let vnorm = Math.sqrt(vx * vx + vy * vy);
  let x = (vx*wx + vy*wy)/vnorm,
      y = (-vy*wx + vx*wy)/vnorm;
  return Math.atan2(y, x);
}

function segment_contains(p1, p2, q, error=1e-10) {
  /* Checks if the line segment (p1,p2) contains the point q. Returns a boolean. */
  assert(!(Point.equal(p1, p2)));
  assert(q instanceof Point);
  let vx = p2.x - p1.x,
      vy = p2.y - p1.y;
  let wx = q.x - p1.x,
      wy = q.y - p1.y;
  let det = -vy*wx + vx*wy;
  if (Math.abs(det) <= error) {
    let t = (vx*wx + vy*wy) / (vx*vx + vy*vy);
    return 0 <= t && t <= 1;
  } else {
    return false;
  }
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

function segments_intersect(p1, p2, q1, q2) {
  /* Checks if the line segments (p1,p2) and (q1,q2) intersect.
     Returns the intersection point if they do intersect. */

  // Thanks to Josh Horowitz, from his Knot Identification Tool
  // https://github.com/joshuahhh/knot-identification-tool/
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  assert(q1 instanceof Point);
  assert(q2 instanceof Point);
  let det = (p1.x-p2.x)*(q1.y-q2.y)-(p1.y-p2.y)*(q1.x-q2.x);
  let xi = ((p1.x*p2.y-p1.y*p2.x)*(q1.x-q2.x)-(p1.x-p2.x)*(q1.x*q2.y-q1.y*q2.x))/det;
  if (((p1.x <= xi && xi <= p2.x) || (p2.x <= xi && xi <= p1.x)) &&
      ((q1.x <= xi && xi <= q2.x) || (q2.x <= xi && xi <= q1.x))) {
    let yi = ((p1.x*p2.y-p1.y*p2.x)*(q1.y-q2.y)-(p1.y-p2.y)*(q1.x*q2.y-q1.y*q2.x))/det;
    if (((p1.y <= yi && yi <= p2.y) || (p2.y <= yi && yi <= p1.y)) &&
        ((q1.y <= yi && yi <= q2.y) || (q2.y <= yi && yi <= q1.y))) {
      return new Point(xi, yi);
    }
  }
  return null;
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
     from p1 to p2. */
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

///// Planar Diagrams (PD)

class PD_X extends Array {
  constructor (a, b, c, d) {
    /* Represents a crossing like
       
         c \ / b
            /
         d / \ a

       where a, b, c, and d are edge ids.
    */
    super();
    this.push(a, b, c, d);
  }
  toString() {
    return "X[" + this.join(",") + "]";
  }
}
class PD_P extends Array {
  constructor (a, b) {
    super();
    this.push(a, b);
  }
  toString() {
    return "P[" + this.join(",") + "]";
  }
}
class PD_Xr extends Array {
  constructor (a, b, c, d) {
    /* Represents an oriented crossing like
       
         c ^ ^ b
            /
         d / \ a

       where a, b, c, and d are edge ids. */
    super();
    this.push(a, b, c, d);
  }
  toString() {
    return "Xr[" + this.join(",") + "]";
  }
}
class PD_Xl extends Array {
  constructor (a, b, c, d) {
    /* Represents an oriented crossing like
       
         b ^ ^ a
            \
         c / \ d

       where a, b, c, and d are edge ids. */
    super();
    this.push(a, b, c, d);
  }
  toString() {
    return "Xl[" + this.join(",") + "]";
  }
}

///// Polynomials

// A simple kind of Laurent polynomial representation is [[coeff, exponent]...]

class LTerm extends SimpleType {}

class Laurent extends SimpleType {
  copy() {
    return new Laurent(...this); // since terms are never modified
  }
  simplify() {
    /* Destructively simplify the polynomial */
    this.sort((t1, t2) => t1[1] - t2[1]);
    let i = 0;
    while (i < this.length) {
      let t1 = this[i];
      let sum = t1[0];
      let j = i + 1;
      while (j < this.length && this[j][1] === t1[1]) {
        sum += this[j][0];
        j++;
      }
      if (sum === 0) {
        this.splice(i, j-i);
      } else if (j > i + 1) {
        this[i] = [sum, t1[1]];
        this.splice(i+1, j-i-1);
        i++;
      } else {
        i++;
      }
    }
    return this;
  }
  toString() {
    /* Outputs an [exponent; coefficient...] list. */
    this.simplify();
    if (this.length === 0) {
      return "[0; 0]";
    }
    let minexp = this[0][1];
    let coeffs = [];
    this.forEach(term => {
      coeffs[term[1]-minexp] = term[0];
    });
    for (let i = 0; i < coeffs.length; i++) {
      if (coeffs[i] === void 0) {
        coeffs[i] = 0;
      }
    }
    return "[" + minexp + "; " + coeffs + "]";
  }
  toPolyString(variable="t") {
    this.simplify();
    if (this.length === 0) {
      return "0";
    }
    let s = "";
    for (let i = this.length-1; i >= 0; i--) {
      let term = this[i];
      if (term[0] > 0) {
        if (s.length !== 0) {
          s += " + ";
        }
        if (term[0] === 1 && term[1] === 0) {
          s += "1";
        } else {
          if (term[0] !== 1) {
            s += term[0];
          }
          if (term[1] !== 0) {
            s += variable;
            if (term[1] !== 1) {
              s += "^" + term[1];
            }
          }
        }
      } else if (term[0] === -1) {
        if (s.length === 0) {
          s += "-";
        } else {
          s += " - ";
        }
        if (term[1] === 0) {
          s += "1";
        } else {
          s += variable;
          if (term[1] !== 1) {
            s += "^" + term[1];
          }
        }
      } else {
        if (s.length === 0) {
          s += term[0];
        } else {
          s += " - " + (-term[0]);
        }
        if (term[1] !== 0) {
          s += variable;
          if (term[1] !== 1) {
            s += "^" + term[1];
          }
        }
      }
    }
    return s;
  }

  add(p2, c=1, exp_offset=0) {
    /* assumes both polynomials are simplified. returns a simplified
       polynomial. calculates this + c*p2*t^exp_offset. */
    assert(p2 instanceof Laurent);
    let p1 = this;
    let p = new Laurent();
    let i1 = 0, i2 = 0;
    while (i1 < p1.length && i2 < p2.length) {
      let t1 = p1[i1], t2 = p2[i2];
      if (t1[1] < t2[1]+exp_offset) {
        p.push(t1);
        i1++;
      } else if (t1[1] > t2[1]+exp_offset) {
        p.push([c*t2[0], t2[1]+exp_offset]);
        i2++;
      } else {
        let sum = t1[0]+c*t2[0];
        if (sum !== 0) {
          p.push([sum, t1[1]]);
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
      p.push([c*t2[0], t2[1]+exp_offset]);
    }
    return p;
  }

  mul(p2) {
    /* Assumes this and p2 are simplified. Returns this*p2, simplified.
       Does the grade-school algorithm using each term of p2.*/
    assert(p2 instanceof Laurent);
    let p = new Laurent;
    p2.forEach(t => {
      p = p.add(this, t[0], t[1]);
    });
    return p;
  }

  coeffs() {
    if (this.length === 0) {
      return [];
    } else {
      let minexp = this[0][1];
      let coeffs = [];
      this.forEach(term => {
        coeffs[term[1]-minexp] = term[0];
      });
      for (let i = 0; i < coeffs.length; i++) {
        if (coeffs[i] === void 0) {
          coeffs[i] = 0;
        }
      }
      return coeffs;
    }
  }
  minexp() {
    if (this.length === 0) {
      return 0; // or is it -Infinity?
    } else {
      return this[0][1];
    }
  }

  divloop() {
    /* Divides by -t^2-t^(-2), which is important for the Kauffman bracket. */

    // divide by 1+t^4 and renormalize

    if (this.length === 0) {
      return Laurent.zero;
    }

    let coeffs = this.coeffs();
    let minexp = this.minexp();
    let q = new Laurent();
    let state = [0,0,0,0];
    for (let i = 0; i < coeffs.length; i++) {
      let a = coeffs[i] - state[3];
      state.pop();
      state.unshift(a);
      if (a !== 0) {
        q.push(new LTerm(-a, i + minexp + 2));
      }
    }
    assert(state.every(x => x === 0));
    return q;
  }
}
Laurent.zero = new Laurent();
Laurent.unit = new Laurent(new LTerm(1,0));
Laurent.t = new Laurent(new LTerm(1,1));
Laurent.tinv = new Laurent(new LTerm(1,-1));

// A TL element is [[laurent coeff, [[e1,e2],[e1,e2],...]],...]
function tl_order(pl1, pl2) {
  if (pl1.length !== pl2.length) {
    return pl1.length - pl2.length;
  }
  for (let i = 0; i < pl1.length; i++) {
    let p1 = pl1[i], p2 = pl2[i];
    if (p1[0] !== p2[0]) {
      return p1[0] - p2[0];
    }
    if (p1[1] !== p2[1]) {
      return p1[1] - p2[1];
    }
  }
  return 0;
}
let TL_loop = new Laurent(new LTerm(-1, -2), new LTerm(-1, 2));
let TL = {
  unit: [[Laurent.unit, []]],
  toString: function (tl) {
    return "TL[" + tl.map(term => term[0] + " " + term[1].map(p => "P[" + p + "]").join(" ") + "]").join(" + ") + "]";
  },
  simplify: function (tl) {
    /* Destructively simplify tl */
    tl.forEach(term => {
      // look for matching path indices in term[1]
      let coeff = term[0],
          paths = term[1];
      let i = 0;
      main_loop:
      while (i < paths.length) {
        let p1 = paths[i];
        if (p1[0] === p1[1]) { // self-loop
          coeff = coeff.mul(TL_loop);
          paths.splice(i, 1);
          continue main_loop;
        }
        let j = i + 1;
        while (j < paths.length) {
          let p2 = paths[j];
          for (let k1 = 0; k1 < 2; k1++) {
            for (let k2 = 0; k2 < 2; k2++) {
              if (p1[k1] === p2[k2]) {
                paths[i] = [p1[1-k1], p2[1-k2]];
                paths.splice(j,1);
                continue main_loop;
              }
            }
          }
          j++;
        }
        i++;
      }

      term[0] = coeff;
      // now paths are simplified

      paths.forEach(p => {
        p.sort((a, b) => a - b);
      });
      paths.sort((p1, p2) => p1[0] - p2[0]); // this is lexicographic since all indices are different
      
    });

    tl.sort((term1, term2) => tl_order(term1[1], term2[1]));

    let i = 0;
    while (i < tl.length) {
      let term = tl[i];
      let sum = term[0];
      let j = i + 1;
      while (j < tl.length && tl_order(term[1], tl[j][1]) === 0) {
        sum = sum.add(tl[j][0]);
        j++;
      }
      if (sum.length === 0) {
        tl.splice(i, j-i);
      } else {
        term[0] = sum;
        tl.splice(i+1, j-i-1);
        i++;
      }
    }
    return tl;
  },
  add: function (tl1, tl2) {
    let tl = tl1.concat(tl2);
    return TL.simplify(tl);
  },
  mul: function (tl1, tl2) {
    let tl = [];
    tl1.forEach(term1 => {
      tl2.forEach(term2 => {
        tl.push([term1[0].mul(term2[0]),
                 term1[1].concat(term2[1])]);
      });
    });
    return TL.simplify(tl);
  }
};

///// Knot UI

function UndoStack() {
  this.versions = []; // a list of Views
  this.i = -1;
  this.length = 0;
  this.listeners = [];
}
UndoStack.def_methods({
  _notify: function () {
    this.listeners.map(f => f(this));
  },
  get: function () {
    assert(0 <= this.i && this.i < this.length);
    return this.versions[this.i];
  },
  push: function (version) {
    this.versions.length = this.i + 1;
    this.versions.push(version);
    this.i = this.versions.length - 1;
    this.length = this.versions.length;
    this._notify();
  },
  undo: function () {
    if (this.i > 0) {
      this.i--;
      this._notify();
    }
  },
  redo: function () {
    if (this.i + 1 < this.versions.length) {
      this.i++;
      this._notify();
    }
  }
});

function KnotRasterView(width, height) {
  assert(width > 0);
  assert(height > 0);
  this.width = width;
  this.height = height;
  this.buffer = new Int8Array(this.width * this.height);
  this.temp = new Int8Array(this.width * this.height);

  this.mode_name = "Painting"; // constant
  this.next_knot = null;
}
/* The global state for painting in this View */
KnotRasterView.painting_state = {
  mode: "pencil",
  color: 1,
  go_over: 1
};
KnotRasterView.def_methods({
  copy: function () {
    let kb = new KnotRasterView(this.width, this.height);
    kb.buffer.set(this.buffer);
    return kb;
  },

  mousedown: function (pt, e, undo_stack, ctxt) {
    if (e.button === 0 || e.button === 2) {
      if (this.next_knot) {
        this.mousemove(pt, e, undo_stack, ctxt);
        return;
      }
      this.next_knot = this.copy();
      if (e.button === 0) {
        if (KnotRasterView.painting_state.mode === "eraser") {
          this.the_color = 0;
        } else {
          this.the_color = KnotRasterView.painting_state.color;
        }
      } else {
        this.the_color = 0;
        if (this.mark_tool) {
          this.mark_tool("eraser");
        }
      }
      let go_over = KnotRasterView.painting_state.go_over * (e.shiftKey ? -1 : 1);
      this.mark_height(go_over);
      this.next_knot.draw_line(null, null, pt, this.the_color, go_over);
      this.pprev = [];
      this.pt1 = pt;
      this.paint(ctxt);
    }
  },
  mousemove: function (pt2, e, undo_stack, ctxt) {
    if (this.next_knot) {
      if (Point.dist(this.pt1, pt2) < MIN_LINE_LENGTH) {
        return;
      }
      let go_over = KnotRasterView.painting_state.go_over * (e.shiftKey ? -1 : 1);
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
  },
  mouseup: function (pt, e, undo_stack, ctxt) {
    if (this.next_knot) {
      this.mousemove(pt, e, undo_stack, ctxt);
      let knot = this.next_knot;
      this.next_knot = null;
      undo_stack.push(knot);
    }
  },
  toolbox: function (undo_stack) {
    let $div = this.$div = Q.div();

    { /* Tools */
      let $tools = Q.div().appendTo($div);
      Q.create("h2").append("Tools").appendTo($tools);
      let $pencil = Q.span("\u270e")
          .addClass("icon-button")
          .prop("data-mode", "pencil")
          .prop("title", "Pencil")
          .appendTo($tools);
      let $eraser = Q.span("\u2717")
          .addClass("icon-button")
          .prop("data-mode", "eraser")
          .prop("title", "Eraser [right click]")
          .appendTo($tools);

      this.mark_tool = function (drawing_mode) {
        /* Set a tool button to be active, depending on the mode */
        $pencil.removeClass("active");
        $eraser.removeClass("active");
        switch (drawing_mode) {
        case "pencil":
          $pencil.addClass("active");
          break;
        case "eraser":
          $eraser.addClass("active");
          break;
        }
      };
      this.mark_tool(KnotRasterView.painting_state.mode);
      $tools.on("click", e => {
        let el = e.target.closest('.icon-button');
        if (el) {
          let mode = Q(el).prop("data-mode");
          if (mode) {
            e.preventDefault();
            e.stopPropagation();
            KnotRasterView.painting_state.mode = mode;
            this.mark_tool(mode);
          }
        }
      });
    }

    { /* Over/under */
      let $height = Q.div().appendTo($div);
      Q.create("h2").append("Pencil mode").appendTo($height);
      let $over = Q.span("\u2197")
          .addClass("icon-button")
          .prop("data-height", 1)
          .prop("title", "Go over")
          .appendTo($height);
      let $same = Q.span("\u2192")
          .addClass("icon-button")
          .prop("data-height", 0)
          .prop("title", "Go through (no auto-gaps)")
          .appendTo($height);
      let $under = Q.span("\u2198")
          .addClass("icon-button")
          .prop("data-height", -1)
          .prop("title", "Go under [shift]")
          .appendTo($height);
      this.mark_height = function (go_over) {
        $over.toggleClass("active", go_over > 0);
        $same.toggleClass("active", go_over === 0);
        $under.toggleClass("active", go_over < 0);
      };
      this.mark_height(KnotRasterView.painting_state.go_over);
      $height.on("click", e => {
        let el = e.target.closest('.icon-button');
        if (el) {
          let height = Q(el).prop("data-height");
          if (typeof height === "number") {
            e.preventDefault();
            e.stopPropagation();
            KnotRasterView.painting_state.go_over = height;
            this.mark_height(height);
          }
        }
      });
    }

    { /* Colors */
      let $colors = Q.div().appendTo($div);
      Q.create("h2").append("Pencil colors").appendTo($colors);
      palette.forEach((hex, i) => {
        let $b = Q.span().addClass("icon-button")
            .prop("data-color", i+1)
            .prop("title", "Color " + (i+1))
            .appendTo($colors);
        let $bs = Q.span(" ").addClass("icon-color")
            .css("background", hex_to_rgb(hex))
            .appendTo($b);
      });
      this.mark_color = function (i) {
        /* Set a color button to be active, depending on the color index i. */
        $colors.query(".icon-button").forEach(b => {
          b.toggleClass("active", b.prop("data-color") === i);
        });
      };
      this.mark_color(KnotRasterView.painting_state.color);
      $colors.on("click", e => {
        let el = e.target.closest('.icon-button');
        if (el) {
          let color = Q(el).prop("data-color");
          if (color) {
            e.preventDefault();
            e.stopPropagation();
            KnotRasterView.painting_state.color = color;
            this.mark_color(color);
          }
        }
      }, true);
    }

    Q.create("hr").appendTo($div);

    let $thin = Q.create("input")
        .prop("type", "button")
        .value("Thin")
        .prop("title", "Clear boundary pixels of curves")
        .appendTo($div);
    $thin.on("click", e => {
      let knot = this.copy();
      knot.thin();
      undo_stack.push(knot);
    });

    let $thicken = Q.create("input")
        .prop("type", "button")
        .value("Thicken")
        .prop("title", "Add boundary pixels to curves")
        .appendTo($div);
    $thicken.on("click", e => {
      let knot = this.copy();
      knot.thicken();
      undo_stack.push(knot);
    });

    $div.append(Q.create("br"));

    let $clean = Q.create("input")
        .prop("type", "button")
        .value("Clean up")
        .prop("title", "Find cores of curves")
        .appendTo($div);
    $clean.on("click", e => {
      let knot = this.copy();
      knot.clean_up();
      undo_stack.push(knot);
    });

    $div.append(Q.create("hr"));

    let $convert = Q.create("input")
        .prop("type", "button")
        .value("Convert to diagram")
        .prop("title", "Analyze picture and convert to a diagram")
        .appendTo($div);
    $convert.on("click", e => {
      undo_stack.push(this.convert());
    });

    if (this.the_error) {
      let $error = Q.div().addClass("error");
      $error.append(Q.create("h2").append("Error"));
      if (this.the_error instanceof Array) {
        this.the_error.forEach(err => $error.append(Q.p(''+err)));
      } else {
        $error.append(Q.p(''+this.the_error));
      }
      $div.append($error);
    }

    return $div;
  },
  paint: function (ctxt) {
    let imgdata = ctxt.getImageData(0, 0, this.width, this.height);
    this.writeImage(imgdata);
    ctxt.putImageData(imgdata, 0, 0);
  },

  writeImage: function (imageData) {
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
  },
  fromImage: function (imageData) {
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
  },

  draw_line: function (pprev, p1, p2, v, go_over = 1) {
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

      // detect endpoints to suppress white border when closing up
      if(0)with_radius(p2.x, p2.y, PAINT_RADIUS + PAINT_GAP, (x, y) => {
        if (getPixel(x, y) !== v || getTempPixel(x, y) !== -1) {
          return;
        }
        var state = -1;
        var changes = -1;
        function visit(x2, y2) {
          if (getTempPixel(x2, y2) === -2) {
            return;
          }
          let c = getPixel(x2, y2);
          if (c !== state) {
            state = c;
            changes++;
          }
        }
        let r = 2*PAINT_RADIUS + PAINT_GAP;
        // go in counter-clockwise square of radius r about (x,y).
        for (let x2 = x - r; x2 < x + r; x2++) {
          visit(x2, y + r);
        }
        for (let y2 = y + r; y2 > y - r; y2--) {
          visit(x + r, y2);
        }
        for (let x2 = x + r; x2 > x - r; x2--) {
          visit(x2, y - r);
        }
        for (let y2 = y - r; y2 < y + r; y2++) {
          visit(x - r, y2);
        }
        if (changes === 2) {
          find_existing(r, x, y);
        }
      });

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
  },

  strip_errors: function () {
    let buf = this.buffer;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] < 0) buf[i] = 0;
    }
  },
  add_error: function (pt, r = ERROR_RADIUS) {
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
  },

  thin: function () {
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
  },

  thicken: function () {
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
  },

  clean_up: function () {
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
  },

  convert: function () {
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
    function match_up(points, color, max_gap) {
      /* Looks for a perfect matching that optimizes a heuristic (sum
      of distances divided by (number of segments crossed - 1)).*/
      let graph = [];
      for (let i = 0; i < points.length; i++) {
        let p1 = points[i];
        for (let j = i + 1; j < points.length; j++) {
          let p2 = points[j];
          let d = Point.dist(p1, p2);
          if (d <= max_gap) { // TODO optimize this with a better datastructure
            let pcount = 0;
            let state = -2;
            for (let lp of line_points(p1, p2)) {
              let c = tknot.buffer[width*lp.y+lp.x];
              if (c !== state) {
                if (c > 0) {
                  pcount++;
                }
                state = c;
              }
            }
            if (pcount > 1) {
              // Then this is a non-backtracking line segment
              var score = d / (pcount - 1);
              graph.push([i, j, score, false]); // p1, p2, score, is_used
            }
          }
        }
      }
      graph.sort((e1, e2) => e1[2] - e2[2]);

      let best_score = Infinity;
      let best_match = null;

      let cur_match = [];
      let used_points = Array(points.length).fill(false);
      function find(cur_score, num_used_points, edge_i) {
        if (best_match !== null) {
          // TODO This might cause problems, but I hope the heuristic
          // of having the edges in ascending order of score will get
          // good enough results.  Otherwise large diagrams can take a
          // while...
          return;
        }
        if (cur_score >= best_score
            || 2*(graph.length - edge_i) < points.length - num_used_points) {
          return;
        }
        if (num_used_points === points.length) {
          best_score = cur_score;
          best_match = cur_match.slice();
          return;
        }
        for (; edge_i < graph.length; edge_i++) {
          let edge = graph[edge_i];
          let p1 = edge[0],
              p2 = edge[1];
          if (!used_points[p1] && !used_points[p2]) {
            used_points[p1] = true;
            used_points[p2] = true;
            cur_match.push(edge_i);
            find(cur_score + edge[2], num_used_points + 2, edge_i + 1);
            cur_match.pop();
            used_points[p1] = false;
            used_points[p2] = false;
          }
        }
      }

      find(0, 0, 0);
      if (best_match === null) {
        return null;
      }
      let edges = [];
      best_match.forEach(edge_j => {
        let edge = graph[edge_j];
        edges.push([points[edge[0]], points[edge[1]]]);
      });
      return edges;
    }

    // Collect the matching now.
    let matches = []; // [p1, p2, color]
    let errors = [];
    endpoints.forEach((points, color) => {
      let match = null;
      match = match_up(points, color, MAX_GAP_LENGTH);
      if (match === null) {
        found_error = true;
        points.forEach(pt => knot.add_error(pt));
        errors.push("Couldn't find a way to match up endpoints in the component of color "
                    + color + ".  This can be because some pair of endpoints are too far apart from each other.  Since it is hard to diagnose the problem algorithmically, all endpoints of the component have been marked.");
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
      matches.forEach(match => {
        knot.draw_line(null, match[0], match[1], match[2], -1);
      });
      errors.push("(All found matchings are drawn in on of the thinned version of the picture, to give some idea of what the program is seeing.  This can usually be edited and converted without undoing.)");
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
              let pt2 = verts.length;
              verts.push(new Point(x+dx, y+dy));
              edges.push([pt1, pt2, c, true]);
              pt1 = pt2;
              x = x + dx; y = y + dy;
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
          if (segment_contains(verts[seg[i]], verts[seg[i+1]], v)) {
            //console.log("Hit vertex " + vi);
            seg.splice(i+1, 0, vi);
            return;
          }
        }
      });
      // Maybe (likely) seg intersects current edges.  Split both if this is the case
      var new_edges = [];
      edges.forEach((edge, edge_i) => {
        for (let i = 0; i + 1 < seg.length; i++) {
          let int_pt = segments_intersect(verts[edge[0]], verts[edge[1]],
                                          verts[seg[i]], verts[seg[i+1]]);          
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
            if (!Point.similar(int_pt, verts[edge[0]]) && !Point.similar(int_pt, verts[edge[1]])) {
              new_edges.push([int_pt_i(), edge[1], edge[2], true]);
              edge[1] = int_pt_i();
              //console.log("Splitting edge");
            }
            if (!Point.similar(int_pt, verts[seg[i]]) && !Point.similar(int_pt, verts[seg[i+1]])) {
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

    let diagram = new KnotDiagramGraph(verts, edges, adj_lists);

    // sort adj_lists
    adj_lists.forEach((list, i) => {
      if (list.length === 2) {
        let e0 = diagram.dart_edge(list[0]), e1 = diagram.dart_edge(list[1]);
        assert(e0[2] === e1[2]); // same color
        return;
      }
      assert(list.length === 4);
      let vert = verts[i];
      let lverts = list.map(dart => diagram.dart_end(dart));
      // The angles are negative since the coordinate system has inverted y due to the canvas.
      let angles = lverts.map(vi => -calculate_angle(vert, verts[lverts[0]], verts[vi]));
      function mswap(i, j) {
        /* maybe swap the angle and list arrays, depending on the value of the angle */
        if (angles[i] > angles[j]) {
          let t_angle = angles[i];
          angles[i] = angles[j];
          angles[j] = t_angle;
          let t_list = list[i];
          list[i] = list[j];
          list[j] = t_list;
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

    // let the diagram choose orientations
    diagram.ensure_orientation();

    return new KnotDiagramView(this.width, this.height, diagram);
  }
});

function KnotDiagramGraph(verts, edges, adj) {
  this.verts = verts; // [Point,...]
  this.edges = edges; // [[vtx, vtx, comp],...]
  this.adj = adj; // [[dart...],...] where dart 0 and 2 are under, 1 and 3 are over
  // a dart is edgeid+1 or -edgeid-1 depending on which side the edge is
}
KnotDiagramGraph.def_methods({
  copy: function () {
    return new KnotDiagramGraph(
      this.verts.slice(),
      this.edges.map(edge => edge.slice()),
      this.adj.map(list => list.slice())
    );
  },
  ensure_orientation: function () {
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
          let t_vert = curr_edge[0];
          curr_edge[0] = curr_edge[1];
          curr_edge[1] = t_vert;
          // swap darts in adj
          let adj, idx;
          adj = this.adj[curr_edge[0]];
          idx = adj.indexOf(-d);
          assert(idx >= 0);
          adj[idx] = d;
          
          adj = this.adj[curr_edge[1]];
          idx = adj.indexOf(d);
          assert(idx >= 0);
          adj[idx] = -d;

          assert(this.dart_start(d) === curr_edge[0]);
        }
        d = this.through_dart(d);
      } while (d !== dart);
    });
    console.log("seen darts " + seen_darts.size);
    console.log("edges " + this.edges.length);
  },
  reverse_orientation: function (dart_id) {
    /* Reverses the orientation of the entire component given by
       dart_id.  Assumes the diagram is already oriented. */
    let circuit = this.dart_circuit(dart_id);
    circuit.forEach(dart => {
      let edge = this.dart_edge(dart);
      // edge[0] is dart_start, by assumption
      
      // swap vertices on edge
      let t_vert = edge[0];
      edge[0] = edge[1];
      edge[1] = t_vert;

      // swap darts in adj
      let adj, idx;
      adj = this.adj[edge[1]];
      idx = adj.indexOf(dart);
      assert(idx >= 0);
      adj[idx] = -dart;

      adj = this.adj[edge[0]];
      idx = adj.indexOf(-dart);
      assert(idx >= 0);
      adj[idx] = dart;
    });
  },
  delete_component: function (dart_id) {
    /* Deletes the entire component containing the given dart. Assumes
       the diagram is oriented.*/
    let edge_ids = this.dart_circuit(dart_id).map(dart => Math.abs(dart) - 1);
    // remove edges and vertices from the graph by setting them to null; will compact later
    edge_ids.forEach(eid => {
      let edge = this.edges[eid];
      this.adj[edge[0]] = this.adj[edge[0]].filter(d => d !== eid+1 && d != -eid-1);
      this.adj[edge[1]] = this.adj[edge[1]].filter(d => d !== eid+1 && d != -eid-1);
      this.edges[eid] = null;
    });
    let newverts = [];
    for (let i = 0; i < this.verts.length; i++) {
      if (this.adj[i].length === 0) {
        this.verts[i] = null;
      } else {
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
    let newadj = [];
    for (let i = 0; i < this.verts.length; i++) {
      let adj = this.adj[i];
      if (this.verts[i] !== null) {
        let adj2 = [];
        adj.forEach(dart => {
          let fwd = this.edges[Math.abs(dart)-1];
          if (fwd !== null) {
            adj2.push(Math.sign(dart) * (fwd + 1));
          }
        });
        newadj.push(adj2);
      }
    }
    this.verts = newverts;
    this.edges = newedges;
    this.adj = newadj;
  },
  dart_start: function (dart_id) {
    /* Takes a dart id and returns a vertex id. */
    return this.dart_edge(dart_id)[dart_id > 0 ? 0 : 1];
  },
  dart_end: function (dart_id) {
    /* Takes a dart id and returns a vertex id. */
    assert(typeof dart_id === "number");
    return this.dart_edge(dart_id)[dart_id > 0 ? 1 : 0];
  },
  dart_edge: function (dart_id) {
    /* Takes a dart id and returns its underlying edge object. */
    assert(typeof dart_id === "number");
    return this.edges[Math.abs(dart_id)-1];
  },
  dart_order: function (dart_id) {
    /* Takes a dart id and returns the number of incident darts at its vertex. */
    let adj = this.adj[this.dart_start(dart_id)];
    return adj.length;
  },
  dart_is_over: function (dart_id) {
    /* Assuming the dart id is for a dart at a crossing, gives whether the dart is part of the over-strand. */
    assert(typeof dart_id === "number");
    let adj = this.adj[this.dart_start(dart_id)];
    assert(adj.length === 4);
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return (idx % 2) === 1;
  },
  next_dart: function (dart_id) {
    /* Takes a dart id and returns the next dart in counter-clockwise
       order about its vertex. */
    assert(typeof dart_id === "number");
    let adj = this.adj[this.dart_start(dart_id)];
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return adj[(idx + 1) % adj.length];
  },
  prev_dart: function (dart_id) {
    /* Takes a dart id and returns the previous dart in counter-clockwise
       order about its vertex. */
    assert(typeof dart_id === "number");
    let adj = this.adj[this.dart_start(dart_id)];
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return adj[(idx + adj.length - 1) % adj.length];
  },
  opp_dart: function (dart_id) {
    /* Takes a dart id and returns the other dart on its edge. */
    assert(typeof dart_id === "number");
    assert(dart_id !== 0 && Math.abs(dart_id) <= this.edges.length);
    return -dart_id;
  },
  dart_oriented: function (dart_id) {
    /* Returns whether this dart is pointing in the orientation of its circuit. */
    let edge = this.dart_edge(dart_id);
    return this.dart_start(dart_id) === edge[0];
  },
  through_dart: function (dart_id) {
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
  },
  dart_circuit: function (dart_id) {
    /* Takes a dart id and returns the circuit of darts, using through_dart. */
    let path = [];
    let d = dart_id;
    do {
      path.push(d);
      d = this.through_dart(d);
    } while (d !== dart_id);
    return path;
  },

  crossing_number: function () {
    let num = 0;
    this.adj.forEach(a => {
      if (a.length === 4) {
        num++;
      }
    });
    return num;
  },

  writhe: function () {
    /* Gives the total writhe of the diagram. */
    let wr = 0;
    this.adj.forEach((a, vi) => {
      if (a.length === 4) {
        if (this.dart_oriented(a[1]) === this.dart_oriented(a[2])) {
          wr += 1;
        } else {
          wr -= 1;
        }
      }
    });
    return wr;
  },

  linking_matrix: function () {
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
    this.adj.forEach((a, vi) => {
      if (a.length === 4) {
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
      }
    });
    return matrix;
  },

  get_pd: function (oriented=false) {
    /* Gets an unoriented PD object, which is a list of connections
       and crossings.  A connection is a list [a,b] connecting edge a
       to edge b.  A crossing is a list [a,b,c,d] designating a
       crossing like
       
         c \ / b
            /
         d / \ a

       Chooses edge ids in ascending order of component. Makes sure d -> b is the orientation.
       If oriented=true, then Xr/Xl are used to determine the orientation of a--c.
    */
    let dart_arc = new Map();
    let next_arc_id = 1;
    let pd = [];
    let edge_ids = this.edges.map((edge, i) => i);
    edge_ids.sort((i1, i2) => this.edges[i1][2] - this.edges[i2][2]);
    for (let ii = 0; ii < edge_ids.length; ii++) {
      let i = edge_ids[ii];
      if (dart_arc.has(i + 1)) {
        continue;
      }
      let circuit = this.dart_circuit(i + 1);
      if (circuit.every(d => this.dart_order(d) === 2)) {
        // then this is a loop
        let arc = next_arc_id++;
        pd.push(new PD_P(arc, arc));
        circuit.forEach(d => {
          dart_arc.set(d, arc);
          dart_arc.set(-d, arc);
        });
      } else {
        let j = 0;
        while (this.dart_order(circuit[j]) !== 4) {
          j++;
        }
        circuit = circuit.slice(j).concat(circuit.slice(0, j));
        // now the first dart is at a crossing.
        for (let k = circuit.length - 1; k >= 0; k--) {
          if (this.dart_order(circuit[k]) === 4) {
            let arc_darts = circuit.slice(k);
            circuit.length = k;
            let arc = next_arc_id++;
            arc_darts.forEach(d => {
              dart_arc.set(d, arc);
              dart_arc.set(-d, arc);
            });
          }
        }
      }
    }
    this.adj.forEach(adj => {
      if (adj.length === 4) {
        if (!this.dart_oriented(adj[1])) {
          adj = adj.slice(2).concat(adj.slice(0, 2));
        }
        let arcs = adj.map(d => dart_arc.get(d));
        if (!oriented) {
          pd.push(new PD_X(...arcs));
        } else {
          if (this.dart_oriented(adj[2])) {
            pd.push(new PD_Xr(...arcs));
          } else {
            pd.push(new PD_Xl(...arcs));
          }
        }
      }
    });
    return pd;
  }
});

function kauffman_bracket(pd) {
  /* Computes the Kauffman bracket from the given pd. */
  let frontier = [];
  let bracket = TL.unit;
  while (pd.length > 0) {
    // find "best" next entity, using the most-in-frontier heuristic
    let best_count = -1;
    let best_eid = null;
    pd.forEach((entity, eid) => {
      let count = 0;
      entity.forEach(i => {
        if (frontier.indexOf(i) !== -1) {
          count++;
        }
      });
      if (count > best_count) {
        best_count = count;
        best_eid = eid;
      }
    });
    let entity = pd[best_eid];
    pd.splice(best_eid, 1);
    let tl = null;
    if (entity.length === 2) {
      console.log("!");
      tl = [[Laurent.unit, [[entity[0], entity[1]]]]];
    } else {
      console.log("!! " + entity);
      tl = [[Laurent.t, [[entity[0], entity[1]], [entity[2], entity[3]]]],
            [Laurent.tinv, [[entity[0], entity[3]], [entity[1], entity[2]]]]];
    }
    console.log(tl.toString());
    console.log(entity.toString() + " => " + TL.toString(tl));
    bracket = TL.mul(bracket, tl);
    console.log("bracket: " + TL.toString(bracket));

    // update frontier
    entity.forEach(i => {
      let idx = frontier.indexOf(i);
      if (idx === -1) {
        frontier.push(i);
      } else {
        frontier.splice(idx, 1);
      }
    });
  }
  assert(bracket.length <= 1);
  if (bracket.length === 0) {
    return Laurent.zero;
  } else {
    assert(bracket[0][1].length === 0);
    let coeff = bracket[0][0];
    return coeff.divloop();
  }
}

function KnotDiagramView(width, height, diagram) {
  assert(width > 0);
  assert(height > 0);
  assert(diagram instanceof KnotDiagramGraph);
  this.width = width;
  this.height = height;
  this.diagram = diagram;

  this.mode_name = "Diagrams"; // constant
}
KnotDiagramView.tool_state = {
  tool: "crossing-change"
};
KnotDiagramView.def_methods({
  copy: function () {
    let view = new KnotDiagramView(this.width, this.height, this.diagram.copy());
    return view;
  },

  find_closest_crossing: function (pt) {
    /* Returns a vertex id for the diagram, or null */
    let diag = this.diagram;
    let dist = CROSSING_CHANGE_RADIUS;
    let closest = null;
    diag.verts.forEach((vert, vid) => {
      if (diag.adj[vid].length === 4) {
        let d = Point.dist(pt, vert);
        if (d <= dist) {
          dist = d;
          closest = vid;
        }
      }
    });
    return closest;
  },
  draw_crossing_disk: function (ctxt, cpt) {
    ctxt.save();
    ctxt.fillStyle = "#0000ff";
    ctxt.globalAlpha = 0.2;
    ctxt.beginPath();
    ctxt.arc(cpt.x+0.5, cpt.y+0.5, CROSSING_CHANGE_RADIUS, 0, 2*Math.PI);
    ctxt.fill();
    ctxt.restore();
  },

  find_closest_circuit: function (pt) {
    /* Returns a list of darts of the closest circuit to the given point. */
    let diag = this.diagram;
    let dist = 3*DIAGRAM_LINE_WIDTH;
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
  },
  highlight_circuit: function (ctxt, circuit) {
    let diag = this.diagram;
    let pts = circuit.map(dart => diag.verts[diag.dart_start(dart)]);
    ctxt.save();
    ctxt.strokeStyle = "#0000ff";
    ctxt.globalAlpha = 0.2;
    ctxt.lineWidth = 3*DIAGRAM_LINE_WIDTH;
    ctxt.beginPath();
    ctxt.moveTo(pts[pts.length-1].x+0.5, pts[pts.length-1].y+0.5);
    pts.forEach(cpt => {
      ctxt.lineTo(cpt.x+0.5, cpt.y+0.5);
    });
    ctxt.stroke();
    ctxt.restore();

  },

  mousedown: function (pt, e, undo_stack, ctxt) {
    let tool = KnotDiagramView.tool_state.tool;
    if (tool === "crossing-change") {
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        let view = this.copy();
        let adj = view.diagram.adj[closest];
        adj.push(adj.shift());
        undo_stack.push(view);
        view.draw_crossing_disk(ctxt, view.diagram.verts[closest]);
      }
    } else if (tool === "toggle-orientation") {
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        view.diagram.reverse_orientation(circuit[0]);
        undo_stack.push(view);
        view.highlight_circuit(ctxt, circuit);
      }
    } else if (tool === "delete-component") {
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        view.diagram.delete_component(circuit[0]);
        undo_stack.push(view);
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
      }
    }
  },
  mousemove: function (pt, e, undo_stack, ctxt) {
    let tool = KnotDiagramView.tool_state.tool;
    if (tool === "crossing-change") {
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
  },
  mouseup: function (pt, e, undo_stack, ctxt) {
    let tool = KnotDiagramView.tool_state.tool;
  },
  toolbox: function (undo_stack) {
    let $div = this.$div = Q.div();

    /* Modification tools */
    Q.create("h2").append("Modification tools").appendTo($div);
    let $tools = Q.div().appendTo($div);

    let $crossing_change = Q.span("\u292B")
        .addClass("icon-button")
        .prop("data-tool", "crossing-change")
        .prop("title", "Change crossing type")
        .appendTo($tools);

    let $toggle_orientation = Q.span("\u21C4")
        .addClass("icon-button")
        .prop("data-tool", "toggle-orientation")
        .prop("title", "Toggle component orientation")
        .appendTo($tools);

    let $eraser = Q.span("\u2717")
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
      let $bs = Q.span(" ").addClass("icon-color")
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
    this.update_tool(KnotDiagramView.tool_state.tool);

    $tools.on("click", e => {
      let el = e.target.closest('.icon-button');
      if (el) {
        let tool = Q(el).prop('data-tool');
        if (typeof tool === "string") {
          e.preventDefault();
          e.stopPropagation();
          KnotDiagramView.tool_state.tool = tool;
          this.update_tool(tool);
        }
      }
    });

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
      this.paint(ctxt, false);
      let view = new KnotRasterView(this.width, this.height);
      view.fromImage(ctxt.getImageData(0, 0, this.width, this.height));
      undo_stack.push(view);
    });

    $div.append(Q.create("h2").append("Isotopy tools"));

    let $simplify = Q.create("input")
        .prop("type", "button")
        .value("Simplify")
        .prop("title", "Use an energy minimization procedure to simplify the diagram")
        .appendTo($div);
    $simplify.on("click", e => {
      let view = this.copy();
      //view.simplify();
      undo_stack.push(view);
    });


    $div.append(Q.create("hr"));

    $div.append(Q.create("h2").append("Diagram information"));

    let $idiv = Q.create("div").prop("id", "diag-info").appendTo($div);
    {
      // Number of crossings
      $idiv.append(Q.create("p")
                  .append("Crossing number: ")
                  .append(''+this.diagram.crossing_number()));

      Q.create("p").append("Writhe: " + this.diagram.writhe()).appendTo($idiv);

      let $lm = Q.create("p").append("Linking matrix: ").appendTo($idiv);
      $lm.append(Q.create("br"));
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

    $div.append(Q.create("p")
                .append("PD:")
                .append(Q.create("br"))
                .append(Q.create("textarea")
                        .attr("readonly", true)
                        .addClass("code-data")
                        .append("PD[" + this.diagram.get_pd().join(", ") + "]")));
    $div.append(Q.create("p")
                .append("Oriented PD:")
                .append(Q.create("br"))
                .append(Q.create("textarea")
                        .attr("readonly", true)
                        .addClass("code-data")
                        .append("PD[" + this.diagram.get_pd(true).join(", ") + "]")));

    $div.append(Q.create("p")
                .append("Kauffman bracket:")
                .append(Q.create("div")
                        .append(kauffman_bracket(this.diagram.get_pd()).toPolyString("A"))));
    
    return $div;
  },

  paint: function (ctxt, with_arrows=true) {
    ctxt.save();
    ctxt.fillStyle = "white";
    ctxt.fillRect(0, 0, this.width, this.height);

    let diag = this.diagram;

    let seen_darts = new Set;

    let visit_dart = (dart) => {
      if (seen_darts.has(dart)) return;

      // locate beginning of path
      function opp_is_under(d) {
        /* Is the  opposite of the dart an under-dart? */
        d = diag.opp_dart(d);
        return diag.dart_order(d) === 4 && !diag.dart_is_over(d);
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
        let to_remove = 6;
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
        to_remove = 6;
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
      ctxt.moveTo(path[0].x+0.5, path[0].y+0.5);
      for (let i = 1; i < path.length; i++) {
        let v = path[i];
        ctxt.lineTo(v.x+0.5, v.y+0.5);
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
            return p.x + dx*x - dy*y + 0.5;
          }
          function f_y(x, y) {
            return p.y + dy*x + dx*y + 0.5;
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

    ctxt.restore();
  }
});

Q(function () {
  var undo_stack = new UndoStack();

  undo_stack.listeners.push(undo_stack => {
    Q(".undo-state").empty().append(`${undo_stack.i + 1}/${undo_stack.length}`);
    Q("input.undo").prop("disabled", undo_stack.i <= 0);
    Q("input.redo").prop("disabled", undo_stack.i + 1 >= undo_stack.length);    
  });
  Q("input.undo").on("click", () => {
    undo_stack.undo();
  });
  Q("input.redo").on("click", () => {
    undo_stack.redo();
  });

  var canvas = Q.create("canvas").appendTo(Q("#editor"));
  canvas.prop("width", WIDTH);
  canvas.prop("height", HEIGHT);

  var ctxt = canvas[0].getContext('2d');
  undo_stack.listeners.push(undo_stack => {
    Q(".modename").empty().append(undo_stack.get().mode_name);
    undo_stack.get().paint(ctxt);

    let $tools = Q("#tools").empty();
    $tools.append(undo_stack.get().toolbox(undo_stack));
  });

  undo_stack.push(new KnotRasterView(WIDTH, HEIGHT));

  function mousePos(e) {
    let rect = canvas[0].getBoundingClientRect();
    return new Point(e.clientX - rect.left-1, e.clientY - rect.top-1);
  }

  var color = null;
  var mouseHandler = null;

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
});
