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
      tl = mk_tl_X(entity[0], entity[1], entity[2], entity[3]);
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


function mk_tl_X(a,b,c,d) {
  return TL.make(TLTerm.make(Laurent.t, [TLPath.make(a, b),
                                         TLPath.make(c, d)]),
                 TLTerm.make(Laurent.tinv, [TLPath.make(a, d),
                                            TLPath.make(b, c)]));
}


let cabled_prototypes = {p: [], m: []};

function mk_prototype_cabled_X(type, n) {
  // For an oriented bundle of strands, pointing up, they are numbered sequentially from left to right.  type is "p" or "m" for Xp or Xm

  if (cabled_prototypes[type][n]) {
    return cabled_prototypes[type][n];
  }

  let free_id = 4*n+1;

  let bracket = TL.unit;

  let idxs = [];
  for (let i = 0; i < n; i++) {
    idxs.push(i+1);
  }
  for (let j = 0; j < n; j++) {
    let d = type === "p" ? 4*n-j : 3*n+1+j;
    let idxs2 = [];
    for (let i = 0; i < n; i++) {
      let a = idxs[i];
      let b = i < n - 1 ? free_id++ : type === "p" ? 2*n-j : n+j+1;
      let c = j === n - 1 ? 2*n+i+1 : free_id++;

      bracket = bracket.mul(mk_tl_X(a, b, c, d));

      d = b;
      idxs2.push(c);
    }
    idxs = idxs2;
  }

  cabled_prototypes[type][n] = bracket;
  return bracket;
}

function mk_cabled_X(type, n, a, b, c, d) {
  let prototype = mk_prototype_cabled_X(type, n);

  function remap(i) {
    let s = Math.floor((i-1)/n);
    let o = (i-1)%n;
    let j = 0;
    switch (s) {
    case 0: j = a; break;
    case 1: j = b; break;
    case 2: j = c; break;
    case 3: j = d; break;
    }
    return n*(j-1) + o + 1;
  }

  let bracket = prototype.map(term => {
    return TLTerm.make(term.coeff,
                       term.paths.map(path => TLPath.make(remap(path[0]), remap(path[1]))));
  });
  return bracket;
}

define_invariant("cabled_jones_poly", async function (mt, diagram, cables) {
  /* Computes the cabeled Jones polynomial from a KnotGraph (or an oriented
     PD). Returns a polynomial in T=t^2, or null for the empty diagram. */
  assert(cables > 0);
  if (diagram instanceof KnotGraph) {
    diagram = diagram.get_pd(true);
  }
  assert(diagram instanceof PD);

  if (diagram.length === 0) {
    return null;
  }

  diagram = pd_writhe_normalize(diagram);
  let eliminated = pd_eliminate_paths(diagram);
  diagram = eliminated.diagram;
  let n_unknots = eliminated.unknots;

  diagram = sort_pd_heuristic(diagram);

  let bracket = TL.unit;
  for (let i = 0; i < diagram.length; i++) {
    await mt.next_turn();
    let entity = diagram[i];
    let br = mk_cabled_X(entity.constructor === Xp ? "p" : "m", cables, entity[0], entity[1], entity[2], entity[3]);
    bracket = bracket.mul(br);
  }

  for (let i = 0; i < n_unknots * cables; i++) {
    bracket = bracket.mul(TL.make(TLTerm.make(Laurent.unit, [TLPath.make(1,1)])));
  }

  if (bracket.length === 0) {
    return Laurent.zero;
  } else {
    assert(bracket[0].paths.length === 0);
    let kb = bracket[0].coeff.div_by_loop();
    // The following polynomial is in T=t^2.
    let jp = new Laurent();
    for (let i = kb.length - 1; i >= 0; i--) {
      let term = kb[i];
      let new_exp = -term.exp/2;
      assert(new_exp === Math.floor(new_exp));
      jp.push(new LTerm(term.coeff, new_exp));
    }
    return jp;
  }
});
