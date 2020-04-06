// Jones polynomial

import {assert, remove_value} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {PD, P, X, Xp, Xm, pd_eliminate_paths, pd_writhe_normalize, pd_first_free_id, pd_form_cabling, pd_renumber} from "./pd.mjs";
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

function len_intersection(slist1, slist2) {
  // sorted lists
  let i1 = 0, i2 = 0;
  let len = 0;
  while (i1 < slist1.length && i2 < slist2.length) {
    if (slist1[i1] === slist2[i2]) {
      len++;
      i1++;
      i2++;
    } else if (slist1[i1] < slist2[i2]) {
      i1++;
    } else {
      i2++;
    }
  }
  return len;
}
function merge_frontiers(front1, front2) {
  let i1 = 0, i2 = 0;
  let merged = [];
  while (i1 < front1.length && i2 < front2.length) {
    if (front1[i1] === front2[i2]) {
      i1++;
      i2++;
    } else if (front1[i1] < front2[i2]) {
      merged.push(front1[i1++]);
    } else {
      merged.push(front2[i2++]);
    }
  }
  while (i1 < front1.length) {
    merged.push(front1[i1++]);
  }
  while (i2 < front2.length) {
    merged.push(front2[i2++]);
  }
  return merged;
}


function plan_tl_mul(pd) {
  /* A more-advanced planner for the multiplication.  Returns a tree for the multiplication plan:
     tree = ["mul", tree, tree] | ["entity", entity]
  */

  assert(pd.length > 0);
  if (pd.length === 1) {
    return ["entity", pd[0]];
  }

  function mk_plan(s1, s2) {
    // uses s1 and s2 as indices into pd as 'nucleation sites'
    let ppd = pd.slice();
    let s = [s1, s2],
        frontier = [[], []],
        sorted = [null, null];
    s.sort((i,j) => j-i);
    s.forEach((k,j) => {
      let e = ppd[k];
      sorted[j] = ["entity", e];
      ppd.splice(k,1);
      e.forEach(i => {
        if (!remove_value(frontier[j], i)) {
          frontier[j].push(i);
        }
      });
    });
    while (ppd.length > 0) {
      let best_nfrontier = Infinity,
          best_eid = null,
          best_j = null;
      for (let j = 0; j < 2; j++) {
        ppd.forEach((entity, eid) => {
          let nfrontier = frontier[j].length + entity.length;
          entity.forEach(i => {
            if (frontier[j].indexOf(i) !== -1) {
              nfrontier -= 2;
            }
          });
          if (nfrontier < best_nfrontier) {
            best_nfrontier = nfrontier;
            best_eid = eid;
            best_j = j;
          }
        });
      }
      let entity = ppd[best_eid];
      ppd.splice(best_eid, 1);
      sorted[best_j] = ["mul", sorted[best_j], ["entity", entity]];
      entity.forEach(i => {
        if (!remove_value(frontier[best_j], i)) {
          frontier.push(i);
        }
      });
    }
    return ["mul", sorted[0], sorted[1]];
  }

  let costs = [];
  {
    let c = 1;
    for (let i = 2; i < 50; i += 2) {
      c *= i - 1;
      costs[i] = i*c;
    }
  }
  function get_cost(len) {
    len = ((0|len)>>1)<<1;
    if (len > costs.length) {
      len = costs.length;
    }
    return costs[len];
  }

  function estimate_plan_cost(plan) {
    if (plan[0] === "mul") {
      let c1 = estimate_plan_cost(plan[1]),
          c2 = estimate_plan_cost(plan[2]);
      return [merge_frontiers(c1[0], c2[0]),
              get_cost(c1[0].length) * get_cost(c2[0].length) + c1[1] + c2[1]];
    } else if (plan[0] === "entity") {
      let entity = plan[1];
      let frontier = [];
      entity.forEach(i => frontier.push(i));
      frontier.sort((i, j) => i - j);
      for (let i = 0; i + 1 < frontier.length;) {
        if (frontier[i] === frontier[i+1]) {
          frontier.splice(i, 2);
        } else {
          i++;
        }
      }
      return [frontier, frontier.length === 2 ? 1 : 2];
    } else return assert(false);
  }

  let best_plan = null,
      best_plan_cost = Infinity;
  for (let i = 0; i + 1 < pd.length; i++) {
    for (let j = i + 1; j < pd.length; j++) {
      let plan = mk_plan(i, j);
      let cost = estimate_plan_cost(plan)[1];
      if (cost < best_plan_cost) {
        best_plan = plan;
        best_plan_cost = cost;
      }
    }
  }
  console.log("best cost = " + best_plan_cost);
  console.log(best_plan);
  return best_plan;

  let entities = []; // a list of [frontier, tree] pairs
  pd.forEach(entity => {
    let frontier = [];
    entity.forEach(i => frontier.push(i));
    frontier.sort((i, j) => i - j);
    for (let i = 0; i + 1 < frontier.length;) {
      if (frontier[i] === frontier[i+1]) {
        frontier.splice(i, 2);
      } else {
        i++;
      }
    }
    entities.push([frontier, ["entity", entity]]);
  });



  while (entities.length > 1) {
    let best_i = 0, best_j = 1, best_cost = Infinity;
    for (let i = 0; i + 1 < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        let cost = 0;
        for (let k = 0; k < entities.length; k++) {
          if (k !== i && k !== j) {
            cost += get_cost(entities[k][0].length);
          }
        }
        let ifront = entities[i][0],
            jfront = entities[j][0];
        cost += get_cost(ifront.length + jfront.length - 2 * len_intersection(ifront, jfront));
        if (cost < best_cost) {
          best_i = i;
          best_j = j;
          best_cost = cost;
        }
      }
    }

    let ient = entities[best_i],
        jent = entities[best_j];
    entities.splice(best_j, 1);
    entities.splice(best_i, 1);
    entities.push([merge_frontiers(ient[0], jent[0]),
                   ["mul", ient[1], jent[1]]]);
  }
  assert(entities.length === 1);
  return entities[0][1];
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

  let cdiagram = pd_form_cabling(diagram, cables);

  let program = [];
  function mk_prog(plan) {
    if (plan[0] === "mul") {
      mk_prog(plan[1]);
      mk_prog(plan[2]);
      program.push("mul");
    } else if (plan[0] === "entity") {
      program.push(plan[1]);
    } else {
      assert(false);
    }
  }
  mk_prog(plan_tl_mul(cdiagram));
  // sort_pd_heuristic(cdiagram).forEach(ent => {
  //   program.push(ent, "mul");
  // });
  console.log("program: " + program);

  let stack = [];
  //stack.push(TL.unit);
  for (let i = 0; i < program.length; i++) {
    //await mt.next_turn();
    if (program[i] === "mul") {
      let e2 = stack.pop();
      let e1 = stack.pop();
      stack.push(e1.mul(e2));
    } else if (program[i].length === 2) {
      let [a, b] = program[i];
      stack.push(TL.make(TLTerm.make(Laurent.unit, [TLPath.make(a, b)])));
    } else if (program[i].length === 4) {
      let [a, b, c, d] = program[i];
      stack.push(mk_tl_X(a, b, c, d));
    } else assert(false);
  }
  assert(stack.length === 1);
  let bracket = stack.pop().normalize();

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


