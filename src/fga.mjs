// Free group algebra

import {assert, SimpleType, compare} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";

export class FGWord extends SimpleType {
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

export class FGA extends SimpleType {
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
    let p = Laurent.make();
    this.forEach(term => {
      let exp = 0;
      for (let i = 0; i < term[1].length; i += 2) {
        exp += term[1][i+1];
      }
      p.push(LTerm.make(term[0], exp));
    });
    return p.normalize();
  }
}
FGA.zero = FGA.make();
FGA.unit = FGA.make([1,FGWord.make()]);
