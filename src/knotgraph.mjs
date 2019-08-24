import {assert, remove_value, toString} from "./util.mjs";
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
    /* Returns whether this is an alternating diagram.  Assumes the diagram is oriented. */
    let seen_edges = [];
    for (let eid = 0; eid < this.edges.length; eid++) {
      if (!seen_edges[eid]) {
        let sign = null;
        let circ = this.dart_circuit(eid + 1);
        for (let di = 0; di < circ.length; di++) {
          let dart = circ[di];
          seen_edges[Math.abs(dart) - 1] = true;
          let vid = this.dart_start(dart);
          let this_sign = this.adjs[vid].indexOf(dart) % 2 === 0;
          if (this.adjs[vid].length === 4) {
            if (sign === this_sign) {
              // Not alternating
              return false;
            }
            sign = this_sign;
          }
        }
      }
    }
    return true;
  }

  bridge_number() {
    /* Returns the bridge number (in the classical sense: the number
       of arcs that are everywhere-over) of the diagram.  Assumes the
       diagram is oriented. Split unknotted loops have bridge number 1. */
    let seen_edges = [];
    let bridges = 0;
    for (let eid = 0; eid < this.edges.length; eid++) {
      if (!seen_edges[eid]) {
        let dart = eid + 1;
        let circ = this.dart_circuit(eid + 1);
        circ.forEach(d => {
          seen_edges[Math.abs(d) - 1] = true;
        });
        if (circ.every(d => this.dart_order(d) === 2)) {
          bridges++;
        } else {
          circ = circ.filter(d => this.dart_order(d) === 4);
          let j = 0;
          while (this.dart_is_over(circ[j])) {
            j++;
          }
          for (let i = 0; i < circ.length;) {
            let k = (i + j) % circ.length;
            assert(!this.dart_is_over(circ[k]));
            let cr = 0;
            while(true) {
              i++;
              k = (i + j) % circ.length;
              if (!this.dart_is_over(circ[k])) {
                break;
              }
              cr++;
            }
            if (cr > 0) {
              bridges++;
            }
          }
        }
      }
    }
    return bridges;
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

  seifert_circuit(dart) {
    /* Gives the Seifert circuit through the dart. */
    let circuit = [];
    let d = dart;
    do {
      circuit.push(d);
      d = this.opp_dart(d);
      // the following works whether adj.length is 2 or 4
      if (this.dart_oriented(d) === this.dart_oriented(this.next_dart(d))) {
        d = this.prev_dart(d);
      } else {
        d = this.next_dart(d);
      }
    } while (d !== dart);
    return circuit;
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
        this.seifert_circuit(dart).forEach(d => {
          to_see.push(...this.adjs[this.dart_start(d)]);
          seen_darts.add(d);
          seen_darts.add(this.opp_dart(d));
        });
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

  seifert_form() {
    /* Gives the Seifert linking form of the diagram with respect to
       some basis.  This is represented as [matrix, matrix, ...] with
       one matrix per connected component of the diagram, where
       together these form a block diagonal matrix. It should be
       understood that the full linking form has in additional c-1
       extra 0's on the diagonal (where c is the number of diagram
       components), since a Seifert surface should be connected. */

    let seen_edges = new Array(this.edges.length); // contains corresp. circuit ids
    seen_edges.fill(-1);
    let next_circuit_id = 0;
    function circuit_id(edge_id) {
      if (seen_edges[edge_id] === -1) {
        return (seen_edges[edge_id] = next_circuit_id++);
      } else {
        return seen_edges[edge_id];
      }
    }

    let visit_component = (start_edge) => {

      // the first part is constructing a Seifert surface for this component.
      // the meaning of circuits and twists will be described after it is constructed

      let to_see = [start_edge]; // [edge_id, ...]

      let circuits = new Map();
      let twists = [];

      function twist_id(edge1, edge2, x) {
        for (let i = 0; i < twists.length; i++) {
          let tw = twists[i];
          if (tw[1] === edge1 && tw[2] === edge2) {
            assert(x === tw[3]);
            return tw[0];
          }
        }
        let id = twists.length;
        twists.push([id, edge1, edge2, x]);
        return id;
      }

      while (to_see.length > 0) {
        let eid = to_see.pop();
        if (seen_edges[eid] !== -1) {
          continue;
        }
        let circ_id = circuit_id(eid);
        let circuit = this.seifert_circuit(eid + 1);
        circuit.forEach(d => {
          assert(d > 0);
          seen_edges[d - 1] = circ_id;
        });
        circuit = circuit.filter(d => this.dart_order(d) === 4);
        let circuit_adj = [];
        circuits.set(circ_id, circuit_adj);
        circuit.forEach(d => {
          let eid1 = d - 1;
          let adj = this.adjs[this.dart_start(d)];
          let i = adj.indexOf(d);
          let eid2, x, front;
          if (this.dart_oriented(this.next_dart(d))) {
            eid2 = this.next_dart(d) - 1;
            x = 1 - 2 * (i % 2);
            front = false;
          } else {
            eid2 = this.prev_dart(d) - 1;
            x = 2 * (i % 2) - 1;
            front = true;
          }
          assert(eid2 >= 0);
          to_see.push(eid2);
          if (front) {
            let tw = twist_id(eid1, eid2, x);
            circuit_adj.push(tw+1);
          } else {
            let tw = twist_id(eid2, eid1, x);
            circuit_adj.push(-tw-1);
          }
        });
      }

      // replace edge ids with the correct circuit ids
      twists.forEach(twist => {
        twist[1] = seen_edges[twist[1]];
        twist[2] = seen_edges[twist[2]];
      });

      // Consider an oriented ribbon graph in upper half space that is
      // sort-of-planar in the following way.  Each vertex is an
      // oriented rectangular strip that is perpendicularly incident
      // along the long side to the boundary plane, and along this
      // side, edge strips meet it either in the front or the back
      // with respect to its orientation.  Then, since this is a
      // Seifert surface from Seifert's algorithm, edges have a half
      // twist somewhere along their length; this means edges meet one
      // vertex in the front and one vertex in the back, to preserve
      // orientation.
      //
      // We represent this as follows.
      //
      // The vertices are stored in
      //    circuits : circ_id => [dart, ...]
      // where a dart is eid + 1 or -eid - 1 depending on whether the
      // edge is incident to the front or the back of the vertex.  The
      // orientation of the vertex is given by the convention in the
      // following picture:
      //
      //  back   front
      //       ^
      //       |-- d4
      //  d3 --|
      //  d2 --|
      //       |-- d1
      //       |-- d0
      //       |
      //    vertex
      //
      // Edges are stored in
      //    twists : list of [eid, circ_id1, circ_id2, x:{-1,1}]
      // where the twist is in front of circ_id1 and behind circ_id2,
      // and where x is the sign of the twist.
      //
      // What hasn't been explained is exactly why this is the result
      // of Seifert's algorithm.  Here is what to imagine: we have
      // "cut" each Seifert circuit by isotoping a small interval of
      // the Seifert disk away from the plane of the diagram.  That
      // is, each circuit represents an oriented rectangle with one
      // edge embedded in the plane of the diagram, and each ribbon is
      // attached somewhere along the length of this edge.
      //
      // (This is a reason why Seifert graphs are planar as abstract
      // graphs.)


      // Now we compute a basis for H_1, represented by the edges in cross_edges

      if (0) {
        circuits = new Map;
        circuits.set(0, [-1, -2]);
        circuits.set(1, [2, -3, 1, -4]);
        circuits.set(2, [4, 3]);
        twists = [[0, 1, 0, -1], [1, 1, 0, -1], [2, 2, 1, 1], [3, 2, 1, 1]];
      }

      let tree = new Map; // circuit_id -> (dart_id | null).  null means root
      tree.set(twists[0][1], null);
      let to_visit = twists.slice();
      let cross_edges = [];
      while (to_visit.length > 0) {
        let twist;
        for (let i = 0; i < to_visit.length; i++) {
          twist = to_visit[i];
          if (tree.has(twist[1]) || tree.has(twist[2])) {
            to_visit.splice(i, 1);
            break;
          }
        }
        assert(twist);
        if (tree.has(twist[1]) && tree.has(twist[2])) {
          cross_edges.push(twist);
        } else if (tree.has(twist[1])) {
          tree.set(twist[2], -twist[0]-1);
        } else {
          tree.set(twist[1], twist[0]+1);
        }
      }

      // Next is to compute the cycles corresponding to the cross_edge
      // representations, and then to convert this into a form that is
      // convenient for computing the Seifert pairing.

      function find_twist(id) {
        for (let i = 0; i < twists.length; i++) {
          if (twists[i][0] === id) {
            return twists[i];
          }
        }
        return assert(false);
      }

      function cycle(cross_edge) {
        // path is [[same_orientation, edge], ...] for the cycle
        let path = [[true, cross_edge]];
        let cid;
        cid = cross_edge[1];
        while (tree.get(cid) !== null) {
          let dart = tree.get(cid);
          let twist = find_twist(Math.abs(dart) - 1);
          path.unshift([dart < 0, twist]);
          cid = twist[1 + (dart > 0)];
        }
        cid = cross_edge[2];
        while (tree.get(cid) !== null) {
          let dart = tree.get(cid);
          let twist = find_twist(Math.abs(dart) - 1);
          path.push([dart > 0, twist]);
          cid = twist[1 + (dart > 0)];
        }
        // remove backtracking from the tree part
        while (path[0][1][0] === path[path.length-1][1][0]) {
          path.pop();
          path.shift();
        }
        // now all edge ids are distinct
        return path;
      }

      //cross_edges.forEach(ce => console.log(toString(cycle(ce))));
      
      function make_vector(cycle) {
        // the cycle is as in the output of cycle()
        let edges = []; // list of [eid, x, oriented]
        let verts = []; // list of [vid, from_idx, front, to_idx, front]
        for (let i = 0; i < cycle.length; i++) {
          let [ori1, edge1] = cycle[i],
              [ori2, edge2] = cycle[(i+1) % cycle.length];
          edges.push([edge1[0], edge1[3], ori1]);

          let vtx = edge1[1 + ori1];
          let adj = circuits.get(vtx);
          let dart1 = ori1 ? -edge1[0]-1 : edge1[0]+1,
              dart2 = ori2 ? edge2[0]+1 : -edge2[0]-1;
          let from = adj.indexOf(dart1),
              to = adj.indexOf(dart2);
          assert(from !== -1 && to !== -1);
          verts.push([vtx, from, dart1 > 0, to, dart2 > 0]);
        }
        return {edges:edges, verts:verts};
      }

      //cross_edges.forEach(ce => console.log(make_vector(cycle(ce))));

      function linking(vect1, vect2) {
        // vect2 is pushed off
        // count linking of vect2 over vect1
        let link = 0;
        vect1.edges.forEach(edge1 => {
          let [eid, x, ori1] = edge1;
          vect2.edges.forEach(edge2 => {
            if (eid === edge2[0]) {
              let ori2 = edge2[2];
              if (x > 0) {
                link += 2 * (ori1 === ori2) - 1;
              }
            }
          });
        });
        vect1.verts.forEach(vert1 => {
          let [vtx, from1, from1_front, to1, to1_front] = vert1;
          vect2.verts.forEach(vert2 => {
            if (vtx === vert2[0]) {
              let [_, from2, from2_front, to2, to2_front] = vert2;

              let ori1 = 1;
              if (from1 > to1) {
                ori1 = -1;
                [from1, from1_front, to1, to1_front] = [to1, to1_front, from1, from1_front];
              }
              let ori2 = 1;
              if (from2 > to2) {
                ori2 = -1;
                [from2, from2_front, to2, to2_front] = [to2, to2_front, from2, from2_front];
              }

              if (from1_front && (from2 < from1 && from1 <= to2)) {
                link += ori1 * ori2;
              }
              if (to1_front && (from2 < to1 && to1 <= to2)) {
                link -= ori1 * ori2;
              }
            }
          });
        });
        return link;
      }

      let vecs = cross_edges.map(ce => make_vector(cycle(ce)));

      let matrix = vecs.map(v1 => vecs.map(v2 => linking(v1, v2)));
      console.log(toString(matrix));

      return matrix;
    };


    let matrices = [];
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (this.dart_order(edge_i + 1) === 4 && seen_edges[edge_i] === -1) {
        matrices.push(visit_component(edge_i));
      }
    }
    return matrices;
  }

  turaev() {
    /* Returns {genus:g, plus:p, minus:m} where g is the Turaev genus
       of the diagram and p and m are whether the diagram is
       plus-adequate and minus-adequate, respectively. */

    let seen_darts = new Set();

    let b_0 = 0;
    let n_faces = 0;
    let plus = true, // still plus-adequate
        minus = true; // still minus-adequate
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (!seen_darts.has(edge_i + 1)) {
        b_0++;

        let to_see = [[edge_i + 1, false]]; // [[dart, is_black], ...]
        while (to_see.length > 0) {
          let [dart, is_black] = to_see.pop();
          if (seen_darts.has(dart)) {
            continue;
          }
          n_faces++;
          // walk the Turaev face corresponding to the dart
          let face_fringe = new Set();
          let d = dart;
          do {
            if (face_fringe.has(d)) {
              if (is_black) {
                plus = false;
              } else {
                minus = false;
              }
            }

            {
              // Add adjacent darts to to_see, using checkerboard coloring
              let color = is_black;
              let adj_d = d;
              do {
                color = !color;
                adj_d = this.next_dart(adj_d);
                to_see.push([adj_d, color]);
              } while (d !== adj_d);
            }
            seen_darts.add(d);
            d = this.opp_dart(d);
            let adj = this.adjs[this.dart_start(d)];
            if (adj.length === 2) {
              d = this.next_dart(d);
            } else {
              if ((adj.indexOf(d) % 2 === 0) === is_black) {
                d = this.next_dart(d);
              } else {
                d = this.prev_dart(d);
              }

              adj.forEach(adj_d => {
                if (d !== adj_d) {
                  face_fringe.add(adj_d);
                  face_fringe.add(this.opp_dart(adj_d));
                }
              });
            }
          } while (d !== dart);
        }
      }
    }
    return {genus: b_0 + (this.crossing_number() - n_faces)/2,
            plus: plus,
            minus: minus};
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
