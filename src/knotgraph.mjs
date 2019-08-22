import {assert, remove_value} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {segments_intersect} from "./geom2d.mjs";
import {PD,P,X,Xp,Xm} from "./pd.mjs";

export class KnotGraph {
  constructor(verts, edges, adjs) {
    this.verts = verts; // [Point,...]
    this.edges = edges; // [[vtx, vtx, comp],...]
    this.adjs = adjs; // [[dart...],...] where dart 0 and 2 are under, 1 and 3 are over
    // a dart is edgeid+1 or -edgeid-1 depending on which side the edge is
  }

  copy() {
    return new KnotGraph(
      this.verts.map(pt => pt.copy()),
      this.edges.map(edge => edge.slice()),
      this.adjs.map(list => list.slice())
    );
  }
  
  ensure_orientation() {
    /* Goes through edges and makes sure they are oriented so that
       [dart_start, dart_end] are the two vertices. The first edge in
       the edge list determines the orientation if there is a
       discrepancy. */
    let seen_darts = new Set();
    this.edges.forEach((edge, eid) => {
      if (seen_darts.has(eid+1) || seen_darts.has(-eid-1)) {
        return;
      }
      let dart = eid + 1;
      let d = dart;
      do {
        seen_darts.add(d);
        seen_darts.add(-d);
        let curr_edge = this.dart_edge(d);
        if (this.dart_start(d) !== curr_edge[0]) {
          d = -d;

          // swap vertices on edge
          [curr_edge[0], curr_edge[1]] = [curr_edge[1], curr_edge[0]];

          // swap darts in adj
          let adj, idx;
          adj = this.adjs[curr_edge[0]];
          idx = adj.indexOf(-d);
          assert(idx >= 0);
          adj[idx] = d;
          
          adj = this.adjs[curr_edge[1]];
          idx = adj.indexOf(d);
          assert(idx >= 0);
          adj[idx] = -d;

          assert(this.dart_start(d) === curr_edge[0]);
        }
        d = this.through_dart(d);
      } while (d !== dart);
    });
    //console.log("seen darts " + seen_darts.size);
    //console.log("edges " + this.edges.length);
  }
  
  reverse_orientation(dart_id) {
    /* Reverses the orientation of the entire component given by
       dart_id.  Assumes the diagram is already oriented. */
    let circuit = this.dart_circuit(dart_id);
    circuit.forEach(dart => {
      let edge = this.dart_edge(dart);
      // edge[0] is dart_start, by assumption
      
      // swap vertices on edge
      [edge[0], edge[1]] = [edge[1], edge[0]];

      // swap darts in adj
      let adj, idx;
      adj = this.adjs[edge[1]];
      idx = adj.indexOf(dart);
      assert(idx >= 0);
      adj[idx] = -dart;

      adj = this.adjs[edge[0]];
      idx = adj.indexOf(-dart);
      assert(idx >= 0);
      adj[idx] = dart;
    });
  }
  
  make_alternating() {
    /* Changes crossings to make this into an alternating
       diagram. Assumes the diagram is oriented.  Leaves an
       already-alternating diagram alone. */
    let seen_edges = [];
    let to_see = [];
    let visit_edges = () => {
      while (to_see.length) {
        let eid = to_see.pop();
        if (!seen_edges[eid]) {
          let sign = null;
          this.dart_circuit(eid + 1).forEach(dart => {
            seen_edges[Math.abs(dart) - 1] = true;
            let vid = this.dart_start(dart);
            let this_sign = this.adjs[vid].indexOf(dart) % 2 === 0;
            if (this.adjs[vid].length === 4) {
              this.adjs[vid].forEach(dart => to_see.push(Math.abs(dart) - 1));
              if (sign === this_sign) {
                this.adjs[vid].push(this.adjs[vid].shift()); // rotate crossing
                this_sign = !this_sign;
              }
              sign = this_sign;
            }
          });
        }
      }
    };
    for (let i = 0; i < this.edges.length; i++) {
      if (!seen_edges[i]) {
        to_see.push(i);
        visit_edges();
      }
    }
  }

  is_alternating() {
    let seen_edges = [];
    let to_see = [];
    for (let i = 0; i < this.edges.length; i++) {
      if (!seen_edges[i]) {
        to_see.push(i);
        while (to_see.length) {
          let eid = to_see.pop();
          if (seen_edges[eid]) {
            continue;
          }
          let sign = null;
          let circ = this.dart_circuit(eid + 1);
          for (let di = 0; di < circ.length; di++) {
            let dart = circ[di];
            seen_edges[Math.abs(dart) - 1] = true;
            let vid = this.dart_start(dart);
            let this_sign = this.adjs[vid].indexOf(dart) % 2 === 0;
            if (this.adjs[vid].length === 4) {
              this.adjs[vid].forEach(dart => to_see.push(Math.abs(dart) - 1));
              if (sign === this_sign) {
                // Not alternating
                return false;
              }
              sign = this_sign;
            }
          }
        }
      }
    }
    return true;
  }
  
