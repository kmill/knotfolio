// Jones polynomial

import {assert, remove_value} from "./util.mjs";
import {Laurent} from "./laurent.mjs";
import {PD, X, P, Virtual, Xp, Xm, pd_eliminate_paths, pd_writhe_normalize, pd_first_free_id, pd_form_cabling, pd_to_tangle} from "./pd.mjs";
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

  pd = sort_pd_heuristic(tangle.pd);

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
