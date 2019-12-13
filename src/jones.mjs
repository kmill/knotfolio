// Jones polynomial

import {assert, remove_value} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {PD, P, X, Xp, Xm} from "./pd.mjs";
import {KnotGraph} from "./knotgraph.mjs";
import {TL, TLTerm, TLPath} from "./tl.mjs";
import {get_invariant, define_invariant} from "./invariants.mjs";

define_invariant("kauffman_bracket", async function (mt, pd) {
  if (!(pd instanceof PD)) {
    return await get_invariant("kauffman_bracket", pd.get_pd());
  }

  if (pd.length === 0) {
    return null;
  }
  pd = pd.slice();

  let frontier = [];
  let bracket = TL.unit;
  while (pd.length > 0) {
    await mt.next_turn();

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
      let [a, b] = entity;
      tl = new TL(new TLTerm(Laurent.unit, [new TLPath(a, b)]));
    } else {
      let [a, b, c, d] = entity;
      tl = new TL(new TLTerm(Laurent.t, [new TLPath(a, b),
                                         new TLPath(c, d)]),
                  new TLTerm(Laurent.tinv, [new TLPath(a, d),
                                            new TLPath(b, c)]));
    }
    bracket = bracket.mul(tl);

    // update frontier
    entity.forEach(i => {
      if (!remove_value(frontier, i)) {
        frontier.push(i);
      }
    });
  }
  assert(bracket.length <= 1);
  if (bracket.length === 0) {
    return Laurent.zero;
  } else {
    assert(bracket[0].paths.length === 0);
    return bracket[0].coeff.div_by_loop();
  }
});

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
  // The following polynomial is in T=t^2.
  let jp = new Laurent();
  for (let i = normalized_kb.length - 1; i >= 0; i--) {
    let term = normalized_kb[i];
    let new_exp = -term.exp/2;
    assert(new_exp === Math.floor(new_exp));
    jp.push(new LTerm(term.coeff, new_exp));
  }
  return jp;

});


define_invariant("cabled_jones_poly", async function (mt, diagram, cables) {
  /* Computes the cabeled Jones polynomial from a KnotGraph (or an oriented
     PD). Returns a polynomial in T=t^2, or null for the empty diagram. */

  if (diagram instanceof KnotGraph) {
    diagram = diagram.get_pd(true);
  }
  assert(diagram instanceof PD);

  // Remove all P entities
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

  console.log(diagram.toString());

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

  let free_id = 1;
  diagram.forEach(entity => {
    entity.forEach(i => {
      free_id = Math.max(free_id, i + 1);
    });
  });

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
  new_entities.forEach(entity => {
    diagram.push(entity);
  });

  console.log(diagram.toString());

  // form cabling
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
        cabled.push(X.make(a, b, c, d));
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

  console.log(cabled.toString());
  diagram = cabled;

  let kb = await get_invariant('kauffman_bracket', diagram);
  if (kb === null) {
    return null;
  }

  // The following polynomial is in T=t^2.
  let jp = new Laurent();
  for (let i = kb.length - 1; i >= 0; i--) {
    let term = kb[i];
    let new_exp = -term.exp/2;
    assert(new_exp === Math.floor(new_exp));
    jp.push(new LTerm(term.coeff, new_exp));
  }
  return jp;

});