  auto_color(max_colors) {
    /* Assigns colors to the components in an arbitrary order */
    assert(max_colors > 0);
    let next_color = 0;
    let seen = new Array(this.edges.length);
    for (let eid = 0; eid < this.edges.length; eid++) {
      if (!seen[eid]) {
        let color = (next_color++) % max_colors;
        this.dart_circuit(eid + 1).forEach(dart => {
          let deid = Math.abs(dart) - 1;
          seen[deid] = true;
          this.edges[deid][2] = color + 1;
        });
      }
    }
  }
  
  delete_component(dart_id) {
    /* Deletes the entire component containing the given dart. Assumes
       the diagram is oriented.*/
    let edge_ids = this.dart_circuit(dart_id).map(dart => Math.abs(dart) - 1);
    // remove edges and vertices from the graph by setting them to null, then compact
    edge_ids.forEach(eid => {
      let edge = this.edges[eid];
      remove_value(this.adjs[edge[0]], eid+1);
      remove_value(this.adjs[edge[0]], -eid-1);
      remove_value(this.adjs[edge[1]], eid+1);
      remove_value(this.adjs[edge[1]], -eid-1);
      this.edges[eid] = null;
    });
    this.compact();
  }
  
  compact() {
    /* The edge and vertex lists are allowed to have nulls.  Deletes
       any degree-0 vertices, and renumbers everything so there are no
       nulls. */
    let newverts = [];
    for (let i = 0; i < this.verts.length; i++) {
      if (this.adjs[i] && this.adjs[i].length === 0) {
        this.verts[i] = null;
      } else if (this.verts[i] !== null) {
        let new_vid = newverts.length;
        newverts.push(this.verts[i]);
        this.verts[i] = new_vid; // store forwarding pointer
      }
    }
    let newedges = [];
    for (let i = 0; i < this.edges.length; i++) {
      let edge = this.edges[i];
      if (edge !== null) {
        let new_eid = newedges.length;
        this.edges[i] = new_eid; // store forwarding pointer
        newedges.push([this.verts[edge[0]], this.verts[edge[1]], edge[2]]);
      }
    }
    let newadjs = [];
    for (let i = 0; i < this.verts.length; i++) {
      let adj = this.adjs[i];
      if (this.verts[i] !== null) {
        let adj2 = [];
        adj.forEach(dart => {
          let fwd = this.edges[Math.abs(dart)-1];
          if (fwd !== null) {
            adj2.push(Math.sign(dart) * (fwd + 1));
          }
        });
        newadjs.push(adj2);
      }
    }
    this.verts = newverts;
    this.edges = newedges;
    this.adjs = newadjs;
  }

  unsubdivide(vtx_i) {
    /* Does not check if this operation will leave the diagram in a non-planar state. */
    assert(this.adjs[vtx_i].length === 2);
    let dart = Math.abs(this.adjs[vtx_i][0]);
    if (this.dart_end(dart) !== vtx_i) {
      dart = Math.abs(this.adjs[vtx_i][1]);
    }
    assert(this.dart_end(dart) === vtx_i);
    let e0 = dart - 1,
        e1 = this.through_dart(dart) - 1;
    assert(e1 >= 0);
    let edge0 = this.edges[e0],
        edge1 = this.edges[e1];
    let v2 = this.dart_end(this.through_dart(dart));

    let idx2 = this.adjs[v2].indexOf(this.opp_dart(this.through_dart(dart)));
    assert(idx2 >= 0);

    edge0[1] = edge1[1];
    this.adjs[v2][idx2] = this.opp_dart(dart);
    this.verts[vtx_i] = null;
    this.adjs[vtx_i] = null;
    this.edges[e1] = null;
  }

