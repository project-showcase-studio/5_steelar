// Outdoor furniture staged under the pergola: lounge set (sofa, two armchairs, coffee table, rug) and a dining
// set (teak table, six chairs with cord backs), concrete planters. Real proportions, rounded upholstery.
import * as THREE from 'three';
import { box, beam, M } from '../geom.js';

const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);

/** Local placer: every part is positioned relative to a base transform (x, y, z, rotation about y). */
function placer(K, x, y, z, ry = 0) {
  const base = M(x, y, z, 0, ry, 0);
  const add = (key, w, h, d, px, py, pz, { round = 0, seg = 3, rx = 0, ry: r2 = 0, rz = 0 } = {}) =>
    K.batch.add(key, box(w, h, d, { round, seg }), mul(base, M(px, py, pz, rx, r2, rz)));
  const geo = (key, g, m) => K.batch.add(key, g, mul(base, m));
  return { add, geo, base };
}

// ---------------------------------------------------------------- upholstery
/**
 * Box cushion: a densely subdivided rounded box (radius r) inflated like a filled cover — crowned top,
 * bellied sides, softly wrinkled — with welt piping along the top and bottom seams.
 * The crown builds up along +y (the sitting face). Returns { geo, piping: [geo, geo] }, centred.
 */
function cushionGeo(w, h, d, { r = 0.03, crown = 0.016, belly = 0.008, taper = 0, pipe = 0.0045, seed = 1 } = {}) {
  const Hx = w / 2, Hy = h / 2, Hz = d / 2;
  r = Math.min(r, Hy * 0.95, Hx * 0.5, Hz * 0.5);
  const k = 4; // segments across each rounded edge band
  const seg = (H) => Math.max(4, Math.round((2 * H - 2 * r) / 0.035)) + 2 * k;
  const nx = seg(Hx), ny = seg(Hy), nz = seg(Hz);
  const g = new THREE.BoxGeometry(w, h, d, nx, ny, nz);
  // remap each axis so the outer k segments cover the edge band, then spherify onto the rounded box
  const remap = (v, H, n) => {
    const t = Math.abs(v) / H, tb = 1 - (2 * k) / n;
    const a = t <= tb ? (t / tb) * (H - r) : H - r + ((t - tb) / (1 - tb)) * r;
    return Math.sign(v) * a;
  };
  const inflate = (v) => {
    // crowned faces and bellied sides: the filling pushes the cover out between the seams
    const ux = v.x / Hx, uy = v.y / Hy, uz = v.z / Hz;
    const f = Math.max(0, 1 - ux * ux) * Math.max(0, 1 - uz * uz);
    const top = uy > 0 ? 1 : 0.35; // the underside rests on the frame: flatter
    const side = Math.max(0, 1 - uy * uy);
    v.y += crown * f * Math.sign(uy) * uy * uy * top;
    v.x += Math.sign(v.x) * belly * side * Math.abs(ux) ** 3 * Math.max(0, 1 - uz ** 8);
    v.z += Math.sign(v.z) * belly * side * Math.abs(uz) ** 3 * Math.max(0, 1 - ux ** 8);
    if (taper) v.y *= 1 - taper * (1 - uz) * 0.5; // thinner towards -z
    return v;
  };
  const p = g.attributes.position;
  const q = new THREE.Vector3(), v = new THREE.Vector3(), o = new THREE.Vector3();
  const ph = seed * 1.7;
  for (let i = 0; i < p.count; i++) {
    v.set(remap(p.getX(i), Hx, nx), remap(p.getY(i), Hy, ny), remap(p.getZ(i), Hz, nz));
    q.set(THREE.MathUtils.clamp(v.x, -(Hx - r), Hx - r), THREE.MathUtils.clamp(v.y, -(Hy - r), Hy - r), THREE.MathUtils.clamp(v.z, -(Hz - r), Hz - r));
    o.subVectors(v, q);
    const l = o.length();
    if (l > 1e-6) v.copy(q).addScaledVector(o, r / l);
    const ux = v.x / Hx, uy = v.y / Hy, uz = v.z / Hz;
    // soft wrinkles where the cover gathers towards the corners of the sitting face
    v.y += 0.0016 * (Math.sin(ux * 9 + uz * 5 + ph) + Math.sin(uz * 11 - ux * 4 + ph * 2)) * (ux * ux + uz * uz) * (uy > 0.6 ? 1 : 0.4);
    inflate(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // metre UVs: top/bottom (x, z), front/back (x, y), sides (z, y); the seams lie under the piping
  const n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, x + seed * 0.13, z);
    else if (az >= ax) uv.setXY(i, x + seed * 0.13, y);
    else uv.setXY(i, z, y);
  }
  // welt piping: rounded rectangle along the 45° line of the top and bottom edges
  const piping = [];
  if (pipe) {
    const c = r * (1 - Math.SQRT1_2);
    const ex = Hx - c, ez = Hz - c, cr = r * Math.SQRT1_2 + 0.002;
    for (const sy of [1, -1]) {
      const pts = [];
      const corner = (cx, cz, a0) => {
        for (let j = 0; j <= 6; j++) {
          const a = a0 + (j / 6) * (Math.PI / 2);
          pts.push(inflate(new THREE.Vector3(cx + Math.cos(a) * cr, sy * (Hy - c), cz + Math.sin(a) * cr)));
        }
      };
      corner(ex - cr, ez - cr, 0);
      corner(-ex + cr, ez - cr, Math.PI / 2);
      corner(-ex + cr, -ez + cr, Math.PI);
      corner(ex - cr, -ez + cr, Math.PI * 1.5);
      const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      piping.push(new THREE.TubeGeometry(curve, 160, pipe, 8, true));
    }
  }
  return { geo: g, piping };
}