define_invariant("cabled_jones_poly_statesum", async function (mt, diagram, cables) {
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

  let loop_polys = [Laurent.unit, TL.loop];
  function get_loop(loops) {
    while (loop_polys.length <= loops) {
      let last = loop_polys[loop_polys.length - 1];
      loop_polys.push(last.mul(loop_polys[1]));
    }
    return loop_polys[loops];
  }

  let eliminate = pd_eliminate_paths(diagram);
  let unknots = eliminate.unknots;
  let cdiagram = sort_pd_heuristic(pd_renumber(pd_form_cabling(eliminate.diagram, cables)));
  let nentities = cdiagram.length;

  let comps = []; // union-find structure for edge ids
  cdiagram.forEach(entity => entity.forEach(i => comps[i] = i));
  function lookup_comp(i) {
    while (i !== comps[i]) {
      i = comps[i];
    }
    return i;
  }
  //console.log(cdiagram.toString());
  let ncomps = comps.length;
  function join(i, j) {
    //console.log("join(%s, %s)", i, j);
    if (i !== j) {
      ncomps--;
      comps[i] = j;
    }
    //console.log("   now ncomps = %s", ncomps);
  }
  let offset = 0;
  let poly = Laurent.zero;
  function visit(eid) {
    if (eid < nentities) {
      let entity = cdiagram[eid];
      let acomp = lookup_comp(entity[0]),
          bcomp = lookup_comp(entity[1]),
          ccomp = lookup_comp(entity[2]),
          dcomp = lookup_comp(entity[3]);
      let old_ncomps = ncomps;

      // A state
      //console.log("A");
      offset += 1;
      join(acomp, bcomp);
      let ccomp2 = lookup_comp(ccomp);
      join(ccomp2, lookup_comp(dcomp));
      visit(eid + 1);
      comps[ccomp2] = ccomp2;

      // B state
      //console.log("B");
      ncomps = old_ncomps;
      offset -= 2;
      join(acomp, dcomp);
      ccomp2 = lookup_comp(ccomp);
      join(ccomp2, lookup_comp(bcomp));
      visit(eid + 1);
      comps[ccomp2] = ccomp;

      // Restore state
      //console.log("restore");
      offset += 1;
      ncomps = old_ncomps;
      comps[acomp] = acomp;
    } else {
      let nloops = ncomps + unknots;
      //console.log("state has offset %s and %s loops", offset, nloops);
      poly = poly.add(get_loop(nloops - 1), 1, offset);
    }
  }
  visit(0);
  //console.log("%s %s", ncomps, offset);

  // The following polynomial is in T=t^2.
  let jp = new Laurent();
  for (let i = poly.length - 1; i >= 0; i--) {
    let term = poly[i];
    let new_exp = -term.exp/2;
    assert(new_exp === Math.floor(new_exp));
    jp.push(new LTerm(term.coeff, new_exp));
  }
  return jp;
});
