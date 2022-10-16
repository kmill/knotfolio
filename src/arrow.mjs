// Arrow polynomial (Dye--Kauffman, Miyazawa)
// See arrow.nb

import {assert, remove_value} from "./util.mjs";
import {MLaurent} from "./mlaurent.mjs";
import {PD, P, X, Xp, Xm, pd_eliminate_paths, pd_writhe_normalize, pd_first_free_id, pd_form_cabling, pd_renumber, pd_to_tangle} from "./pd.mjs";
import {KnotGraph} from "./knotgraph.mjs";
import {ATL, ATerm, ADir} from "./atl.mjs";
import {get_invariant, define_invariant} from "./invariants.mjs";

function sort_pd_heuristic(pd, boundary=null) {
  /* Sorts the entities in the PD so that each entity is chosen to minimize the next frontier. */
  assert(pd instanceof PD);
  pd = pd.slice();
  //console.log("pre-sorted:", toString(pd));

  let frontier = boundary ? boundary.slice() : [];
  let sorted = [];

  while (pd.length > 0) {
    // find "best" next entity, using the least-new-frontier heuristic
    //console.log("frontier:", toString(frontier));
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
    //console.log("best:", toString(entity));

    // update frontier
    entity.forEach(i => {
      if (!remove_value(frontier, i)) {
        frontier.push(i);
      }
    });
  }
  //console.log("sorted:", toString(sorted));
  return sorted;
}

define_invariant("arrow_bracket", async function (mt, pd) {
  if (!(pd instanceof PD)) {
    return await get_invariant("arrow_bracket", pd.get_pd(true));
  }

  let tangle = pd_to_tangle(pd);

  if (tangle === null) {
    return null;
  }

  pd = sort_pd_heuristic(tangle.pd, [tangle.boundary[0]]);

  let bracket = ATL.unit;

  for (let i = 0; i < pd.length; i++) {
    if (i % 2 === 0) await mt.next_turn();
    let entity = pd[i];
    let atl = null;
    if (entity instanceof P) {
      let [a, b] = entity;
      atl = ATL.make(ATerm.make(MLaurent.unit, [ADir.make(0, a, b)]));
    } else if (entity instanceof Xp) {
      let [a, b, c, d] = entity;
      atl = ATL.make(ATerm.make(MLaurent.x(0, 1), [ADir.make( 0, a, b),
                                                   ADir.make( 0, c, d)]),
                     ATerm.make(MLaurent.x(0,-1), [ADir.make(-1, a, d),
                                                   ADir.make( 1, c, b)]));
      atl = atl.normalize();
    } else if (entity instanceof Xm) {
      let [a, b, c, d] = entity;
      atl = ATL.make(ATerm.make(MLaurent.x(0,-1), [ADir.make( 0, b, c),
                                                   ADir.make( 0, d, a)]),
                     ATerm.make(MLaurent.x(0, 1), [ADir.make(-1, b, a),
                                                   ADir.make( 1, d, c)]));
      atl = atl.normalize();
    } else {
      assert(false);
      throw new Error("Unexpected entity type");
    }
    bracket = bracket.mul(atl);
  }

  let result = MLaurent.zero;
  bracket.forEach(term => {
    assert(term.paths.length === 1);
    let path = term.paths[0];
    assert(path.a === Math.min(...tangle.boundary));
    assert(path.b === Math.max(...tangle.boundary));
    let poly = term.coeff;
    // multiply in last bit of weight from this last path
    if (path.n !== 0) {
      poly = poly.mul(MLaurent.x(Math.abs(path.n)/2));
    }
    result = result.add(poly);
  });
  return result;
});

define_invariant("cabled_arrow_poly", async function (mt, diagram, cables) {
  /* Computes the writhe-normalized arrow polynomial.  To get a "jones" polynomial, set A=T^-4. */
  assert(cables > 0);
  if (diagram instanceof KnotGraph) {
    diagram = diagram.get_pd(true);
  }
  assert(diagram instanceof PD);

  if (diagram.length === 0) {
    return null;
  }

  let ab = await get_invariant("arrow_bracket", pd_form_cabling(diagram, cables));
  if (ab === null) {
    return null;
  }
  return ab;
});
