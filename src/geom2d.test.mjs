import {assert, assert_fails, test, equal, toString, clamp} from "./util.mjs";
import * as geom2d from "./geom2d.mjs";
import {Point} from "./geom2d.mjs";

test("pseudo_angle", () => {
  let angles = [];
  for (let theta = 0; theta < 2*Math.PI; theta += 0.1) {
    angles.push(geom2d.pseudo_angle(new Point(0, 0), new Point(Math.cos(theta), Math.sin(theta))));
  }
  for (let i = 0; i + 1 < angles.length; i++) {
    assert(angles[i] < angles[i + 1]);
  }
});

test("segment_contains", () => {
  let p1 = new Point(1, 2),
      p2 = new Point(4, 5);
  for (let t = -0.2; t < 1.2; t += 0.1) {
    assert((clamp(t, 0, 1) === t) === geom2d.segment_contains(p1, p2, geom2d.point_along(p1, p2, t)));
  }
  assert(geom2d.segment_contains(p1, p2, p1));
  assert(geom2d.segment_contains(p1, p2, p2));
});

function fake_gaussian_random() {
  function unif() {
    return 2*Math.random() - 1;
  }
  return (unif() + unif() + unif() + unif() + unif()) / 5;
}
function random_nonzero_s1_point() {
  while (true) {
    let x = fake_gaussian_random(),
        y = fake_gaussian_random();
    if (x !== 0 && y !== 0) {
      let norm = Math.sqrt(x*x+y*y);
      return new Point(x / norm, y / norm);
    }
  }
}

test("segments_intersect interlaced", () => {
  let origin = new Point(0, 0);
  for (let i = 0; i < 1000; i++) {
    let points = [random_nonzero_s1_point(),
                  random_nonzero_s1_point(),
                  random_nonzero_s1_point(),
                  random_nonzero_s1_point()];
    points.sort((p,q) => geom2d.pseudo_angle(origin, p) - geom2d.pseudo_angle(origin, q));
    let [p1, p2, p3, p4] = points;
    if (Point.equal(p1, p2) || Point.equal(p2, p3) || Point.equal(p3, p4)) {
      continue;
    }

    try {
      // check by interlacement
      assert(!geom2d.segments_intersect(p1, p2, p3, p4));
      assert(geom2d.segments_intersect(p1, p3, p2, p4));
      assert(!geom2d.segments_intersect(p1, p4, p2, p3));

      // now in some other orders, just to check
      assert(!geom2d.segments_intersect(p3, p4, p2, p1));
      assert(geom2d.segments_intersect(p4, p2, p1, p3));
      assert(!geom2d.segments_intersect(p2, p3, p1, p4));
    } catch (x) {
      console.log("Offending configuration: " + toString(points));
      console.log(points.map(pt => geom2d.pseudo_angle(origin, pt)));
      throw x;
    }
  }
});

test("segments_intersect endpoints (previous counterexample)", () => {
  let [p1, p2, p3] = [new Point(-0.6337710825938722, -0.7735206622112891), new Point(0.7122058417776204, 0.7019706823919579), new Point(-0.24380020544874903, 0.9698254790544265)];
  assert(geom2d.segments_intersect(p1, p3, p2, p3));
  assert(geom2d.segments_intersect(p3, p1, p3, p2));
  assert(geom2d.segments_intersect(p2, p3, p1, p3));
});

test("segments_intersect endpoints", () => {
  for (let i = 0; i < 1000; i++) {
    let [p1, p2, p3] = [random_nonzero_s1_point(),
                        random_nonzero_s1_point(),
                        random_nonzero_s1_point()];
    try {
      assert(geom2d.segments_intersect(p1, p2, p2, p3));
      assert(geom2d.segments_intersect(p1, p2, p3, p2));
      assert(geom2d.segments_intersect(p2, p3, p1, p2));
      assert(geom2d.segments_intersect(p2, p3, p1, p3));
    } catch (x) {
      console.log("Offending configuration: " + toString([p1, p2, p3]));
      throw x;
    }
  }
});
