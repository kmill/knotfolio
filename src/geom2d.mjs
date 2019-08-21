import {assert} from "./util.mjs";

export class Point {
  /* A point in two-dimensional Euclidean space. */
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
  copy() {
    return new Point(this.x, this.y);
  }
  toString() {
    return "new Point(" + this.x + ", " + this.y + ")";
  }

  static equal(p1, p2) {
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    return p1.x === p2.x && p1.y === p2.y;
  }

  static similar(p1, p2, error=1e-10) {
    /* Checks to see if the points are close to each other, within the
       given error in each coordinate. */
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    return Math.abs(p1.x - p2.x) < error && Math.abs(p1.y - p2.y) < error;
  }

  static dist(p1, p2) {
    /* Returns the distance between p1 and p2. */
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    var dx = p1.x - p2.x,
        dy = p1.y - p2.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  static norm_diff(p1, p2) {
    /* Gives p1 - p2, normalized.  Returns a point even though it
    should return a vector. Assumes the points are distinct. */
    assert(p1 instanceof Point);
    assert(p2 instanceof Point);
    let dx = p1.x - p2.x,
        dy = p1.y - p2.y;
    let norm = Math.sqrt(dx*dx + dy*dy);
    assert(norm > 0);
    return new Point(dx/norm, dy/norm);
  }
}

export function calculate_angle(p0, p1, p2) {
  /* Given segments (p0, p1) and (p0, p2), calculates the angle from p1 to p2. Returns an angle in (-pi,pi].*/
  assert(p0 instanceof Point);
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  let vx = p1.x - p0.x,
      vy = p1.y - p0.y,
      wx = p2.x - p0.x,
      wy = p2.y - p0.y;
  // Put w into the orthogonal frame given by v
  let vnorm = Math.sqrt(vx * vx + vy * vy);
  let x = (vx*wx + vy*wy)/vnorm,
      y = (-vy*wx + vx*wy)/vnorm;
  return Math.atan2(y, x);
}

export function pseudo_angle(p0, p1) {
  /* Takes the ray from p0 through p1 and gives an "angle" with respect to the x-axis.  The "angle" is a monotonically increasing function of angle, and it lies in [0,1). */
  // Modified from delaunator.js
  let dx = p1.x - p0.x,
      dy = p1.y - p0.y;
  let p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy >= 0 ? 1 - p : 3 + p) / 4;
}

export function segment_contains_old(p1, p2, q, error=1e-10) {
  /* Checks if the line segment (p1,p2) contains the point q. Returns a boolean. */
  assert(!(Point.equal(p1, p2)));
  assert(q instanceof Point);
  let vx = p2.x - p1.x,
      vy = p2.y - p1.y;
  let wx = q.x - p1.x,
      wy = q.y - p1.y;
  let det = -vy*wx + vx*wy;
  if (Math.abs(det) <= error) {
    let t = (vx*wx + vy*wy) / (vx*vx + vy*vy);
    return 0 <= t && t <= 1;
  } else {
    return false;
  }
}

export function segment_contains(p1, p2, q, error=1e-10) {
  return segment_distance(p1, p2, q) <= error;
}

export function segment_distance(p1, p2, q) {
  /* Gives the distance from q to the line segment (p1, p2). */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  assert(q instanceof Point);
  if (Point.equal(p1, p2)) {
    return Point.dist(p1, q);
  }
  let vx = p2.x - p1.x,
      vy = p2.y - p1.y;
  let wx = q.x - p1.x,
      wy = q.y - p1.y;
  let norm2 = vx*vx + vy*vy;
  let t = (vx*wx + vy*wy)/norm2;
  if (t < 0) {
    return Point.dist(q, p1);
  } else if (t > 1) {
    return Point.dist(q, p2);
  } else {
    return Math.abs((-vy*wx + vx*wy)/Math.sqrt(norm2));
  }
}

