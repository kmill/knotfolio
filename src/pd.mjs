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

export function pd_eliminate_paths(diagram) {
  /* Takes a PD diagram, returns {unknots: int, diagram: PD}, where
  the resulting diagram has no P entities anymore. */
  assert(diagram instanceof PD);

  let n_unknots = 0;
  diagram = diagram.map(entity => entity.slice());
  for (let i = 0; i < diagram.length;) {
    let entity = diagram[i];
    if (entity.constructor === P) {
      if (entity[0] === entity[1]) {
        n_unknots++;
      } else {
        for (let j = 0; j < diagram.length; j++) {
          diagram[j] = diagram[j].map(arc => arc === entity[1] ? entity[0] : arc);
        }
      }
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

export function pd_first_free_id(diagram) {
  assert(diagram instanceof PD);
  let free_id = 1;
  diagram.forEach(entity => {
    entity.forEach(i => {
      free_id = Math.max(free_id, i + 1);
    });
  });
  return free_id;
}

export function pd_writhe_normalize(diagram) {
  /* Given an oriented PD, returns a zero-writhe PD. */
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

export function pd_form_cabling(diagram, cables) {
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

export function pd_renumber(pd) {
  assert(pd instanceof PD);

  let remap = new Map();
  let free_id = 0;
  function get(i) {
    if (remap.has(i)) {
      return remap.get(i);
    } else {
      let j = free_id++;
      remap.set(i, j);
      return j;
    }
  }
  
  return pd.map(entity => entity.map(get));
}
