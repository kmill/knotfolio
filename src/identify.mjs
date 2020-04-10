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
    let jcoeffs = jones_poly.coeffs();
    let coeffs = [];
    for (let i = 0; i < jcoeffs.length; i += 2) {
      coeffs.push(jcoeffs[i]);
    }
    coeffs.reverse();
    return jones_poly ? [-jones_poly.maxexp()/2].concat(coeffs) : [0];
  });
  jones_coeffss.forEach(p => console.log(toString(p)));
  let jones_coeffss_rev = jones_coeffss.map(jones_coeffs => {
    return [-jones_coeffs.length + 2 - jones_coeffs[0]].concat(jones_coeffs.slice(1).reverse());
  });
  
  let top_arrow_poly = 1 + +try_harder;
  let arrow_polys = [];
  for (let i = 1; i <= top_arrow_poly; i++) {
    arrow_polys.push(await get_invariant("cabled_arrow_poly", diagram, i));
  }
  let arrow_coeffss = arrow_polys.map(poly => Array.from(poly));
  let arrow_coeffss_rev = arrow_polys.map(poly => {
    let coeffs = [];
    for (let term of poly.terms()) {
      if (term.exps.length === 0) {
        coeffs.unshift(0, term.coeff);
      } else {
        coeffs.unshift(term.exps.length, term.coeff, -term.exps[0], ...term.exps.slice(1));
      }
    }
    return coeffs;
  });

  console.log(max_crossing);
  console.log(alex_poly);
  console.log(jones_coeffss);
  console.log(arrow_coeffss);
  console.log(arrow_coeffss_rev);

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

    let n_arrows = Math.min(arrow_coeffss.length, o.arrow.length);
    let arrow_ok = true, rev_arrow_ok = true;
    for (let i = 0; i < n_arrows; i++) {
      if (arrow_ok && !equal(arrow_coeffss[i], o.arrow[i])) {
        arrow_ok = false;
      }
      if (rev_arrow_ok && !equal(arrow_coeffss_rev[i], o.arrow[i])) {
        rev_arrow_ok = false;
      }
      if (!arrow_ok && !rev_arrow_ok) {
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
