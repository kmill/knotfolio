import {get_invariant, define_invariant} from "./invariants.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import {assert, equal, toString} from "./util.mjs";
import * as knotinfo from "./greenj-filled.mjs";
import {PD,X,P,Xp,Xm} from "./pd.mjs";

define_invariant("identify_link", async function (mt, diagram, try_harder) {
  if (arguments.length < 3) {
    return await get_invariant('identify_link', diagram, 0);
  }
  let max_crossing = diagram.crossing_number();
  let alex_poly = (await get_invariant('alexander_poly', diagram)).coeffs();
  let jones_polys = [];
  let top_jones_poly = 2 + +try_harder;
  for (let i = 1; i <= top_jones_poly; i++) {
    jones_polys.push(await get_invariant("cabled_jones_poly", diagram, i));
  }
  let jones_coeffss = jones_polys.map(jones_poly => {
    return jones_poly ? [jones_poly.minexp()].concat(jones_poly.coeffs()) : [0];
  });
  jones_coeffss.forEach(p => console.log(toString(p)));
  let jones_coeffss_rev = jones_coeffss.map(jones_coeffs => {
    return [-jones_coeffs.length + 2 - jones_coeffs[0]].concat(jones_coeffs.slice(1).reverse());
  });
  console.log(max_crossing);
  console.log(alex_poly);
  console.log(jones_coeffss);

  let options = knotinfo.data.filter(o => {
    if (o.crossing_number > max_crossing) {
      return false;
    }
    if (alex_poly.length !== o.alex.length) {
      return false;
    }
    for (let i = 0; i < alex_poly.length; i++) {
      if (alex_poly[i] !== o.alex[i]) {
        return false;
      }
    }
    let n_jones = Math.min(jones_coeffss.length, o.jones.length);
    let jones_ok = true, rev_jones_ok = true;
    for (let i = 0; i < n_jones; i++) {
      if (jones_ok && !equal(jones_coeffss[i], o.jones[i])) {
        jones_ok = false;
      }
      if (rev_jones_ok && !equal(jones_coeffss_rev[i], o.jones[i])) {
        rev_jones_ok = false;
      }
      if (!jones_ok && !rev_jones_ok) {
        return false;
      }
    }
    return true;
  });

  let names = options.map(o => {
    let obj = {name: o.name};
    if (o.url) {
      if (o.url.startsWith("GreenJ/")) {
        obj.url = 'https://www.math.toronto.edu/drorbn/Students/' + o.url;
      } else {
        obj.url = o.url;
      }
    }
    return obj;
  });
  return names;

});