  simplify_mesh(pixels=2) {
    /* Simplifies the mesh, unsubdividing edges so long as it doesn't
       move things more than 1 pixel. Need to run compact afterwards. */
    let do_remove = true;
    while (do_remove) {
      do_remove = false;
      next_vtx:
      for (let i = 0; i < this.verts.length; i++) {
        let pt = this.verts[i];
        if (pt === null) {
          continue next_vtx;
        }
        let adj = this.adjs[i];
        if (adj.length === 2) {
          // calculate length of altitude h of triangle given by vectors pt_0-pt and pt_1-pt.
          let v0 = this.dart_end(adj[0]),
              v1 = this.dart_end(adj[1]);
          let pt_0 = this.verts[v0],
              pt_1 = this.verts[v1];
          let w0x = pt_0.x - pt.x,
              w0y = pt_0.y - pt.y,
              w1x = pt_1.x - pt.x,
              w1y = pt_1.y - pt.y,
              ux = pt_0.x - pt_1.x,
              uy = pt_0.y - pt_1.y;
          let cross = w0x*w1y - w1x*w0y;
          let h = Math.abs(cross) / Math.sqrt(ux*ux + uy*uy);

          if (h <= pixels) {
            // Will the unsubdivided version run through anything?
            for (let j = 0; j < this.edges.length; j++) {
              if (j !== Math.abs(adj[0]) - 1 && j !== Math.abs(adj[1]) - 1) {
                let edge = this.edges[j];
                if (edge === null) {
                  continue;
                }
                if (segments_intersect(this.verts[edge[0]], this.verts[edge[1]],
                                       pt_0, pt_1)) {
                  continue next_vtx;
                }
              }
            }
            this.unsubdivide(i);
            this.do_remove = true;
          }
        }
      }
    }
  }

  dart_start(dart_id) {
    /* Takes a dart id and returns a vertex id. */
    return this.dart_edge(dart_id)[dart_id > 0 ? 0 : 1];
  }
  dart_end(dart_id) {
    /* Takes a dart id and returns a vertex id. */
    assert(typeof dart_id === "number");
    return this.dart_edge(dart_id)[dart_id > 0 ? 1 : 0];
  }
  dart_edge(dart_id) {
    /* Takes a dart id and returns its underlying edge object. */
    assert(typeof dart_id === "number");
    return this.edges[Math.abs(dart_id)-1];
  }
  dart_order(dart_id) {
    /* Takes a dart id and returns the number of incident darts at its vertex. */
    let adj = this.adjs[this.dart_start(dart_id)];
    return adj.length;
  }
  dart_is_over(dart_id) {
    /* Assuming the dart id is for a dart at a crossing, gives whether the dart is part of the over-strand. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    assert(adj.length === 4);
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return (idx % 2) === 1;
  }
  next_dart(dart_id) {
    /* Takes a dart id and returns the next dart in counter-clockwise
       order about its vertex. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return adj[(idx + 1) % adj.length];
  }
  prev_dart(dart_id) {
    /* Takes a dart id and returns the previous dart in counter-clockwise
       order about its vertex. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    let idx = adj.indexOf(dart_id);
    assert(idx >= 0);
    return adj[(idx + adj.length - 1) % adj.length];
  }
  opp_dart(dart_id) {
    /* Takes a dart id and returns the other dart on its edge. */
    assert(typeof dart_id === "number");
    assert(dart_id !== 0 && Math.abs(dart_id) <= this.edges.length);
    return -dart_id;
  }
  dart_oriented(dart_id) {
    /* Returns whether this dart is pointing in the orientation of its circuit. */
    let edge = this.dart_edge(dart_id);
    return this.dart_start(dart_id) === edge[0];
  }
  through_dart(dart_id) {
    /* Takes a dart id and returns the next dart in a circuit. */
    let d = this.opp_dart(dart_id);
    switch (this.dart_order(d)) {
    case 2:
      return this.next_dart(d);
    case 4:
      return this.next_dart(this.next_dart(d));
    default:
      throw new Error("Unexpected dart order");
    }
  }
  dart_circuit(dart_id) {
    /* Takes a dart id and returns the circuit of darts, using through_dart. */
    let path = [];
    let d = dart_id;
    do {
      path.push(d);
      d = this.through_dart(d);
    } while (d !== dart_id);
    return path;
  }

  crossing_number() {
    let num = 0;
    this.adjs.forEach(a => {
      if (a.length === 4) {
        num++;
      }
    });
    return num;
  }

  writhe() {
    /* Gives the total writhe of the diagram. */
    let wr = 0;
    this.adjs.forEach((a, vi) => {
      if (a.length === 4) {
        if (this.dart_oriented(a[1]) === this.dart_oriented(a[2])) {
          wr += 1;
        } else {
          wr -= 1;
        }
      }
    });
    return wr;
  }

