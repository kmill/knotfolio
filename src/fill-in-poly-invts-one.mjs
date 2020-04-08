import {assert, assert_fails, test, test_async, equal, toString} from "./util.mjs";
import {PD,X,P,Xp,Xm} from "./pd.mjs";
import {Laurent} from "./laurent.mjs";
import {get_invariant} from "./invariants.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import * as knotinfo from "./greenj-filled.mjs";

import * as fs from "fs";

export async function compute(name) {
  for (let knotid = 0; knotid < knotinfo.data.length; knotid++) {
    let knot = knotinfo.data[knotid];
    if (knot.name !== name) {
      continue;
    }
    console.log(knot.name);
    let pd = PD.make();
    knot.pd.forEach(entity => {
      if (entity.length === 2) {
        pd.push(P.make(...entity));
      } else if (entity.length === 4) {
        // in the KnotInfo/LinkInfo database, each entity is secretly
        // Xp or Xm, and the indices for (_,b,_,c) determine the
        // orientation
        let [a,b,c,d] = entity;
        let fwdd = (b-d) === 1 || (b-d) < -1;
        if (fwdd) {
          pd.push(Xp.make(a,b,c,d));
        } else {
          pd.push(Xm.make(a,b,c,d));
        }
      } else {
        throw new Error("bad pd");
      }
    });

    let jones = knot.jones || [];
    let cables = 3;
    if (pd.length <= 4) cables = 3;
    for (let i = jones.length + 1; i <= cables; i++) {
      let poly = await get_invariant("cabled_jones_poly", pd, i);
      jones.push(poly ? [poly.minexp()].concat(poly.coeffs()) : [0]);
    }
    knot.jones = jones;

    if (!knot.alex) {
      knot.alex = (await get_invariant('alexander_poly', pd)).coeffs();
    }

    fs.writeFileSync("knot-data/" + name + ".json", JSON.stringify(knot));
    console.log("done");

    return;
  }
  throw new Error("No such knot " + name);

}

let name = process.argv[2];
test_async("compute", async function () {
  await compute(name);
});