/**
 * Scatter / lumbar pillow: two panels sewn at the border and filled — thickest in the middle, pinched
 * corners, slightly concave edges, a crease along the seam. In the XY plane, front face +z, centred.
 */
function pillowGeo(W, H, T, { seed = 1 } = {}) {
  const N = 28;
  const pos = [], idx = [], uvs = [];
  const ph = seed * 2.3;
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= N; i++) {
        const u = -1 + (2 * i) / N, v = -1 + (2 * j) / N;
        const x = u * (W / 2) * (1 - 0.07 * (1 - v * v));
        const y = v * (H / 2) * (1 - 0.07 * (1 - u * u));
        const fill = Math.sqrt(Math.max(0, 1 - u * u)) * Math.sqrt(Math.max(0, 1 - v * v));
        // gathered fabric towards the corners
        const z = side * ((T / 2) * fill + 0.0025 * Math.sin(u * 7 + v * 5 + ph) * (u * u + v * v) * fill);
        pos.push(x, y, z);
        uvs.push(x + seed * 0.21, y);
      }
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = base + j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        if (side > 0) idx.push(a, b, d, a, d, c);
        else idx.push(a, d, b, a, c, d);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

let cushionSeed = 1;
/** Box cushion in the local frame; crown on the sitting face (+y), or on the front (+z) for back cushions. */
function cushion(P, key, w, h, d, x, y, z, { rx = 0, ry = 0, rz = 0, back = false, ...o } = {}) {
  const seed = cushionSeed++;
  // back cushions are built lying down (thickness along y) and stood up, so the crown faces the sitter
  const { geo, piping } = back ? cushionGeo(w, d, h, { seed, ...o }) : cushionGeo(w, h, d, { seed, ...o });
  const m = back ? mul(M(x, y, z, rx, ry, rz), M(0, 0, 0, Math.PI / 2, 0, 0)) : M(x, y, z, rx, ry, rz);
  P.geo(key, geo, m);
  for (const t of piping) P.geo(key, t, m);
}

function pillow(P, key, W, H, T, x, y, z, rx = 0, ry = 0, rz = 0) {
  P.geo(key, pillowGeo(W, H, T, { seed: cushionSeed++ }), M(x, y, z, rx, ry, rz));
}

