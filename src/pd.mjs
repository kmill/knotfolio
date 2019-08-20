// Planar diagrams
//
// http://www.katlas.org/wiki/Planar_Diagrams
// https://snappy.math.uic.edu/spherogram.html
// https://bitbucket.org/t3m/spherogram/raw/tip/spherogram_src/links/doc.pdf

import {assert, SimpleType} from "./util.mjs";

export class PD extends SimpleType {
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

export class X extends SimpleType {
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

export class P extends SimpleType {
  static make(a, b) {
    /* Represents a path between edge ids a and b. */
    assert(arguments.length === 2);
    return super.make(a, b);
  }
  toMathematica() {
    return "P[" + this.join(",") + "]";
  }
}

export class Xp extends X {
  /* Represents a right-handed oriented crossing like
       
       c ^ ^ b
          /
       d / \ a

     where a, b, c, and d are edge ids. */

  toMathematica() {
    return "Xp[" + this.join(",") + "]";
  }
}

export class Xm extends X {
  /* Represents a left-handed oriented crossing like
       
       d ^ ^ c
          \
       a / \ b

     where a, b, c, and d are edge ids. */

  toMathematica() {
    return "Xm[" + this.join(",") + "]";
  }
}
