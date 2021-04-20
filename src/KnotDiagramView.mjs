import {assert, hex_to_rgb, toString} from "./util.mjs";
import {KnotGraph} from "./knotgraph.mjs";
import {Point, segment_distance, point_along} from "./geom2d.mjs";
import {CROSSING_CHANGE_RADIUS, DIAGRAM_LINE_WIDTH, CROSSING_GAP, palette} from "./constants.mjs";
import {KnotRasterView} from "./KnotRasterView.mjs";
import {get_invariant} from "./invariants.mjs";
import {Laurent} from "./laurent.mjs";
import Q from "./kq.mjs";
import {signature} from "./matrix.mjs";

let global_tool_state = {
  tool: "crossing-change"
};

let default_pd_type = "KnotTheory";

let global_details_states = {
  "linking-matrix": true,
  "seifert-matrix": false,
  "alexander-module": false
};
function attach_details_handler(name, $details) {
  let initial_state = Boolean(global_details_states[name]);
  $details.prop("open", initial_state);
  $details.on("toggle", e => {
    global_details_states[name] = $details.prop("open");
  });
}

export class KnotDiagramView {
  constructor(width, height, diagram) {
    assert(width > 0);
    assert(height > 0);
    assert(diagram instanceof KnotGraph);
    this.width = width;
    this.height = height;
    this.diagram = diagram;

    this.c = new Point(0, 0);
    this.zoom = 1;

    this.mode_name = "Diagrams"; // constant
  }

  copy() {
    let view = new KnotDiagramView(this.width, this.height, this.diagram.copy());
    view.c = this.c.copy();
    view.zoom = this.zoom;
    return view;
  }

  mouse_to_pt(pt) {
    assert(pt instanceof Point);
    return new Point(this.zoom*(pt.x - this.c.x), this.zoom*(pt.y - this.c.y));
  }

  find_closest_crossing(pt) {
    /* Returns a vertex id for the diagram, or null */
    let diag = this.diagram;
    let dist = CROSSING_CHANGE_RADIUS*this.zoom;
    let closest = null;
    diag.verts.forEach((vert, vid) => {
      if (diag.adjs[vid].length === 4) {
        let d = Point.dist(pt, vert);
        if (d <= dist) {
          dist = d;
          closest = vid;
        }
      }
    });
    return closest;
  }
  
  draw_crossing_disk(ctxt, cpt) {
    let getX = (x) => {
      return x/this.zoom+this.c.x;
    };
    let getY = (y) => {
      return y/this.zoom+this.c.y;
    };
    ctxt.save();
    ctxt.fillStyle = "#0000ff";
    ctxt.globalAlpha = 0.2;
    ctxt.beginPath();
    ctxt.arc(getX(cpt.x)+0.5, getY(cpt.y)+0.5, CROSSING_CHANGE_RADIUS, 0, 2*Math.PI);
    ctxt.fill();
    ctxt.restore();
  }

  find_closest_circuit(pt) {
    /* Returns a list of darts of the closest circuit to the given point. */
    let diag = this.diagram;
    let dist = 3*DIAGRAM_LINE_WIDTH*this.zoom;
    let closest_eid = null;
    diag.edges.forEach((edge, eid) => {
      let d = segment_distance(diag.verts[edge[0]], diag.verts[edge[1]], pt);
      if (d <= dist) {
        dist = d;
        closest_eid = eid;
      }
    });
    if (closest_eid == null) {
      return null;
    }
    return diag.dart_circuit(closest_eid+1);
  }
  highlight_circuit(ctxt, circuit) {
    let getX = (x) => {
      return x/this.zoom+this.c.x;
    };
    let getY = (y) => {
      return y/this.zoom+this.c.y;
    };

    let diag = this.diagram;
    let pts = circuit.map(dart => diag.verts[diag.dart_start(dart)]);
    ctxt.save();
    ctxt.strokeStyle = "#0000ff";
    ctxt.globalAlpha = 0.2;
    ctxt.lineWidth = 3*DIAGRAM_LINE_WIDTH;
    ctxt.beginPath();
    pts.forEach(cpt => {
      ctxt.lineTo(getX(cpt.x)+0.5, getY(cpt.y)+0.5);
    });
    ctxt.closePath();
    ctxt.stroke();
    ctxt.restore();

  }

