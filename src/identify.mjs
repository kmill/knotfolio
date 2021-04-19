import {get_invariant, define_invariant} from "./invariants.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import {assert, equal} from "./util.mjs";
import * as knotdata from "./knotdata.mjs";

define_invariant("identify_link", async function (mt, diagram) {
  let max_crossing = diagram.crossing_number();

  let conway_poly = await get_invariant('conway_poly', diagram);
  let conway_coeffs = [conway_poly.minexp()].concat(conway_poly.coeffs());
  let conway_mirror = conway_coeffs.slice();
  for (let i = 1; i < conway_mirror.length; i++) {
    if ((conway_mirror[0] + i - 1) % 2 == 1) {
      conway_mirror[i] = -conway_mirror[i];
    }
  }

  let jones_poly = await get_invariant('jones_poly', diagram);
  let jones_coeffs = jones_poly ? [jones_poly.minexp()].concat(jones_poly.coeffs()) : [0];
  let jones_coeffs_rev = [-jones_coeffs.length + 2 - jones_coeffs[0]].concat(jones_coeffs.slice(1).reverse());

  let table = await knotdata.get_knots(diagram.num_components(), max_crossing,
                                       ["conway", "jones"]);

  let options = table.knots.filter(o => {
    let matches = equal(conway_coeffs, o.conway) && equal(jones_coeffs, o.jones);
    if (!matches) {
      matches = equal(conway_mirror, o.conway) && equal(jones_coeffs_rev, o.jones);
    }
    return matches;
  });

  let names = options.map(o => {
    let obj = {name: o.name};
    if (o.katlas) {
      obj.katlas = "http://katlas.math.toronto.edu/wiki/" + o.katlas;
    }
    return obj;
  });

  return {
    names: names,
    incomplete: table.incomplete
  };
});
