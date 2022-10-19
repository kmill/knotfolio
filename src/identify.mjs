import {get_invariant, define_invariant} from "./invariants.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import "./arrow.mjs";
import {assert, equal} from "./util.mjs";
import * as knotdata from "./knotdata.mjs";

define_invariant("identify_link", async function (mt, diagram) {
  let max_crossing = diagram.crossing_number();
  let is_virtual = diagram.virtual_crossing_number() > 0;

  let names = [];
  let incomplete = false;

  if (is_virtual) {
    let alex_poly = await get_invariant('alexander_poly', diagram);
    let arrow1 = await get_invariant('cabled_arrow_poly', diagram, 1);
    let arrow2 = await get_invariant('cabled_arrow_poly', diagram, 2);

    incomplete = true;

    let table = await knotdata.get_knots("green", diagram.num_components(), max_crossing,
                                         ["alexander", "arrow1", "arrow2"]);
    incomplete = table.incomplete;

    let alex_coeffs = alex_poly.coeffs();
    let arrowA = [[...arrow1], [...arrow2]];
    let arrowB = [[...arrow1.mirror()], [...arrow2.mirror()]];

    let options = table.knots.filter(o => {
      let matches = equal(alex_coeffs, o.alexander);
      let arrowO = [o.arrow1, o.arrow2];
      matches = matches && (equal(arrowA, arrowO) || equal(arrowB, arrowO));
      return matches;
    });

    names = options.map(o => {
      let obj = {name: o.name};
      if (o.crossing_number <= 4) {
        obj.katlas = "https://www.math.toronto.edu/drorbn/Students/GreenJ/" + o.name + ".html";
      }
      return obj;
    });

  } else {
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

    let table = await knotdata.get_knots("knotinfo", diagram.num_components(), max_crossing,
                                         ["conway", "jones"]);
    incomplete = table.incomplete;

    let options = table.knots.filter(o => {
      let matches = equal(conway_coeffs, o.conway) && equal(jones_coeffs, o.jones);
      if (!matches) {
        matches = equal(conway_mirror, o.conway) && equal(jones_coeffs_rev, o.jones);
      }
      return matches;
    });

    names = options.map(o => {
      let obj = {name: o.name};
      if (o.katlas) {
        obj.katlas = "http://katlas.math.toronto.edu/wiki/" + o.katlas;
      }
      return obj;
    });
  }

  return {
    names: names,
    incomplete: incomplete
  };
});