/** Aluminium frame of a seat: legs and rails of 40 × 40 tube. */
function seatFrame(P, w, d, hSeat, { key = 'aluDark', arms = true, hArm = 0.6, tube = 0.035 } = {}) {
  const t = tube;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) P.add(key, t, hSeat, t, sx * (w / 2 - t / 2), hSeat / 2, sz * (d / 2 - t / 2), { round: 0.004 });
  P.add(key, w, t, t, 0, hSeat - t / 2, d / 2 - t / 2, { round: 0.004 });
  P.add(key, w, t, t, 0, hSeat - t / 2, -d / 2 + t / 2, { round: 0.004 });
  for (const sx of [-1, 1]) P.add(key, t, t, d, sx * (w / 2 - t / 2), hSeat - t / 2, 0, { round: 0.004 });
  // seat deck straps
  for (let i = 1; i < 5; i++) P.add(key, w - 2 * t, 0.008, 0.03, 0, hSeat - 0.01, -d / 2 + (d * i) / 5, {});
  if (arms) {
    for (const sx of [-1, 1]) {
      P.add(key, t, hArm - hSeat, t, sx * (w / 2 - t / 2), (hArm + hSeat) / 2, d / 2 - t / 2, { round: 0.004 });
      P.add(key, t, hArm - hSeat + 0.15, t, sx * (w / 2 - t / 2), (hArm + hSeat + 0.15) / 2, -d / 2 + t / 2, { round: 0.004 });
    }
  }
}

/** Teak armrest board on top of a side frame. */
function armrest(P, K, x, y, d) {
  const g = beam(d + 0.04, 0.09, 0.025, { kind: 'planed', rnd: K.rnd });
  P.geo('wood', g, M(x - 0.0, y, d / 2 + 0.02, 0, Math.PI / 2, 0));
}

/** Arm side panel: horizontal teak slats between the front and back legs, under the armrest. */
function armSlats(P, K, x, d, y0, y1) {
  const n = 4, step = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const g = beam(d - 0.07, 0.016, step - 0.022, { kind: 'planed', rnd: K.rnd });
    P.geo('wood', g, M(x, y0 + i * step + 0.011, d / 2 - 0.035, 0, Math.PI / 2, 0));
  }
}

export function sofa(K, x, y, z, ry = 0, { seats = 3, seatW = 0.68 } = {}) {
  const P = placer(K, x, y, z, ry);
  const w = seats * seatW + 0.16, d = 0.86, hs = 0.3, ha = 0.6, bt = 0.78;
  seatFrame(P, w, d, hs, { hArm: ha });
  for (const sx of [-1, 1]) {
    armrest(P, K, sx * (w / 2 - 0.0175), ha, d);
    armSlats(P, K, sx * (w / 2 - 0.0175), d, hs + 0.01, ha - 0.005);
  }
  // back frame with a woven cord panel
  P.add('aluDark', w - 0.07, 0.035, 0.035, 0, bt, -d / 2 + 0.0175, { round: 0.004 });
  for (const sx of [-1, 1]) P.add('aluDark', 0.035, bt - hs, 0.035, sx * (w / 2 - 0.0175), (bt + hs) / 2, -d / 2 + 0.0175, { round: 0.004 });
  for (let i = 0; i < 10; i++) P.add('cord', w - 0.07, 0.011, 0.011, 0, hs + 0.05 + i * 0.043, -d / 2 + 0.02, { round: 0.0055, seg: 3 });
  // seat cushions 150 mm on the strap deck; back cushions lean on the top rail, reclined ~12°
  const inner = w - 0.07, sw = inner / seats;
  const ct = 0.15, top = hs + ct;
  const bh = 0.5, bd = 0.17, rec = -0.21;
  const bz = -d / 2 + 0.035 + (bd / 2) * Math.cos(rec) + (bh / 2) * Math.sin(-rec);
  const by = top - 0.025 + (bh / 2) * Math.cos(rec);
  for (let i = 0; i < seats; i++) {
    const cx = -inner / 2 + sw * (i + 0.5);
    cushion(P, 'fabric', sw - 0.006, ct, d - 0.06, cx, hs + ct / 2 - 0.004, 0.012, { r: 0.035, crown: 0.018, belly: 0.01 });
    cushion(P, 'fabric', sw - 0.012, bh, bd, cx, by, bz, { rx: rec, back: true, r: 0.04, crown: 0.022, belly: 0.012, taper: 0.22 });
  }
  // scatter pillows tucked into the corners, a lumbar pillow in front of the back cushions
  const pz = bz + bd / 2 + 0.07, lean = -0.3;
  if (seats > 1) {
    pillow(P, 'fabricDark', 0.48, 0.48, 0.17, -inner / 2 + 0.29, top + 0.22, pz, lean, 0.14, 0.06);
    pillow(P, 'fabricDark', 0.48, 0.48, 0.17, inner / 2 - 0.29, top + 0.22, pz, lean, -0.14, -0.06);
    pillow(P, 'fabricAccent', 0.56, 0.32, 0.14, inner / 2 - 0.66, top + 0.15, pz + 0.03, lean, -0.04, 0.03);
  } else pillow(P, 'fabricAccent', 0.5, 0.3, 0.13, 0.02, top + 0.15, pz + 0.02, lean, 0.04, 0.03);
  return { w, d };
}

