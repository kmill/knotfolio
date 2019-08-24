// Taken from bellbind/eigenvalues.js https://gist.github.com/bellbind/60fb876842346864baaf340cb789ad10

const ERROR = 1e-14;

// helpers
function mat2d(mat) {
  const n = Math.sqrt(mat.length);
  return Array.from(Array(n), (_, i) => mat.slice(i * n, i * n + n));
}
function range(n, f = v => v) {
  return Array.from(Array(n), (_, i) => f(i));
}
function sum(a, f = v => v) {
  return a.reduce((r, v, i) => r + f(v, i), 0);
}

// returns hessenberg matrix: m[y][x] == 0 when y >= x + 2
function householder(n, mat) {
  const m = Array.from(mat);
  console.assert(Number.isInteger(n));
  const idx = (x, y) => y * n + x;

  for (let k = 0; k < n - 2; k++) {
    if (Math.abs(m[idx(k, k + 1)]) < 10 * Number.EPSILON) continue;
    const u = range(n, i => i <= k ? 0 : m[idx(k, i)]);
    const sigma = Math.sign(u[k + 1]) * Math.hypot(...u);
    u[k + 1] += sigma;
    const norm = Math.sqrt(2 * sigma * u[k + 1]);
    const h = u.map(v => v / norm);
    
    const sdx = range(n, i => sum(h, (v, j) => v * m[idx(j, i)]));
    const sdy = range(n, i => sum(h, (v, j) => v * m[idx(i, j)]));
    const hdx = sum(sdx, (v, i) => v * h[i]);
    const hdy = sum(sdy, (v, i) => v * h[i]);
    const dx = sdx.map((v, i) => 2 * (v - hdx * h[i]));
    const dy = sdy.map((v, i) => 2 * (v - hdy * h[i]));
    
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      m[idx(x, y)] -= h[y] * dy[x] + h[x] * dx[y];
    }
  }
  return m;
}

// returns upper triangler matrix: m[y][x] == 0 when y >= x + 1
function qr(n, mat) {
  const m = Array.from(mat);
  console.assert(Number.isInteger(n));
  const idx = (x, y) => y * n + x;
  let k = n;

  while (k >= 2) {
    //console.log(k, m[idx(k - 2, k - 1)]);
    //console.log(mat2d(m));
    if (Math.abs(m[idx(k - 2, k - 1)]) < 10 * Number.EPSILON) {
      k--;
      continue;
    }
    
    // eigenvalue of last 2x2 sub matrix: l^2 - tr * l + det = 0
    const a = m[idx(k - 1, k - 1)], b = m[idx(k - 2, k - 1)],
          c = m[idx(k - 1, k - 2)], d = m[idx(k - 2, k - 2)];
    const tr = a * d, det = a * d - b * c;
    const disc = Math.sqrt(tr * tr - 4 * det) || 0;
    const l1 = (tr + disc) / 2, l2 = (tr - disc) / 2;
    const mu = a - (Math.abs(l1) < Math.abs(l2) ? l1 : l2);
    // (option) pre process M = M - mu * I 
    for (let i = 0; i < k; i++) m[idx(i, i)] -= mu;
    
    // init q as unit matrix
    const idxq = (x, y) => y * k + x;
    const q = Array(k * k).fill(0);
    for (let i = 0; i < k; i++) q[idxq(i, i)] = 1;
    
    // rotate to makes M => Q * R (R store to M)
    for (let i = 0; i < k - 1; i++) {
      const a1 = m[idx(i, i)], a2 = m[idx(i, i + 1)]; 
      const base = Math.hypot(a1, a2);
      const cos = base < Number.EPSILON ? 0 : a1 / base;
      const sin = base < Number.EPSILON ? 0 : a2 / base;
      // make R
      m[idx(i, i)] = base;
      m[idx(i, i + 1)] = 0;
      for (let x = i + 1; x < k; x++) {
        const e1 = m[idx(x, i)], e2 = m[idx(x, i + 1)];
        m[idx(x, i)] = e1 * cos + e2 * sin;
        m[idx(x, i + 1)] = e2 * cos - e1 * sin;
      }
      // make Q
      for (let y = 0; y < k; y++) {
        const e1 = q[idxq(i, y)], e2 = q[idxq(i + 1, y)];
        q[idxq(i, y)] = e1 * cos + e2 * sin;
        q[idxq(i + 1, y)] = e2 * cos - e1 * sin;
      }
    }

    // next M as R * Q
    for (let y = 0; y < k; y++) {
      const ry = Array.from(Array(k - y), (_, j) => m[idx(y + j, y)]);
      for (let x = 0; x < k; x++) {
        m[idx(x, y)] = sum(ry, (v, j) => v * q[idxq(x, j + y)]);
      }
    }
    
    // (option) post process M = M + mu * I
    for (let i = 0; i < k; i++) m[idx(i, i)] += mu;        
  }
  return m;
}

// list of eigen values square matrix (allow non symmetric)
export function eigenvalues(mat) {
  let n = mat.length;
  let m = new Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      m[n*i+j] = mat[i][j];
    }
  }
  const ut = qr(n, householder(n, m));
  return range(n, i => ut[i * n + i]);
}

function example() {
  // example:
  // m = numpy.mat([[4, -6, 5], [-6, 3, 4], [5, 4, -3]])
  // numpy.linalg.eigvals(m) #=> array([-9.12030391,  9.62192181,  3.4983821 ])
  console.log(eigenvalues([
    4, -6, 5,
    -6, 3, 4,
    5, 4, -3
  ]));
}
