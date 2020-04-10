// Arrow polynomial (Dye--Kauffman, Miyazawa)
// See arrow.nb

import {assert, remove_value} from "./util.mjs";
import {MLaurent} from "./mlaurent.mjs";
import {PD, P, X, Xp, Xm, pd_eliminate_paths, pd_writhe_normalize, pd_first_free_id, pd_form_cabling, pd_renumber} from "./pd.mjs";
import {KnotGraph} from "./knotgraph.mjs";
import {ATL, ATerm, ADir} from "./atl.mjs";
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

define_invariant("arrow_bracket", async function (mt, pd) {
  if (!(pd instanceof PD)) {
    return await get_invariant("arrow_bracket", pd.get_pd(true));
  }

  if (pd.length === 0) {
    return null;
  }

  // Break open the link to form a 1-1 tangle.
  pd = pd_renumber(pd); // does a deep copy, and ensures free_id-1 is the max edge id
  let free_id = pd_first_free_id(pd);
  detach_loop:
  for (let i = 0; i < pd.length; i++) {
    let entity = pd[i];
    for (let j = 0; j < entity.length; j++) {
      if (entity[j] === free_id-1) {
        entity[j] = free_id;
        break detach_loop;
      }
    }
  }

  pd = sort_pd_heuristic(pd);
  console.log("plan " + pd);

  let bracket = ATL.unit;

  for (let i = 0; i < pd.length; i++) {
    if (i % 5 === 0) await mt.next_turn();
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
    } else if (entity instanceof Xm) {
      let [a, b, c, d] = entity;
      atl = ATL.make(ATerm.make(MLaurent.x(0,-1), [ADir.make( 0, b, c),
                                                   ADir.make( 0, d, a)]),
                     ATerm.make(MLaurent.x(0, 1), [ADir.make(-1, b, a),
                                                   ADir.make( 1, d, c)]));
    } else {
      assert(false);
      throw new Error("Unexpected entity type");
    }
    console.log("bracket = " + bracket);
    console.log("atl = " + atl);
    bracket = bracket.mul(atl);
  }

  console.log("bracket " + bracket);

  let result = MLaurent.zero;
  bracket.forEach(term => {
    assert(term.paths.length === 1);
    let path = term.paths[0];
    assert(path.a === free_id-1);
    assert(path.b === free_id);
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