export function armchair(K, x, y, z, ry = 0) {
  sofa(K, x, y, z, ry, { seats: 1, seatW: 0.74 });
}

export function coffeeTable(K, x, y, z, ry = 0, w = 1.1, d = 0.65) {
  const P = placer(K, x, y, z, ry);
  const h = 0.36, t = 0.03;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.add('aluDark', t, h - 0.03, t, sx * (w / 2 - 0.05), (h - 0.03) / 2, sz * (d / 2 - 0.05), { round: 0.004 });
  P.add('aluDark', w - 0.08, 0.03, d - 0.08, 0, h - 0.045, 0, { round: 0.004 });
  // slatted teak top
  const n = 7, bw = (d - 0.02) / n;
  for (let i = 0; i < n; i++) {
    const g = beam(w, bw - 0.008, 0.025, { kind: 'planed', rnd: K.rnd });
    P.geo('wood', g, M(-w / 2, h - 0.03, -d / 2 + 0.01 + bw * (i + 0.5)));
  }
  // lower shelf
  P.add('aluDark', w - 0.14, 0.012, d - 0.14, 0, 0.08, 0, { round: 0.003 });
  // decor on the top (top surface at h - 0.005): stoneware bowl and a lantern, both standing on it
  const top = h - 0.005;
  const bowl = new THREE.LatheGeometry(
    [[0, 0], [0.05, 0], [0.055, 0.004], [0.1, 0.03], [0.125, 0.058], [0.128, 0.062], [0.12, 0.062], [0.096, 0.036], [0.05, 0.012], [0, 0.012]].map(([a, b]) => new THREE.Vector2(a, b)),
    48,
  );
  P.geo('ceramic', bowl, M(w * 0.18, top, 0.02));
  P.add('aluDark', 0.12, 0.012, 0.12, -w * 0.25, top + 0.006, -0.05, { round: 0.003 });
  P.add('aluDark', 0.12, 0.012, 0.12, -w * 0.25, top + 0.254, -0.05, { round: 0.003 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.add('aluDark', 0.012, 0.236, 0.012, -w * 0.25 + sx * 0.054, top + 0.13, -0.05 + sz * 0.054, { round: 0.003, seg: 2 });
  P.add('glassTop', 0.1, 0.236, 0.1, -w * 0.25, top + 0.13, -0.05, { round: 0.004 });
}

export function rug(K, x, y, z, w, d, ry = 0) {
  const P = placer(K, x, y, z, ry);
  P.add('fabricDark', w, 0.012, d, 0, 0.006, 0, { round: 0.005, seg: 2 });
}

export function loungeSet(K, cx, y, cz, w, d) {
  // sofa against the back, armchairs facing each other, table in the middle
  const zb = cz - d / 2 + 0.55;
  const S = sofa(K, cx, y, zb, 0, { seats: w > 4.4 ? 3 : 2 });
  const TW = 1.1, TD = 0.65, tz = zb + 1.05; // coffee table
  rug(K, cx, y, tz, Math.min(w - 0.6, S.w + 0.8), 1.9);
  coffeeTable(K, cx, y, tz, 0, TW, TD);
  // armchairs turned towards the table: placed from their rotated footprint (0.9 × 0.86 m), keeping a
  // 40 cm leg-room gap to the table and clear of the sofa and the posts
  const AW = 0.9, AD = 0.86, a = Math.PI / 2 - 0.25;
  const hx = Math.abs(Math.cos(a)) * (AW / 2) + Math.abs(Math.sin(a)) * (AD / 2);
  const hz = Math.abs(Math.sin(a)) * (AW / 2) + Math.abs(Math.cos(a)) * (AD / 2);
  const ax = TW / 2 + 0.4 + hx;
  const az = Math.max(tz + 0.05, zb + S.d / 2 + 0.08 + hz); // in front of the sofa
  if (ax + hx <= w / 2 && az + hz <= cz + d / 2) {
    armchair(K, cx - ax, y, az, a);
    armchair(K, cx + ax, y, az, -a);
  }
}

function chair(K, x, y, z, ry) {
  const P = placer(K, x, y, z, ry);
  const w = 0.5, d = 0.52, hs = 0.45, t = 0.022;
  for (const sx of [-1, 1]) {
    P.add('aluDark', t, hs, t, sx * (w / 2 - t / 2), hs / 2, d / 2 - t / 2, { round: 0.003 });
    // rear leg rises into the back post with a slight rake
    P.add('aluDark', t, 0.86, t, sx * (w / 2 - t / 2), 0.43, -d / 2 + t / 2 - 0.01, { round: 0.003, rx: -0.05 });
    P.add('aluDark', t, t, d, sx * (w / 2 - t / 2), hs - t / 2, 0, { round: 0.003 });
  }
  P.add('aluDark', w, t, t, 0, hs - t / 2, d / 2 - t / 2, { round: 0.003 });
  for (let i = 0; i < 8; i++) P.add('cord', w - t, 0.01, 0.01, 0, hs + 0.08 + i * 0.04, -d / 2 + 0.0, { round: 0.004, seg: 2, rx: -0.05 });
  P.add('aluDark', w, t, t, 0, 0.86, -d / 2 - 0.02, { round: 0.003 });
  cushion(P, 'fabric', w - 0.03, 0.06, d - 0.05, 0, hs + 0.03, 0.01, { r: 0.022, crown: 0.01, belly: 0.004, pipe: 0.0035 });
}

export function diningSet(K, cx, y, cz, w, d) {
  const L = Math.min(2.2, w - 1.6), D = 0.95, h = 0.75;
  const P = placer(K, cx, y, cz, 0);
  // sled legs of 60 × 30 tube
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 - 0.25);
    P.add('aluDark', 0.06, h - 0.04, 0.03, x, (h - 0.04) / 2, D / 2 - 0.12, { round: 0.004 });
    P.add('aluDark', 0.06, h - 0.04, 0.03, x, (h - 0.04) / 2, -D / 2 + 0.12, { round: 0.004 });
    P.add('aluDark', 0.06, 0.03, D - 0.2, x, h - 0.055, 0, { round: 0.004 });
    P.add('aluDark', 0.06, 0.015, D - 0.2, x, 0.0075, 0, { round: 0.004 });
  }
  P.add('aluDark', L - 0.4, 0.06, 0.03, 0, h - 0.07, 0, { round: 0.004 });
  // solid teak top of glued staves, 40 mm
  const n = 8, bw = D / n;
  for (let i = 0; i < n; i++) {
    const g = beam(L, bw, 0.04, { kind: 'board', rnd: K.rnd, shade: 0.95 + K.rnd() * 0.1 });
    P.geo('wood', g, M(-L / 2, h - 0.04, -D / 2 + bw * (i + 0.5)));
  }
  const per = L > 1.9 ? 3 : 2;
  for (let i = 0; i < per; i++) {
    const x = -L / 2 + (L * (i + 0.5)) / per;
    chair(K, cx + x, y, cz + D / 2 + 0.3, Math.PI);
    chair(K, cx + x, y, cz - D / 2 - 0.3, 0);
  }
  // runner & vase
  P.add('fabricDark', 0.38, 0.004, D - 0.1, 0, h + 0.002, 0, { round: 0.002, seg: 2 });
  const vase = new THREE.LatheGeometry(
    [[0.0, 0], [0.07, 0], [0.09, 0.06], [0.08, 0.16], [0.045, 0.24], [0.05, 0.27], [0.044, 0.27]].map(([a, b]) => new THREE.Vector2(a, b)),
    40,
  );
  P.geo('ceramic', vase, M(0.1, h + 0.004, 0));
}

/** Tall square fibre-concrete planter; returns the top-of-soil height for the plant. */
export function planter(K, x, z, { size = 0.5, h = 0.75, y = 0 } = {}) {
  K.batch.add('planter', box(size, h, size, { round: 0.012, seg: 3 }), M(x, y + h / 2, z));
  K.batch.add('soil', box(size - 0.05, 0.02, size - 0.05), M(x, y + h - 0.03, z));
  return y + h - 0.03;
}
