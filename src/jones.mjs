// Jones polynomial

import {assert, remove_value} from "./util.mjs";
import {Laurent} from "./laurent.mjs";
import {PD, X, Xp, Xm} from "./pd.mjs";
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
  let jp = Laurent.zero;
  for (let i = normalized_kb._coeffs.length - 1; i >= 0; i--) {
    let coeff = normalized_kb._coeffs[i];
    if (coeff !== 0) {
      let new_exp = -(normalized_kb._offset + i)/2;
      assert(new_exp === (0|new_exp));
      jp = jp.add(Laurent.fromCoeffs([coeff], new_exp));
    }
  }
  return jp;

});
