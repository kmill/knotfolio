// Jones polynomial

import {assert, remove_value} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {PD, P, X, Xp, Xm, pd_eliminate_paths, pd_writhe_normalize, pd_first_free_id} from "./pd.mjs";
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

  let eliminated = pd_eliminate_paths(diagram);
  let n_unknots = eliminated.unknots;
  diagram = eliminated.diagram;

  console.log(diagram.toString());

  diagram = pd_writhe_normalize(diagram);

  console.log(diagram.toString());

  let free_id = pd_first_free_id(diagram);

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
