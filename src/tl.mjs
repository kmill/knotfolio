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
    this.normalized = false;
  }
  static make(coeff, paths) {
    return new this(coeff, paths);
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
    if (this.normalized) {
      return this;
    }
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

    this.normalized = true;
    return this;
  }
}

export class TL extends SimpleType {
  // A list of TLTerms
  copy() {
    return this.slice(); // ok since normalization keeps the term "the same"
  }
  normalize() {
    /* In-place normalization of the TL. */
    this.forEach(term => term.normalize());
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
      if (sum.length === 0) {
        this.splice(i, j-i);
      } else {
        term = TLTerm.make(sum, term.paths);
        term.normalized = true;
        this[i] = term;
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
    return this.concat(tl2).normalize();
  }

  mul(tl2) {
    assert(tl2 instanceof TL);
    let tl = TL.make();
    this.forEach(term1 => {
      tl2.forEach(term2 => {
        tl.push(TLTerm.make(term1.coeff.mul(term2.coeff),
                            term1.paths.concat(term2.paths)));
      });
    });
    return tl.normalize();
  }
}
TL.unit = TL.make(TLTerm.make(Laurent.unit, [])).normalize();
TL.loop = Laurent.fromCoeffs([-1,0,0,0,-1], -2).normalize();
