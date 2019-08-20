import {get_invariant, define_invariant} from "./invariants.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import {assert, equal} from "./util.mjs";
import * as knotinfo from "./knotinfo.mjs";

define_invariant("identify_link", async function (mt, diagram) {
  let max_crossing = diagram.crossing_number();
  let alex_poly = (await get_invariant('alexander_poly', diagram)).coeffs();
  let jones_poly = await get_invariant('jones_poly', diagram);
  let jones_coeffs = jones_poly ? [jones_poly.minexp()].concat(jones_poly.coeffs()) : [0];
  let jones_coeffs_rev = [-jones_coeffs.length + 2 - jones_coeffs[0]].concat(jones_coeffs.slice(1).reverse());

  let options = knotinfo.data.filter(o => {
    if (o.crossing_number > max_crossing) {
      return false;
    }
    if (alex_poly.length !== o.alexander.length - 1) {
      return false;
    }
    for (let i = 0; i < alex_poly.length; i++) {
      if (alex_poly[i] !== o.alexander[i+1]) {
        return false;
      }
    }
    if (!equal(jones_coeffs, o.jones) && !equal(jones_coeffs_rev, o.jones)) {
      return false;
    }
    return true;
  });

  let names = options.map(o => {
    let obj = {name: o.name};
    if (o.katlas) {
      obj.katlas = "http://katlas.math.toronto.edu/wiki/" + o.katlas;
    }
    return obj;
  });
  return names;

});