export function segments_intersect_old(p1, p2, q1, q2) {
  /* Checks if the line segments (p1,p2) and (q1,q2) intersect.
     Returns the intersection point if they do intersect. */

  // Thanks to Josh Horowitz, from his Knot Identification Tool
  // https://github.com/joshuahhh/knot-identification-tool/
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  assert(q1 instanceof Point);
  assert(q2 instanceof Point);

  if (Point.equal(p1, q1) || Point.equal(p1, q2)) {
    return p1;
  } else if (Point.equal(p2, q1) || Point.equal(p2, q2)) {
    return p2;
  }

  let det = (p1.x-p2.x)*(q1.y-q2.y)-(p1.y-p2.y)*(q1.x-q2.x);
  if (det === 0) {
    return null;
  }
  let xi = ((p1.x*p2.y-p1.y*p2.x)*(q1.x-q2.x)-(p1.x-p2.x)*(q1.x*q2.y-q1.y*q2.x))/det;
  if (((p1.x <= xi && xi <= p2.x) || (p2.x <= xi && xi <= p1.x)) &&
      ((q1.x <= xi && xi <= q2.x) || (q2.x <= xi && xi <= q1.x))) {
    let yi = ((p1.x*p2.y-p1.y*p2.x)*(q1.y-q2.y)-(p1.y-p2.y)*(q1.x*q2.y-q1.y*q2.x))/det;
    if (((p1.y <= yi && yi <= p2.y) || (p2.y <= yi && yi <= p1.y)) &&
        ((q1.y <= yi && yi <= q2.y) || (q2.y <= yi && yi <= q1.y))) {
      return new Point(xi, yi);
    }
  }
  return null;
}

export function lines_intersect(p1, p2, q1, q2) {
  /* Checks if the lines given by the segments (p1,p2) and (q1,q2) intersect.
     Returns the intersection point if they do intersect. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  assert(q1 instanceof Point);
  assert(q2 instanceof Point);

  let a = p1, b = p2,
      c = q1, d = q2;

  let det = (a.x-b.x)*(c.y-d.y) - (a.y-b.y)*(c.x-d.x);
  if (det === 0) {
    return null;
  }
  let d1 = a.x*b.y - a.y*b.x,
      d2 = c.x*d.y - c.y*d.x;
  let pt = new Point((d1*(c.x-d.x) - d2*(a.x-b.x)) / det,
                     (d1*(c.y-d.y) - d2*(a.y-b.y)) / det);

  return pt;
}

export function segments_intersect(p1, p2, q1, q2, epsilon=1e-10) {
  let pt = lines_intersect(p1, p2, q1, q2);
  if (!pt || segment_distance(p1, p2, pt) > epsilon || segment_distance(q1, q2, pt) > epsilon) {
    return null;
  } else {
    return pt;
  }
}

export function point_along(p1, p2, t) {
  /* Given a line parameterized so that t=0 is p1 and t=1 is p2,
     returns the point corresponding to t. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  return new Point((1-t)*p1.x + t*p2.x,
                   (1-t)*p1.y + t*p2.y);
}

export function* line_points(p1, p2) {
  /* Bresenham line drawing algorithm. Returns a generator of Points
     from p1 to p2.  The coordinates of these points are expected to
     be integers. */
  assert(p1 instanceof Point);
  assert(p2 instanceof Point);
  
  var x1 = p1.x, y1 = p1.y,
      x2 = p2.x, y2 = p2.y;
  var dx = Math.abs(x2-x1),
      sx = x1 < x2 ? 1 : -1,
      dy = -Math.abs(y2-y1),
      sy = y1 < y2 ? 1 : -1;
  var err = dx+dy;

  while (true) {
    yield new Point(x1, y1);
    if (x1 === x2 && y1 === y2) break;
    var e2 = 2*err;
    if (e2 >= dy) { err += dy; x1 += sx; }
    if (e2 <= dx) { err += dx; y1 += sy; }
  }
}
