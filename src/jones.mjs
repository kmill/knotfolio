// Jones polynomial

import {assert, remove_value} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {PD, P, X, Xp, Xm, pd_eliminate_paths, pd_writhe_normalize, pd_first_free_id, pd_form_cabling} from "./pd.mjs";
import {KnotGraph} from "./knotgraph.mjs";
import {TL, TLTerm, TLPath} from "./tl.mjs";
import {get_invariant, define_invariant} from "./invariants.mjs";

function sort_pd_heuristic(pd) {
  /* Sorts the entities in the PD so that each entity is chosen to minimize the next frontier. */
  assert(pd instanceof PD);
  pd = pd.slice();

  let frontier = [];
  let sorted = [];

  while (pd.length > 0) {
    // find "best" next entity, using the least-new-frontier heuristic
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

    // update frontier
    entity.forEach(i => {
      if (!remove_value(frontier, i)) {
        frontier.push(i);
      }
    });
  }
  return sorted;
}

define_invariant("kauffman_bracket", async function (mt, pd) {
  if (!(pd instanceof PD)) {
    return await get_invariant("kauffman_bracket", pd.get_pd());
  }

  if (pd.length === 0) {
    return null;
  }
  pd = sort_pd_heuristic(pd);

  let bracket = TL.unit;

  for (let i = 0; i < pd.length; i++) {
    await mt.next_turn();
    let entity = pd[i];
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

  let cabled = pd_form_cabling(diagram, cables);

  let kb = await get_invariant('kauffman_bracket', cabled);
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