  mousedown(pt, e, undo_stack, ctxt) {
    pt = this.mouse_to_pt(pt);
    let tool = global_tool_state.tool;
    if (tool === "crossing-change") {
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        let view = this.copy();
        let adj = view.diagram.adjs[closest];
        adj.push(adj.shift());
        undo_stack.push(view);
        view.draw_crossing_disk(ctxt, view.diagram.verts[closest]);
      }
    } else if (tool === "toggle-orientation") {
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        view.diagram.reverse_orientation(circuit[0]);
        undo_stack.push(view);
        view.highlight_circuit(ctxt, circuit);
      }
    } else if (tool === "delete-component") {
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        view.diagram.delete_component(circuit[0]);
        undo_stack.push(view);
      }
    } else if (tool.startsWith("set-color-")) {
      let color = +tool.slice("set-color-".length);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        let view = this.copy();
        circuit.forEach(dart => {
          let edge = view.diagram.dart_edge(dart);
          edge[2] = color;
        });
        undo_stack.push(view);
        view.highlight_circuit(ctxt, circuit);
      }
    }
  }
  mousemove(pt, e, undo_stack, ctxt) {
    pt = this.mouse_to_pt(pt);
    let tool = global_tool_state.tool;
    if (tool === "crossing-change") {
      this.paint(ctxt);
      let closest = this.find_closest_crossing(pt);
      if (closest !== null) {
        this.draw_crossing_disk(ctxt, this.diagram.verts[closest]);
      }
    } else if (tool === "toggle-orientation") {
      this.paint(ctxt);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        this.highlight_circuit(ctxt, circuit);
      }
    } else if (tool === "delete-component") {
      this.paint(ctxt);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        this.highlight_circuit(ctxt, circuit);
      }
    } else if (tool.startsWith("set-color-")) {
      this.paint(ctxt);
      let circuit = this.find_closest_circuit(pt);
      if (circuit !== null) {
        this.highlight_circuit(ctxt, circuit);
      }
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    pt = this.mouse_to_pt(pt);
    let tool = global_tool_state.tool;
  }
  mousewheel(pt, e, undo_stack, ctxt) {
    let delta = Math.sign(e.deltaY);
    let kpt = this.mouse_to_pt(pt);
    this.zoom *= Math.pow(1.05, delta);
    let zkpt = this.mouse_to_pt(pt);
    this.c.x += (zkpt.x - kpt.x) / this.zoom;
    this.c.y += (zkpt.y - kpt.y) / this.zoom;
    this.paint(ctxt);
  }
  toolbox(undo_stack) {
    let $div = this.$div = Q.div();

    let diagram = this.diagram;

    /* Modification tools */
    Q.create("h2").append("Modification tools").appendTo($div);
    let $tools = Q.div().appendTo($div);

    let $crossing_change = Q.span(Q.span({className:"icon24-crossing"}))
        .addClass("icon-button")
        .prop("data-tool", "crossing-change")
        .prop("title", "Change crossing type")
        .appendTo($tools);

    let $toggle_orientation = Q.span(Q.span({className:"icon24-two-arrows"}))
        .addClass("icon-button")
        .prop("data-tool", "toggle-orientation")
        .prop("title", "Toggle component orientation")
        .appendTo($tools);

    let $eraser = Q.span(Q.span({className:"icon24-trash"}))
        .addClass("icon-button")
        .prop("data-tool", "delete-component")
        .prop("title", "Delete component")
        .appendTo($tools);

    $tools.append(Q.create("br"));
    palette.forEach((hex, i) => {
      let $b = Q.span().addClass("icon-button")
          .prop("data-tool", "set-color-" + (i+1))
          .prop("title", "Recolor component to color " + (i+1))
          .appendTo($tools);
      let $bs = Q.span(" ").addClass("icon-color")
          .css("background", hex_to_rgb(hex))
          .appendTo($b);
    });

    this.update_tool = (toolname) => {
      $div.query(".icon-button").forEach($e => {
        let button_tool = $e.prop("data-tool");
        if (typeof button_tool === "string") {
          $e.toggleClass("active", button_tool === toolname);
        }
      });
    };
    this.update_tool(global_tool_state.tool);

    $tools.on("click", e => {
      let el = e.target.closest('.icon-button');
      if (el) {
        let tool = Q(el).prop('data-tool');
        if (typeof tool === "string") {
          e.preventDefault();
          e.stopPropagation();
          global_tool_state.tool = tool;
          this.update_tool(tool);
        }
      }
    });

    let $mirror = Q.create("input")
        .prop("type", "button")
        .value("Mirror")
        .prop("title", "Change the types of all crossings")
        .appendTo($div);
    $mirror.on("click", e => {
      let view = this.copy();
      view.diagram.adjs.forEach(a => {
        a.push(a.shift());
      });
      undo_stack.push(view);
    });

    let $invert = Q.create("input")
        .prop("type", "button")
        .value("Invert")
        .prop("title", "Change orientations of each component")
        .appendTo($div);
    $invert.on("click", e => {
      let view = this.copy();
      view.diagram.edges.forEach(edge => {
        let t_vert = edge[0];
        edge[0] = edge[1];
        edge[1] = t_vert;
      });
      view.diagram.adjs = view.diagram.adjs.map(a => a.map(d => -d));
      undo_stack.push(view);
    });

    let $alternating = Q.create("input")
        .prop("type", "button")
        .value("Make alternating")
        .prop("title", "Change types of crossings to make an alternating diagram")
        .appendTo($div);
    $alternating.on("click", e => {
      let view = this.copy();
      view.diagram.make_alternating();
      undo_stack.push(view);
    });
    $div.append(Q.create("input", {type: "button",
                                   title: "Assign distinct colors to each component"})
                .value("Auto-color")
                .on("click", e => {
                  let view = this.copy();
                  view.diagram.auto_color(palette.length);
                  undo_stack.push(view);
                }));

    $div.append(Q.create("br"));

    let $to_drawing = Q.create("input")
        .prop("type", "button")
        .value("Convert to drawing")
        .prop("title", "Convert the diagram back into a drawing for free-form editing (no round-trip guarantee)")
        .appendTo($div);
    $to_drawing.on("click", e => {
      let canvas = document.createElement("canvas");
      canvas.width = this.width;
      canvas.height = this.height;
      let ctxt = canvas.getContext("2d");
      this.paint(ctxt, false);
      let view = new KnotRasterView(this.width, this.height);
      view.fromImage(ctxt.getImageData(0, 0, this.width, this.height));
      undo_stack.push(view);
    });

    $div.append(Q.create("h2").append("Isotopy tools"));

/*    let $smooth = Q.create("input")
        .prop("type", "button")
        .value("Smooth")
        .prop("title", "Smooth the diagram a little (not very well)")
        .appendTo($div);
    $smooth.on("click", e => {
      let view = this.copy();
      view.diagram.smooth();
      undo_stack.push(view);
    });*/

    /*
    let $simplify_mesh = Q.create("input")
        .prop("type", "button")
        .value("Simplify mesh")
        .prop("title", "Simplify the geometry of the diagram")
        .appendTo($div);
    $simplify_mesh.on("click", e => {
      let view = this.copy();
      view.diagram.simplify_mesh(5);
      view.diagram.compact();
      undo_stack.push(view);
    });*/

    let $beautify = Q.create("input")
        .prop("type", "button")
        .value("Beautify")
        .prop("title", "Try to beautify the knot using a the Tutte embedding of a barycentric subdivision of the diagram")
        .appendTo($div);
    $beautify.on("click", e => {
      let view = this.copy();
      view.diagram.beautify();
      undo_stack.push(view);
    });

    $div.append(Q.create("hr"));

    $div.append(Q.create("h2").append("Diagram information"));

    let $idiv = Q.create("div").prop("id", "diag-info").appendTo($div);
    {
      let $table = Q.create("table", {className:"diag-props"});
      $idiv.append($table);

      $table.append(Q.create("tr",
                             Q.create("th", "Crossings:"),
                             Q.create("td", ''+this.diagram.crossing_number())));

      $table.append(Q.create("tr",
                             Q.create("th", "Components:"),
                             Q.create("td", ''+this.diagram.num_components())));


      $table.append(Q.create("tr",
                             Q.create("th", "Writhe:"),
                             Q.create("td", ''+this.diagram.writhe())));

      $table.append(Q.create("tr",
                             Q.create("th", "Bridges:"),
                             Q.create("td", ''+this.diagram.bridge_number())));


      $table.append(Q.create("tr", {title: "The canonical Seifert genus for this diagram"},
                             Q.create("th", "Can. genus:"),
                             Q.create("td", ''+this.diagram.genus())));

      let turaev = this.diagram.turaev();
      $table.append(Q.create("tr",
                             Q.create("th", "Turaev genus:"),
                             Q.create("td", ''+turaev.genus)));


      let props = [];
      if (diagram.is_alternating()) {
        props.push("alternating");
      }

      if (turaev.plus && turaev.minus) {
        props.push("adequate");
      } else if (turaev.plus) {
        props.push("plus-adequate");
      } else if (turaev.minus) {
        props.push("minus-adequate");
      }

      $table.append(Q.create("tr",
                             Q.create("th", "Properties:"),
                             Q.create("td", props.length > 0 ? props.join(", ") : Q.create("em", "none"))));

      let $lm = Q.create("details",
                         {title: "Pairwise linking numbers between colored components. Self linking number is writhe."},
                         Q.create("summary", "Linking matrix"))
          .appendTo($idiv);
      attach_details_handler("linking-matrix", $lm);
      {
        let matrix = this.diagram.linking_matrix();
        let comps = Array.from(matrix.keys());
        comps.sort((a, b) => a-b);
        let $table = Q.create("table").addClass("linking-matrix");
        comps.forEach(j => {
          let $tr = Q.create("tr").appendTo($table);
          comps.forEach(i => {
            let $td = Q.create("td").appendTo($tr);
            $td.append(''+(matrix.get(j).get(i)||0));
            if (i === j) {
              $td.prop("style").color = "white";
              $td.prop("style").background = hex_to_rgb(palette[i-1]);
            }
          });
        });
        $lm.append($table);
      }
    }

    let $sf = Q.create("details",
                       {title:"There is one Seifert linking matrix per connected component of the diagram."},
                       Q.create("summary", "Seifert form"))
        .appendTo($idiv);

    attach_details_handler("seifert-matrix", $sf);

    //let the_signature = 0;
    diagram.seifert_form().forEach(matrix => {
      let $table = Q.create("table", {className:"seifert-matrix"});
      matrix.forEach(row => {
        let $tr = Q.create("tr").appendTo($table);
        row.forEach(c => {
          $tr.append(Q.create("td", ''+c));
        });
      });
      $sf.append($table);

      // // compute A + A^T
      // let two_cover = matrix.map(row => row.slice());
      // for (let i = 0; i < matrix.length; i++) {
      //   for (let j = 0; j < matrix.length; j++) {
      //     two_cover[i][j] += matrix[j][i];
      //   }
      // }
      //
      // the_signature += signature(two_cover);
    });

    let $pd = Q.create("textarea")
        .attr("readonly", true)
        .addClass("code-data");
    let $pdtypes = Q.create("form", {className: "inline-form"},
                            Q.create("label",
                                     Q.create("input", {type: "radio",
                                                        name: "pd-type",
                                                        value: "KnotTheory"}),
                                     "KnotTheory"),
                            Q.create("label",
                                     Q.create("input", {type: "radio",
                                                        name: "pd-type",
                                                        value: "KnotTheory-oriented"}),
                                     "Oriented KnotTheory"),
                            Q.create("label",
                                     Q.create("input", {type: "radio",
                                                        name: "pd-type",
                                                        value: "SnapPy"}),
                                     "SnapPy"),
                           );
    function pd_change(name) {
      $pdtypes[0].elements['pd-type'].value = default_pd_type = name;
      try {
        if (name === "KnotTheory") {
          $pd.value(diagram.get_pd().toMathematica());
        } else if (name === "KnotTheory-oriented") {
          $pd.value(diagram.get_pd(true).toMathematica());
        } else if (name === "SnapPy") {
          $pd.value(diagram.get_pd().toSnappy());
        }
      } catch (x) {
        $pd.value("" + x);
      }
    }
    $pdtypes.on("change", function (e) {
      let name = this.elements['pd-type'].value;
      pd_change(name);
    });
    $idiv.append(Q.create("p")
                 .append("PD: ")
                 .append($pdtypes, Q.create("br"), $pd));
    pd_change(default_pd_type);

    let dt = diagram.get_dt();
    if (dt) {
      $idiv.append(Q.create("p", {title: "The Dowker-Thistlethwaite code for the knot."})
                   .append("DT: " + toString(dt)));
    }

    function laurent_invariant(promise, div, variable="t", exp_divisor=1) {
      promise.then(poly => {
        if (poly) {
          div.append(poly.toDOM(variable, exp_divisor));
        } else {
          div.append("n/a");
        }
      }, err => {
        console.log(err);
        div.addClass("calc-error");
        div.append('Error: '+err);
      });
    }

    var $kb_div;
    $idiv.append(Q.create("p")
                 .append("Kauffman bracket:")
                 .append($kb_div = Q.create("div")));
    laurent_invariant(get_invariant("kauffman_bracket", this.diagram), $kb_div, "A");

    $idiv.append(Q.create("h2").append("Identification"));
    let $ident = Q.create("p").appendTo($idiv);
    get_invariant('identify_link', this.diagram).then(
      res => {
        if (res.names.length === 0) {
          $ident.append("Unknown link");
        } else {
          $ident.append("Candidates: ");
          res.names.forEach((c, i) => {
            if (i > 0) {
              $ident.append(", ");
            }
            if (c.katlas) {
              $ident.append(Q.create("a", {href: c.katlas,
                                           target: "_blank"},
                                     c.name));
            } else {
              $ident.append(c.name);
            }
          });
        }
        if (res.incomplete) {
          $ident.append(" (warning: possibly incomplete)");
        }
      },
      err => {
        console.error(err);
        $ident.addClass("calc-error");
        $ident.append('Error: '+err);
      }
    );

    $idiv.append(Q.create("h2").append("Invariants"));

    {
      let $table = Q.create("table", {className:"diag-props"});
      $idiv.append($table);

      let $det;
      $table.append(Q.create("tr",
                             Q.create("th", "Determinant:"),
                             $det = Q.create("td")));

      (async function () {
        let poly = await get_invariant("alexander_poly", diagram, 0);
        let coeffs = poly.coeffs();
        let det = 0;
        for (let i = 0; i < coeffs.length; i++) {
          det += coeffs[i] * (2 * (i % 2) - 1);
        }
        $det.append('' + Math.abs(det));
      })();

      // let $sig;
      // $table.append(Q.create("tr", {title: "The program currently uses floating point arithmetic to compute eigenvalues, hence the warning."},
      //                        Q.create("th", "Signature:"),
      //                        $sig = Q.create("td", ''+the_signature+" ",
      //                                        Q.create("em", "(warning: estimated)"))));


      let $jones;
      $idiv.append(Q.create("p")
                   .append("Jones polynomial:")
                   .append($jones = Q.create("div")));
      laurent_invariant(get_invariant('jones_poly', this.diagram), $jones, "t", 2);

      if (0) {
        let wp = get_invariant(this.diagram, 'wirtinger_presentation');
        let gens = Q.create("div").append("Generators: ");
        wp.gens.forEach((g, i) => {
          if (i > 0) {
            gens.append(", ");
          }
          gens.append(showGen(g));
        });
        let rels = Q.create("div").append("Relations: ");
        wp.rels.forEach((rel, i) => {
          if (i > 0) {
            rels.append(", ");
          }
          rels.append(showRel(rel));
        });
        $idiv.append(Q.create("p")
                     .append("Wirtinger presentation:")
                     .append(gens)
                     .append(rels));
        function showGen(g) {
          let s = Q.create("span").append(g[0]);
          s.append(Q.create("sub").append(g.slice(1)));
          return s;
        }
        function showRel(rel) {
          let s = Q.create("span");
          for (let i = 0; i < rel.length; i += 2) {
            s.append(showGen(rel[i]));
            if (rel[i+1] !== 1) {
              s.append(Q.create("sup").append(''+rel[i+1]));
            }
          }
          return s;
        }
      }


      let $conway_poly;
      $idiv.append(Q.create("p")
                   .append("Conway potential:")
                   .append($conway_poly = Q.create("div")));
      laurent_invariant(get_invariant("conway_poly", diagram), $conway_poly, "z");

      let $alex_polys = Q.create("p").append("Alexander polynomials:").appendTo($idiv);
      (async function () {
        try {
          for (let n = 0; ; n++) {
            let poly = await get_invariant("alexander_poly", diagram, n);
            if (n >= 1 && poly.equal(Laurent.unit)) {
              break;
            }
            $alex_polys.append(Q.create("br"));
            $alex_polys.append("\u0394");
            $alex_polys.append(Q.create("sup").append(''+n));
            $alex_polys.append("(t) = ", poly.toDOM("t"));
          }
        } catch (x) {
          $alex_polys.append(Q.create("div", {className: "calc-error"}, ''+x));
          throw x;
        }
      })();

      let $alex_mod = Q.create("details",
                               {title:"Mildly simplified (not normalized since Z[t,t^-1] is not a PID)"},
                               Q.create("summary", "An Alexander module presentation matrix:"))
          .appendTo($idiv);
      attach_details_handler("alexander-module", $alex_mod);
      (async function () {
        let matrix = await get_invariant('alexander_module', diagram);
        let $table = Q.create("table").addClass("alexander-matrix");
        matrix.forEach(row => {
          let $tr = Q.create("tr").appendTo($table);
          row.forEach(entry => {
            let $td = Q.create("td").appendTo($tr);
            $td.append(entry.toDOM("t"));
          });
        });
        $alex_mod.append($table);
        $alex_mod.append(Q.create("em").append("(" + matrix.length + " generator(s))"));
      })();

    }
    
    return $div;
  }

  paint(ctxt, with_arrows=true) {
    ctxt.save();
    ctxt.fillStyle = "white";
    ctxt.fillRect(0, 0, this.width, this.height);

    let getX = (x) => {
      return x/this.zoom+this.c.x;
    };
    let getY = (y) => {
      return y/this.zoom+this.c.y;
    };

    let diag = this.diagram;

    let seen_darts = new Set;

    let visit_dart = (dart) => {
      if (seen_darts.has(dart)) return;

      // locate beginning of path
      function opp_is_under(d) {
        /* Is the  opposite of the dart an under-dart? */
        d = diag.opp_dart(d);
        return diag.dart_order(d) === 4 && !diag.dart_is_over(d);
      }
      // Switch to opposite orientation if needed, then walk until we get to beginning of arc.
      if (diag.dart_start(dart) === diag.dart_edge(dart)[0]) {
        dart = diag.opp_dart(dart);
      }
      let d = dart;
      while (!opp_is_under(d)) {
        d = diag.through_dart(d);
        if (d === dart) break;
      }
      dart = diag.opp_dart(d);
      // now dart is beginning of an arc (or some random dart from a loop)

      let path = [];
      let loop = false;
      d = dart;
      while (true) {
        seen_darts.add(d);
        seen_darts.add(diag.opp_dart(d));
        path.push(diag.verts[diag.dart_start(d)]);
        if (opp_is_under(d)) {
          path.push(diag.verts[diag.dart_end(d)]);
          break;
        }
        if (path.length > 1 && d === dart) {
          loop = true;
          break;
        }
        d = diag.through_dart(d);
      }

      if (!loop) {
        let to_remove = CROSSING_GAP * this.zoom;
        while (to_remove > 0 && path.length >= 2) {
          let d = Point.dist(path[0], path[1]);
          if (d <= to_remove) {
            to_remove -= d;
            path.shift();
          } else {
            path[0] = point_along(path[0], path[1], to_remove/d);
            break;
          }
        }
        to_remove = CROSSING_GAP * this.zoom;
        while (to_remove > 0 && path.length >= 2) {
          let d = Point.dist(path[path.length-2], path[path.length-1]);
          if (d <= to_remove) {
            to_remove -= d;
            path.pop();
          } else {
            path[path.length-1] = point_along(path[path.length-1], path[path.length-2], to_remove/d);
            break;
          }
        }
      }

      ctxt.beginPath();
      ctxt.moveTo(getX(path[0].x)+0.5, getY(path[0].y)+0.5);
      for (let i = 1; i < path.length; i++) {
        let v = path[i];
        ctxt.lineTo(getX(v.x)+0.5, getY(v.y)+0.5);
      }
      ctxt.strokeStyle = hex_to_rgb(palette[diag.dart_edge(dart)[2]-1]);
      ctxt.lineWidth = DIAGRAM_LINE_WIDTH;
      ctxt.lineCap = "round";
      ctxt.stroke();

      // arrow head
      if (with_arrows) {
        let p = path[path.length-1];
        let dx = 0, dy = 0;
        let dist = 5;
        for (let i = path.length-2; i >= 0 && dist > 0; i--) {
          let p1 = path[i], p2 = path[i+1];
          dx += p2.x - p1.x;
          dy += p2.y - p1.y;
          dist -= Point.dist(p1, p2);
        }
        let norm = Math.sqrt(dx*dx + dy*dy);
        if (norm > 0) {
          dx /= norm;
          dy /= norm;
          ctxt.beginPath();
          function f_x(x, y) {
            // x is in direction of arrow tip
            return getX(p.x) + dx*x - dy*y + 0.5;
          }
          function f_y(x, y) {
            return getY(p.y) + dy*x + dx*y + 0.5;
          }
          ctxt.moveTo(f_x(-5, 2), f_y(-5, 2));
          ctxt.lineTo(f_x(0, 0), f_y(0, 0));
          ctxt.lineTo(f_x(-5, -2), f_y(-5, -2));
          ctxt.stroke();
        }
      }
    };

    diag.edges.forEach((e, i) => {
      visit_dart(i+1);
    });

    if (0) {
      ctxt.fillStyle = "white";
      ctxt.globalAlpha = 1.0;
      diag.verts.forEach(pt => {
        ctxt.fillRect(getX(pt.x), getY(pt.y), 2, 2);
      });
    }

    ctxt.restore();
  }
}
