import {assert, remove_value, toString, compare} from "./util.mjs";
import {Laurent, LTerm} from "./laurent.mjs";
import {Point, segments_intersect} from "./geom2d.mjs";
import {PD,P,X,Xp,Xm,Virtual} from "./pd.mjs";

export class KnotGraph {
  constructor(verts, edges, adjs) {
    this.verts = verts; // [Point,...]
    this.edges = edges; // [[vtx id, vtx id, comp],...]
    this.adjs = adjs; // [P or X,...] where the P and X objects contain dart ids
    // a dart is edgeid+1 or -edgeid-1 depending on which side the edge is
  }

  copy() {
    return new KnotGraph(
      this.verts.map(pt => pt.copy()),
      this.edges.map(edge => edge.slice()),
      this.adjs.map(list => list.slice())
    );
  }

  consistency_check() {
    console.log(this);
    assert(this.verts.length === this.adjs.length);
    assert(this.verts.every(p => p instanceof Point));
    assert(this.edges.every(e => e.length >= 3));
    assert(this.adjs.every(a => a instanceof P || a instanceof X || a instanceof Virtual));

    let seen_darts = new Set();
    this.adjs.forEach(adj => {
      adj.forEach(dart => {
        assert(dart !== 0);
        assert(Math.abs(dart) - 1 < this.edges.length);
        seen_darts.add(dart);
      });
    });
    assert(seen_darts.size === 2 * this.edges.length);

    this.edges.forEach((edge, eid) => {
      assert(0 <= edge[0] && edge[0] < this.verts.length);
      assert(0 <= edge[1] && edge[1] < this.verts.length);
      if (this.adjs[edge[0]].includes(eid + 1)) {
        assert(this.adjs[edge[1]].includes(-eid - 1));
      } else if (this.adjs[edge[0]].includes(-eid - 1)) {
        assert(this.adjs[edge[1]].includes(eid + 1));
      } else {
        assert(false);
      }
    });
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
    this.consistency_check();
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
    this.consistency_check();
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
            if (this.adjs[vid] instanceof X) {
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
    this.consistency_check();
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
          if (this.adjs[vid] instanceof X) {
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
        if (circ.every(d => this.dart_adj(d) instanceof P || this.dart_adj(d) instanceof Virtual)) {
          bridges++;
        } else {
          circ = circ.filter(d => this.dart_adj(d) instanceof X);
          let j = 0;
          while (j < circ.length && this.dart_is_over(circ[j])) {
            j++;
          }
          if (j === circ.length) {
            // this was an unknot on top of the diagram
            bridges++;
            continue;
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
        if (adj2.length === 2) {
          newadjs.push(P.make(...adj2));
        } else {
          newadjs.push(adj.constructor.make(...adj2));
        }
      }
    }
    this.verts = newverts;
    this.edges = newedges;
    this.adjs = newadjs;
    this.consistency_check();
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
  dart_adj(dart_id) {
    return this.adjs[this.dart_start(dart_id)];
  }
  dart_order(dart_id) {
    /* Takes a dart id and returns the number of incident darts at its vertex. */
    return this.dart_adj(dart_id).length;
  }
  dart_is_over(dart_id) {
    /* Assuming the dart id is for a dart at a crossing, gives whether the dart is part of the over-strand. */
    assert(typeof dart_id === "number");
    let adj = this.adjs[this.dart_start(dart_id)];
    assert(adj instanceof X);
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
  dart_face(dart_id) {
    /* Takes a dart id and returns the darts that comprise a face of the ribbon graph
       associated to the (virtual) knot diagram */
    let path = [];
    let d = dart_id;
    do {
      path.push(d);
      d = this.opp_dart(d);
      if (this.dart_adj(d) instanceof Virtual) {
        d = this.next_dart(this.next_dart(d));
      } else {
        d = this.next_dart(d);
      }
    } while (d !== dart_id);
    return path;
  }

  crossing_number() {
    let num = 0;
    this.adjs.forEach(a => {
      if (a instanceof X) {
        num++;
      }
    });
    return num;
  }

  virtual_crossing_number() {
    // the number of virtual crossings in this diagram
    let num = 0;
    this.adjs.forEach(a => {
      if (a instanceof Virtual) {
        num++;
      }
    });
    return num;
  }

  writhe() {
    /* Gives the total writhe of the diagram. */
    let wr = 0;
    this.adjs.forEach((a, vi) => {
      if (a instanceof X) {
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
      if (a instanceof P) {
        let c = this.dart_edge(a[0])[2];
        ensure_component(c);
      } else if (a instanceof Virtual) {
        let c1 = this.dart_edge(a[1])[2],
            c2 = this.dart_edge(a[2])[2];
        ensure_component(c1);
        ensure_component(c2);
      } else if (a instanceof X) {
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
      } else {
        assert(false);
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
      if (this.dart_adj(d) instanceof P) {
        d = this.next_dart(d);
      } else if (this.dart_adj(d) instanceof Virtual) {
        d = this.next_dart(this.next_dart(d));
      } else {
        assert(this.dart_adj(d) instanceof X);
        if (this.dart_oriented(d) === this.dart_oriented(this.next_dart(d))) {
          d = this.prev_dart(d);
        } else {
          d = this.next_dart(d);
        }
      }
    } while (d !== dart);
    return circuit;
  }

  genus() {
    /* The canonical Seifert genus of this particular diagram. For
       split diagrams, it is the sum of the genera of each component. */

    assert(this.virtual_genus() === 0);

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

  virtual_genus() {
    /* Gives the virtual genus of this particular diagram. Classical
       knot diagrams have virtual genus 0.  The virtual genus of a
       virtual knot is the minimum of the virtual genus of all
       diagrams. */
    let seen_darts = new Set();

    let nfaces = 0;
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      if (!seen_darts.has(edge_i + 1)) {
        nfaces++;
        this.dart_face(edge_i + 1).forEach(dart => seen_darts.add(dart));
      }
      if (!seen_darts.has(-edge_i - 1)) {
        nfaces++;
        this.dart_face(-edge_i - 1).forEach(dart => seen_darts.add(dart));
      }
    }
    return this.num_components() - (nfaces - this.crossing_number())/2;
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
        circuit = circuit.filter(d => this.dart_adj(d) instanceof X);
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
      if (this.dart_adj(edge_i + 1) instanceof X && seen_edges[edge_i] === -1) {
        matrices.push(visit_component(edge_i));
      }
    }
    // Will be missing trivial unknot diagram components
    for (let edge_i = 0; edge_i < this.edges.length; edge_i++) {
      let adj = this.dart_adj(edge_i + 1);
      if ((adj instanceof P || adj instanceof Virtual) && seen_edges[edge_i] === -1) {
        matrices.push([]);
        this.dart_circuit(edge_i + 1).forEach(dart => {
          seen_edges[Math.abs(dart) - 1] = true;
        });
      }
    }
    return matrices;
  }

  turaev() {
    /* Returns {genus:g, plus:p, minus:m} where g is the Turaev genus
       of the diagram and p and m are whether the diagram is
       plus-adequate and minus-adequate, respectively. */

    assert(this.virtual_genus() === 0);

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
            if (adj instanceof P) {
              d = this.next_dart(d);
            } else if (adj instanceof Virtual) {
              d = this.next_dart(this.next_dart(d));
            } else {
              assert(adj instanceof X);
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

       Chooses edge ids in ascending order of component. Makes sure a -> c is the orientation.
       If oriented=true, then Xr/Xl are used to determine the orientation of b--d.
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
      if (circuit.every(d => !(this.dart_adj(d) instanceof X))) {
        // then this is a loop
        let arc = next_arc_id++;
        pd.push(P.make(arc, arc));
        circuit.forEach(d => {
          dart_arc.set(d, arc);
          dart_arc.set(-d, arc);
        });
      } else {
        let j = 0;
        while (!(this.dart_adj(circuit[j]) instanceof X)) {
          j++;
        }
        circuit = circuit.slice(j).concat(circuit.slice(0, j));
        // now the first dart is at a crossing
        let arc_id = null;
        circuit.forEach(dart => {
          if (this.dart_adj(dart) instanceof X) {
            arc_id = next_arc_id++;
          }
          dart_arc.set(dart, arc_id);
          dart_arc.set(-dart, arc_id);
        });
      }
    }
    this.adjs.forEach(adj => {
      if (adj instanceof X) {
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

  get_dt() {
    /* If this is not a knot, return null.  Otherwise, return a
       Dowker-Thistlethwaite code for the knot. */
    if (this.num_components() !== 1 || this.virtual_genus() > 0) {
      return null;
    }
    let circuit = this.dart_circuit(1).filter(d => this.dart_adj(d) instanceof X);
    if (circuit.length === 0) {
      return [];
    }
    let n = circuit.length;

    let code_from = (k) => {
      let dart_crossing = new Map();
      circuit.forEach((d, i) => {
        dart_crossing.set(d, (i+n-k)%n);
      });
      let get_crossing = (dart) => {
        let i = dart_crossing.get(this.next_dart(dart));
        if (i === void 0) {
          i = dart_crossing.get(this.prev_dart(dart));
        }
        return i;
      };
      let code = [];
      for (let i = 0; i < circuit.length; i += 2) {
        let j = get_crossing(circuit[(i+k)%n]);
        if (this.dart_is_over(circuit[(i+k)%n])) {
          code.push(-j-1);
        } else {
          code.push(j+1);
        }
      }
      if (code[0] < 0) {
        for (let i = 0; i < code.length; i++) {
          code[i] = -code[i];
        }
      }
      return code;
    };

    let codes = [];
    for (let k = 0; k < circuit.length; k++) {
      codes.push(code_from(k));
    }
    circuit = this.dart_circuit(-1).filter(d => this.dart_adj(d) instanceof X);
    for (let k = 0; k < circuit.length; k++) {
      codes.push(code_from(k));
    }

    codes.sort(compare);

    return codes[0];
  }

  skeleton() {
    let parts = [];
    let loops = []; /* disconnected loops; array of component ids */
    let seen_edges = new Set;

    for (let teid = 0; teid < this.edges.length; teid++) {
      if (seen_edges.has(teid)) {
        continue;
      }

      let circuit = this.dart_circuit(teid + 1);

      if (circuit.every(d => this.dart_adj(d) instanceof P)) {
        loops.push(this.edges[teid][2]);
        circuit.forEach(d => seen_edges.add(Math.abs(d) - 1));
        continue;
      }

      let next_arc_id = 1;
      let edge_arcs = new Map; /* map from edge id to arc id for non-loops */
      let arc_comps = new Map; /* map from arc ids to component ids */
      let part_verts = new Set;

      let to_visit = [teid];
      while (to_visit.length > 0) {
        let eid = to_visit.pop();
        if (seen_edges.has(eid)) {
          continue;
        }

        let comp = this.edges[eid][2];
        let circuit = this.dart_circuit(eid + 1);

        // Combine edges into arcs

        let j = 0;
        while (this.dart_order(circuit[j]) !== 4) {
          j++;
        }
        circuit = circuit.slice(j).concat(circuit.slice(0, j));
        // ^ now the first dart is at a (virtual)crossing (i.e., is of order 4).
        let arc_id = null;
        circuit.forEach(dart => {
          if (this.dart_order(dart) === 4) {
            arc_id = next_arc_id++;
            arc_comps.set(arc_id, comp);
            // record that this vertex is in this part
            let vid = this.dart_edge(dart)[0];
            part_verts.add(vid);
            // add other edges at vertex to to_visit
            this.adjs[vid].forEach(d => {
              let e = Math.abs(d) - 1;
              if (!seen_edges.has(e)) {
                to_visit.push(e);
              }
            });
          }
          edge_arcs.set(Math.abs(dart) - 1, arc_id);
          seen_edges.add(Math.abs(dart) - 1);
        });
      }

      // Construct vertex lists
      let verts = [];
      part_verts.forEach(vid => {
        let adj = this.adjs[vid].map(d => {
          let arc_id = edge_arcs.get(Math.abs(d) - 1);
          if (d > 0) {
            return arc_id;
          } else {
            return -arc_id;
          }
        });
        for (let i = 0; i < adj.length; i++) {
          if (adj[i] < 0 &&
              (adj[i] === -adj[(i + 1) % adj.length]
               || adj[i] === -adj[(i + adj.length - 1) % adj.length])) {
            // Reidemeister I loop.
            // Add in an extra degree-2 vertex so that the graph has no loop edges
            let arc_id = -adj[i];
            let arc_id2 = next_arc_id++;
            verts.push(P.make(arc_id2, -arc_id));
            adj[i] = -arc_id2;
            if (arc_comps.has(arc_id)) {
              arc_comps.set(arc_id2, arc_comps.get(arc_id));
            } else {
              arc_comps.set(-arc_id2, arc_comps.get(-arc_id));
            }
          }
        }
        verts.push(adj);
      });
      parts.push({
        // A list of dart lists
        verts: verts,
        // A description of how the vertex arose ("" is default)
        vert_types: verts.map(v => ""),
        // A list of vertices for the knot; these are lists of darts
        knot: verts,
        // A map from darts for the knot to components. Only includes darts that match the knot's orientation.
        comps: arc_comps
      });
    }
    return {
      // A list components.  There is one loop per entry
      loops: loops,
      parts: parts
    };
  }

  beautify() {
    /* Re-embed using the Tutte embedding of a barycentric subdivision. */

    function barycentric(skel, medial=false) {
      /* When medial is true, do the medial subdivision rather than the barycentric subdivision. */
      function face_darts(dart) {
        let darts = [];
        let curr_dart = dart;
        face_loop:
        while (true) {
          for (let vid = 0; vid < skel.verts.length; vid++) {
            let idx = skel.verts[vid].indexOf(-curr_dart);
            if (idx !== -1) {
              curr_dart = skel.verts[vid][(idx + skel.verts[vid].length - 1) % skel.verts[vid].length];
              darts.push(curr_dart);
              if (curr_dart === dart) {
                break face_loop;
              } else {
                continue face_loop;
              }
            }
          }
          throw new Error;
        }
        return darts;
      }
      function face_dart(dart) {
        // Get a representative dart for the face
        return Math.min(...face_darts(dart));
      }

      var fresh_dart = 1;
      var darts = new Map;
      function vert_key(vid) {
        return "[v " + vid + "]";
      }
      function edge_key(dart) {
        return "[e " + Math.abs(dart) + "]";
      }
      function face_key(dart) {
        return "[f " + face_dart(dart) + "]";
      }
      function dart_for(key) {
        if (!darts.has(key)) {
          darts.set(key, fresh_dart++);
        }
        return darts.get(key);
      }

      let dart_remap = new Map;
      let dart_remap_over_edge = new Map;

      let verts = [];
      let vert_types = [];
      // vertices
      skel.verts.forEach((vert, vid) => {
        let new_vert = [];
        vert.forEach((dart, i) => {
          new_vert.push(dart_for(vert_key(vid) + edge_key(dart)));
          dart_remap.set(dart, dart_for(vert_key(vid) + edge_key(dart)));
          if (!medial) {
            new_vert.push(dart_for(vert_key(vid) + i + face_key(dart)));
          }
        });
        verts.push(new_vert);
        vert_types.push(skel.vert_types[vid] + "v");
      });
      // edges
      skel.verts.forEach((vert, vid) => {
        vert.forEach((dart, i) => {
          if (dart < 0) return;
          let new_vert = [];
          new_vert.push(dart_for(edge_key(dart) + face_key(dart)));
          new_vert.push(-dart_for(vert_key(vid) + edge_key(dart)));
          dart_remap_over_edge.set(-dart, -dart_for(vert_key(vid) + edge_key(dart)));
          for (let vid = 0; vid < skel.verts.length; vid++) {
            let idx = skel.verts[vid].indexOf(-dart);
            if (idx != -1) {
              new_vert.push(dart_for(edge_key(dart) + face_key(-dart)));
              new_vert.push(-dart_for(vert_key(vid) + edge_key(dart)));
              dart_remap_over_edge.set(dart, -dart_for(vert_key(vid) + edge_key(dart)));
              verts.push(new_vert);
              vert_types.push("e");
              return;
            }
          }
          throw new Error;
        });
      });
      // faces
      let seen_faces = new Set;
      skel.verts.forEach(vert => {
        vert.forEach(dart => {
          let face = face_dart(dart);
          if (seen_faces.has(face)) {
            return;
          }
          seen_faces.add(face);
          let new_vert = [];
          face_darts(dart).forEach(dart => {
            // `dart` ranges over darts in face `face`.
            if (!medial) {
              for (let vid = 0; vid < skel.verts.length; vid++) {
                let i = skel.verts[vid].indexOf(dart);
                if (i !== -1) {
                  new_vert.push(-dart_for(vert_key(vid) + i + face_key(face)));
                  break;
                }
              }
            }
            new_vert.push(-dart_for(edge_key(dart) + face_key(face)));
          });
          verts.push(new_vert);
          vert_types.push("f");
        });
      });

      let new_knot = skel.knot.map(p => p.map(d => dart_remap.get(d)));
      let new_comps = new Map;
      skel.comps.forEach((comp, d) => {
        let d1 = dart_remap.get(d);
        let d2 = dart_remap_over_edge.get(d);
        new_comps.set(d1, comp);
        new_comps.set(d2, comp);
        new_knot.push(P.make(-d1, d2));
      });

      { // check that verts is well-formed
        let darts = new Set;
        verts.forEach(adj => adj.forEach(d => {
          assert(!darts.has(d));
          darts.add(d);
        }));
        darts.forEach(d => {
          assert(darts.has(-d));
        });
        new_knot.forEach(adj => {
          assert(adj instanceof P || adj instanceof X || adj instanceof Virtual);
        });
      }

      return {
        verts: verts,
        vert_types: vert_types,
        knot: new_knot,
        comps: new_comps
      };
    }

    let skel = this.skeleton();
    console.log(skel);

    this.verts = [];
    this.edges = [];
    this.adjs = [];

    let num_parts = skel.loops.length + skel.parts.length;
    let cols = Math.ceil(Math.sqrt(num_parts));
    let row = 0;
    let col = 0;

    // Draw the unknot parts
    skel.loops.forEach(comp => {
      let cx = 800 / cols * (col + 0.5);
      let cy = 800 / cols * (row + 0.5);
      let r = 0.8 * 800 / cols / 2;

      const SUBDIV = 30;
      let vids = [];
      for (let i = 0; i < SUBDIV; i++) {
        let vid = this.verts.length;
        this.verts.push(new Point(cx + r * Math.cos(2 * Math.PI * i / SUBDIV),
                                  cy - r * Math.sin(2 * Math.PI * i / SUBDIV)));
        vids.push(vid);
      }
      let edges = [];
      for (let i = 0; i < SUBDIV; i++) {
        let eid = this.edges.length;
        this.edges.push([vids[i], vids[(i + 1) % SUBDIV], comp]);
        edges.push(eid);
      }
      for (let i = 0; i < SUBDIV; i++) {
        this.adjs.push(P.make(edges[i] + 1,
                              -edges[(i + SUBDIV - 1) % SUBDIV] - 1));
      }

      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    });

    // Draw the knotted parts
    skel.parts.forEach(part => {
      let cx = 800 / cols * (col + 0.5);
      let cy = 800 / cols * (row + 0.5);
      let r = 0.8 * 800 / cols / 2;

      const FACE_VERT_TYPE = "fvv";
      //console.log(part);
      part = barycentric(part, true);
      //console.log(part);
      part = barycentric(part, true);
      part = barycentric(part, true);
      console.log(part);
      //const FACE_VERT_TYPE = "fvv";
      //part = barycentric(barycentric(barycentric(part)));

      // locate best outside face.
      let outside = null;
      let max_degree = 0;
      part.verts.forEach((vert, vid) => {
        if (part.vert_types[vid] == FACE_VERT_TYPE && max_degree < vert.length) {
          max_degree = vert.length;
          outside = vid;
        }
      });
      console.log("best: " + outside);

      let vid_of_dart = new Map;
      part.verts.forEach((vert, vid) => {
        vert.forEach(dart => {
          vid_of_dart.set(dart, vid);
        });
      });

      function row_reduce(matrix) {
        let rows = matrix.length,
            cols = matrix[0].length;
        let i = 0, j = 0; // current pivot
        while (i < rows && j < cols) {
          let besti = i;
          for (let k = i + 1; k < rows; k++) {
            if (Math.abs(matrix[k][j]) > Math.abs(matrix[besti][j])) {
              besti = k;
            }
          }
          if (besti !== i) {
            [matrix[i], matrix[besti]] = [matrix[besti], matrix[i]];
          }
          if (matrix[i][j] === 0) {
            j++;
            continue;
          }
          let c = matrix[i][j];
          matrix[i] = matrix[i].map(v => v / c);
          for (let k = 0; k < rows; k++) {
            if (k !== i) {
              c = matrix[k][j];
              matrix[k][j] = 0;
              for (let l = j + 1; l < cols; l++) {
                matrix[k][l] -= c * matrix[i][l];
              }
            }
          }
          i++;
          j++;
        }
      }

      let matrixx = [];
      let matrixy = [];
      let is_fixed = new Set;
      part.verts[outside].forEach((dart, i) => {
        let vid = vid_of_dart.get(-dart);
        is_fixed.add(vid);
        let rowx = new Array(part.verts.length+1).fill(0);
        rowx[vid] = 1;
        rowx[part.verts.length] = Math.cos(2 * Math.PI * i / max_degree);
        let rowy = new Array(part.verts.length+1).fill(0);
        rowy[vid] = 1;
        rowy[part.verts.length] = Math.sin(2 * Math.PI * i / max_degree);
        matrixx.push(rowx);
        matrixy.push(rowy);
      });

      part.verts.forEach((vert, vid) => {
        if (vid === outside || is_fixed.has(vid)) {
          return;
        }
        let rowx = new Array(part.verts.length+1).fill(0);
        vert.forEach(dart => {
          let vid2 = vid_of_dart.get(-dart);
          rowx[vid2] += 1;
          rowx[vid] -= 1;
        });
        matrixx.push(rowx);
        matrixy.push(rowx.slice());
      });

      //console.log("{" + matrixx.map(row => "{" + row.join(",") + "}").join(",") + "}");
      //console.log("{" + matrixy.map(row => "{" + row.join(",") + "}").join(",") + "}");

      row_reduce(matrixx);
      row_reduce(matrixy);

      function vid_point(vid) {
        if (vid < outside) {
          assert(matrixx[vid][vid] === 1);
          assert(matrixy[vid][vid] === 1);
          return new Point(matrixx[vid][part.verts.length], matrixy[vid][part.verts.length]);
        } else if (vid === outside) {
          throw new Error;
        } else {
          assert(matrixx[vid - 1][vid] === 1);
          assert(matrixy[vid - 1][vid] === 1);
          return new Point(matrixx[vid - 1][part.verts.length], matrixy[vid - 1][part.verts.length]);
        }
      }

      var points = [];
      part.knot.forEach(p => {
        points.push(vid_point(vid_of_dart.get(p[0])));
      });
      let minx = 1e10, maxx = -1e10,
          miny = 1e10, maxy = -1e10;
      points.forEach(pt => {
        minx = Math.min(minx, pt.x);
        maxx = Math.max(maxx, pt.x);
        miny = Math.min(miny, pt.y);
        maxy = Math.max(maxy, pt.y);
      });
      points.forEach(pt => {
        let x = pt.x - (minx + maxx)/2,
            y = pt.y - (miny + maxy)/2;
        let scale = Math.max(maxx - minx, maxy - miny)/2;
        pt.x = cx + x/scale * r;
        pt.y = cy + y/scale * r;
      });

      let vids = [];
      points.forEach(pt => {
        let vid = this.verts.length;
        this.verts.push(pt);
        vids.push(vid);
      });
      let knot_vid_of_dart = new Map;
      part.knot.forEach((vert, vid) => {
        vert.forEach(dart => {
          knot_vid_of_dart.set(dart, vid);
        });
      });
      let edges = new Map;
      part.comps.forEach((comp, d) => {
        let eid = this.edges.length;
        edges.set(d, eid);
        this.edges.push([
          vids[knot_vid_of_dart.get(d)],
          vids[knot_vid_of_dart.get(-d)],
          comp
        ]);
      });
      part.knot.forEach((adj, knot_vid) => {
        this.adjs.push(adj.map(d => {
          if (edges.has(d)) {
            return edges.get(d) + 1;
          } else {
            return -1-edges.get(-d);
          }
        }));
      });

      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    });

    console.log(this);
    this.consistency_check();

  }
}
