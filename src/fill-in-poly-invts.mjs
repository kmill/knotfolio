import {assert, assert_fails, test, test_async, equal, toString} from "./util.mjs";
import {PD,X,P,Xp,Xm} from "./pd.mjs";
import {Laurent} from "./laurent.mjs";
import {get_invariant} from "./invariants.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import * as knotinfo from "./greenj.mjs";

import * as fs from "fs";

export async function compute() {
  for (let knotid = 0; knotid < knotinfo.data.length; knotid++) {
    let knot = knotinfo.data[knotid];
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

    let jones = [];
    for (let i = 1; i <= 2; i++) {
      let poly = await get_invariant("cabled_jones_poly", pd, i);
      jones.push(poly ? [poly.minexp()].concat(poly.coeffs()) : [0]);
    }
    knot.jones = jones;

    let alex = (await get_invariant('alexander_poly', pd)).coeffs();
    knot.alex = alex;
  }

  fs.writeFileSync("greenj-filled.json", JSON.stringify(knotinfo.data));
  console.log("done");
}

test_async("compute", compute);