  linking_matrix() {
    /* Gives the linking numbers between different colored components
       as a matrix.  The diagonal is the writhe of that colored
       component. */
    let matrix = new Map();
    function ensure_component(c) {
      if (!matrix.has(c)) {
        matrix.set(c, new Map());
        matrix.get(c).set(c, 0);
      }
    }
    function inc(c1, c2, delta) {
      let m1 = matrix.get(c1);
      m1.set(c2, (m1.get(c2)||0) + delta);
      let m2 = matrix.get(c2);
      m2.set(c1, (m2.get(c1)||0) + delta);
    }
    this.adjs.forEach((a, vi) => {
      if (a.length === 2) {
        let c = this.dart_edge(a[0])[2];
        ensure_component(c);
      } else if (a.length === 4) {
        // recall: a[0] is dart for undercrossing
        //  a[2] \ / a[1]
        //        /
        //  a[3] / \ a[0]
        let c1 = this.dart_edge(a[1])[2],
            c2 = this.dart_edge(a[2])[2];
        ensure_component(c1);
        ensure_component(c2);
        if (this.dart_oriented(a[1]) === this.dart_oriented(a[2])) {
          // so the crossing is positive
          inc(c1, c2, 1/2);
        } else {
          inc(c1, c2, -1/2);
        }
      }
    });
    return matrix;
  }

  num_components() {
    // Assumes edges are properly oriented
    let seen_darts = new Set();
    let n = 0;
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (seen_darts.has(edge_i)) {
        continue;
      }
      n++;
      this.dart_circuit(edge_i + 1).forEach(dart => {
        seen_darts.add(dart);
      });
    }
    return n;
  }

  genus() {
    /* The canonical Seifert genus of this particular diagram. For
       split diagrams, it is the sum of the genera of each component. */

    let seen_darts = new Set();

    let component_faces = (start_dart) => {
      let nfaces = 0;
      let to_see = [start_dart];
      while (to_see.length > 0) {
        let dart = to_see.pop();
        if (seen_darts.has(dart)) {
          continue;
        }
        nfaces++;
        // walk the Seifert face corresponding to the dart
        let d = dart;
        do {
          to_see.push(...this.adjs[this.dart_start(d)]);
          seen_darts.add(d);
          d = this.opp_dart(d);
          seen_darts.add(d);
          let adj = this.adjs[this.dart_start(d)];
          if (this.dart_oriented(d) === this.dart_oriented(this.next_dart(d))) {
            d = this.prev_dart(d);
          } else {
            d = this.next_dart(d);
          }
        } while (d !== dart);
      }
      return nfaces;
    };

    let b_0 = 0;
    let nfaces = 0;
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (!seen_darts.has(edge_i + 1)) {
        b_0++;
        nfaces += component_faces(edge_i + 1);
      }
    }
    return b_0 - (nfaces - this.crossing_number() + this.num_components())/2;
  }

  get_pd(oriented=false) {
    /* Gets an unoriented/oriented PD object.

       Chooses edge ids in ascending order of component. Makes sure d -> b is the orientation.
       If oriented=true, then Xr/Xl are used to determine the orientation of a--c.
    */
    let dart_arc = new Map();
    let next_arc_id = 1;
    let pd = PD.make();
    let edge_ids = this.edges.map((edge, i) => i);
    edge_ids.sort((i1, i2) => this.edges[i1][2] - this.edges[i2][2]);
    for (let ii = 0; ii < edge_ids.length; ii++) {
      let i = edge_ids[ii];
      if (dart_arc.has(i + 1)) {
        continue;
      }
      let circuit = this.dart_circuit(i + 1);
      if (circuit.every(d => this.dart_order(d) === 2)) {
        // then this is a loop
        let arc = next_arc_id++;
        pd.push(P.make(arc, arc));
        circuit.forEach(d => {
          dart_arc.set(d, arc);
          dart_arc.set(-d, arc);
        });
      } else {
        let j = 0;
        while (this.dart_order(circuit[j]) !== 4) {
          j++;
        }
        circuit = circuit.slice(j).concat(circuit.slice(0, j));
        // now the first dart is at a crossing.
        for (let k = circuit.length - 1; k >= 0; k--) {
          if (this.dart_order(circuit[k]) === 4) {
            let arc_darts = circuit.slice(k);
            circuit.length = k;
            let arc = next_arc_id++;
            arc_darts.forEach(d => {
              dart_arc.set(d, arc);
              dart_arc.set(-d, arc);
            });
          }
        }
      }
    }
    this.adjs.forEach(adj => {
      if (adj.length === 4) {
        if (!this.dart_oriented(adj[2])) {
          adj = adj.slice(2).concat(adj.slice(0, 2));
        }
        let arcs = adj.map(d => dart_arc.get(d));
        if (!oriented) {
          pd.push(X.make(...arcs));
        } else {
          if (this.dart_oriented(adj[1])) {
            pd.push(Xp.make(...arcs));
          } else {
            pd.push(Xm.make(...arcs));
          }
        }
      }
    });
    return pd;
  }
}
