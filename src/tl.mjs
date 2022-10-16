// The Temperley--Lieb category

import {assert, SimpleType, equal, compare, toString} from "./util.mjs";
import {Laurent} from "./laurent.mjs";

export class TLPath {
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

export class TLTerm {
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
    return "TLTerm.make(" + this.coeff + ", " + toString(this.paths) + ")";
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

export class TL extends SimpleType {
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
