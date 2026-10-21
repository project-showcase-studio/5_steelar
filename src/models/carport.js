// «Навес HI-TECH» (steelar.pro/navesy-novosibirsk.html): flat minimalist carport. Steel posts 80×80 / 100×100
// (wall 3 mm+) on decorative shoes, hidden perimeter beams 200×100 and purlins, profiled sheet laid to a 1.2 %
// fall behind a parapet fascia, fascia of horizontal slats (steel or thermowood) or aluminium composite
// cassettes, soffit of white metal panels / thermowood / graphite ACP with recessed LED lines, optional slatted
// side and back screens, rainwater drained inside a rear post. Reference: the HI-TECH photos on the site.
import * as THREE from 'three';
import {
  makeKit, baseMaterials, part, tube, post, screws, slat, ledLine, lamp, profiledSheet, spout, M,
} from './kit.js';
import { surface } from '../materials.js';

export const CARPORT = {
  id: 'hitech',
  sun: [0.55, 0.83],
  materials: () => ({
    ...baseMaterials(),
    pavers: surface('pavers', { tint: 'paint', color: '#7b7a77', contrast: 1.05, roughness: 0.85 }),
    curb: surface('concrete', { tint: 'paint', color: '#77756f', contrast: 1.0, roughness: 0.9 }),
  }),
  build,
  views(c) {
    const { w, d, h } = c;
    return {
      main: [[w * 0.95 + 5.2, h + 1.9, d * 0.62 + 7.2], [0, h * 0.55, 0]],
      front: [[0.6, 1.75, d / 2 + 7.5 + w * 0.35], [0, h * 0.62, 0]],
      inside: [[w * 0.18, 1.25, d / 2 + 1.6], [-w * 0.05, h + 0.25, -d * 0.15]],
      side: [[-(w / 2 + 7.5), h * 0.75, d * 0.3 + 1.5], [0, h * 0.6, 0]],
      top: [[w * 0.6 + 4, h + 9.5, d * 0.7 + 6], [0, h * 0.4, 0]],
    };
  },
  footprint(c) {
    return { x0: -c.w / 2, x1: c.w / 2, z0: -c.d / 2, z1: c.d / 2 };
  },
};

function build(c, mats) {
  const K = makeKit(mats, 21);
  const { w, d, h } = c;
  const X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
  const s = c.post === 80 ? 0.08 : 0.1;
  const woodFascia = c.fascia === 'wood';
  const pc = c.roof === 'pc';
  const led = c.extras.includes('led');

  // ---------------------------------------------------------------- levels
  const yB = h; // underside of the fascia = clear height
  const nS = 6, sH = 0.075, sG = 0.02; // fascia: 6 slats 75 mm, 20 mm gaps
  const hf = nS * sH + (nS - 1) * sG; // 0.55
  const yT = yB + hf;
  const yBeam0 = yB + 0.08, yBeam1 = yBeam0 + 0.2; // perimeter beams 200 × 100
  const fall = 0.012 * d; // roof fall to the back
  const yPur = (z) => yBeam1 + fall * ((z - Z0) / d); // purlin underside
  const fd = 0.045; // fascia depth (slat 40 + spacer)

  // ---------------------------------------------------------------- posts
  const px = X1 - 0.1;
  const zs = [];
  const zF = Z1 - 0.85, zBk = Z0 + 0.1;
  const spans = Math.max(1, Math.ceil((zF - zBk) / 5.6)); // beams 200 × 100 span up to 5.6 m
  for (let i = 0; i <= spans; i++) zs.push(zBk + ((zF - zBk) * i) / spans);
  const posts = [];
  for (const x of [-px, px]) for (const z of zs) posts.push([x, z]);
  if (w > 6.6) posts.push([0, zBk]); // wide carports: a middle post at the back only, the entrance stays free
  for (const [x, z] of posts) post(K, x, z, yBeam0, s);
  // drain: inside the rear right post, outlet towards the back
  spout(K, px, zBk, [0, -1], s);

  // ---------------------------------------------------------------- hidden frame
  for (const x of [-px, px]) tube(K, 'frame', 'z', Z0 + fd, Z1 - fd, 0.1, 0.2, x, (yBeam0 + yBeam1) / 2, 0);
  for (const z of [zBk, Z1 - 0.1]) tube(K, 'frame', 'x', -px + 0.05, px - 0.05, 0.1, 0.2, 0, (yBeam0 + yBeam1) / 2, z);
  // purlins 80 × 40 across the width, ≤ 0.9 m apart
  const nP = Math.ceil((d - 0.2) / 0.9);
  const pz = [];
  for (let i = 0; i <= nP; i++) pz.push(Z0 + 0.1 + ((d - 0.2) * i) / nP);
  for (const z of pz) tube(K, pc ? 'frame' : 'galv', 'x', X0 + fd + 0.01, X1 - fd - 0.01, 0.04, 0.08, 0, yPur(z) + 0.04, z, { r: 0.003 });
  // fascia studs 40 × 20 behind the slats (seen through the slat gaps)
  const studs = [];
  const studRun = (a, b) => {
    const n = Math.max(1, Math.round((b - a) / 0.8));
    const r = [];
    for (let i = 0; i <= n; i++) r.push(a + ((b - a) * i) / n);
    return r;
  };

  // ---------------------------------------------------------------- roof
  const ang = Math.atan2(fall, d);
  if (!pc) {
    const sheet = profiledSheet(w - 2 * fd - 0.02, d - 2 * fd - 0.02);
    // ribs along the fall (z); top of the ribs on the purlins
    const m = M(X0 + fd + 0.01, yPur(Z0) + 0.08 + 0.044, Z0 + fd + 0.01, -ang);
    K.batch.add('deckSheet', sheet, m);
    // hidden box gutter along the back, inside the fascia
    part(K, 'galv', w - 2 * fd - 0.02, 0.1, 0.14, 0, yPur(Z0) + 0.06, Z0 + fd + 0.08, { round: 0.004 });
  } else {
    // monolithic polycarbonate 8 mm, sheets 2.05 m wide with aluminium clamp profiles along the fall
    const x0 = X0 + fd + 0.01, x1 = X1 - fd - 0.01;
    const n = Math.max(1, Math.ceil((x1 - x0) / 2.05));
    const yTop = (z) => yPur(z) + 0.08;
    const L = Math.hypot(d - 2 * fd - 0.02, fall);
    const cz = 0, cy = (yTop(Z0 + fd) + yTop(Z1 - fd)) / 2 + 0.004;
    part(K, 'pc', x1 - x0, 0.008, L, (x0 + x1) / 2, cy, cz, { rx: -ang });
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      part(K, 'alu', 0.06, 0.012, L, x, cy + 0.01, cz, { rx: -ang, round: 0.003 });
      // rafters 60 × 40 under each clamp line
      part(K, 'frame', 0.04, 0.06, L, x, cy - 0.034, cz, { rx: -ang, round: 0.003 });
    }
  }

  // ---------------------------------------------------------------- fascia
  // runs: [axis, from, to, fixed coord, outward sign]
  const runs = [
    ['x', X0, X1, Z1, +1], // front (full width, covers the side ends)
    ['x', X0, X1, Z0, -1], // back
    ['z', Z0 + fd, Z1 - fd, X0, -1], // left
    ['z', Z0 + fd, Z1 - fd, X1, +1], // right
  ];
  for (const [ax, a, b, f, sg] of runs) {
    const face = f - sg * 0.0; // outer face plane
    const mid = f - sg * (fd / 2);
    const back = f - sg * (fd + 0.003);
    // backing membrane / sheet behind the slats
    if (ax === 'x') part(K, 'backing', b - a - 2 * fd, hf - 0.01, 0.006, (a + b) / 2, (yB + yT) / 2, back);
    else part(K, 'backing', 0.006, hf - 0.01, b - a, back, (yB + yT) / 2, (a + b) / 2);
    const st = studRun(a + 0.05, b - 0.05);
    studs.push(...st.map((t) => [ax, t, f - sg * 0.035]));
    for (const t of st) {
      if (ax === 'x') part(K, 'backing', 0.04, hf - 0.02, 0.02, t, (yB + yT) / 2, f - sg * 0.035);
      else part(K, 'backing', 0.02, hf - 0.02, 0.04, f - sg * 0.035, (yB + yT) / 2, t);
    }
    if (c.fascia === 'acp') {
      // aluminium composite cassettes ≤ 3 m with 12 mm reveals
      const n = Math.max(1, Math.ceil((b - a) / 3));
      const L = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const p0 = a + i * L + 0.006, p1 = a + (i + 1) * L - 0.006;
        if (ax === 'x') part(K, 'acp', p1 - p0, hf, 0.035, (p0 + p1) / 2, (yB + yT) / 2, f - sg * 0.0175, { round: 0.0025 });
        else part(K, 'acp', 0.035, hf, p1 - p0, f - sg * 0.0175, (yB + yT) / 2, (p0 + p1) / 2, { round: 0.0025 });
      }
    } else {
      const key = woodFascia ? 'wood' : 'slat';
      const sd = 0.04;
      for (let i = 0; i < nS; i++) {
        const y = yB + i * (sH + sG);
        if (ax === 'x') slat(K, key, 'x', b - a, sd, sH, a, y, f - sg * sd / 2, { wood: woodFascia });
        else slat(K, key, 'z', b - a, sd, sH, f - sg * sd / 2, y, a, { wood: woodFascia });
        // screws at every stud
        const pts = st.map((t) => (ax === 'x' ? [t, y + sH / 2, face + sg * 0.0008] : [face + sg * 0.0008, y + sH / 2, t]));
        screws(K, pts, ax === 'x' ? (sg > 0 ? 'z' : '-z') : sg > 0 ? 'x' : '-x');
      }
    }
  }
  // parapet cap flashing (drip edge outside, upstand inside)
  const capW = fd + 0.035;
  part(K, 'flash', w + 0.02, 0.004, capW, 0, yT + 0.002, Z1 - capW / 2 + 0.01, { round: 0.0015, seg: 2 });
  part(K, 'flash', w + 0.02, 0.004, capW, 0, yT + 0.002, Z0 + capW / 2 - 0.01, { round: 0.0015, seg: 2 });
  part(K, 'flash', capW, 0.004, d - 2 * capW + 0.02, X0 + capW / 2 - 0.01, yT + 0.002, 0, { round: 0.0015, seg: 2 });
  part(K, 'flash', capW, 0.004, d - 2 * capW + 0.02, X1 - capW / 2 + 0.01, yT + 0.002, 0, { round: 0.0015, seg: 2 });
  for (const [x, z, ww, dd] of [[0, Z1 + 0.012, w + 0.024, 0.004], [0, Z0 - 0.012, w + 0.024, 0.004], [X0 - 0.012, 0, 0.004, d + 0.024], [X1 + 0.012, 0, 0.004, d + 0.024]])
    part(K, 'flash', ww, 0.03, dd, x, yT - 0.013, z); // drip edge

  // ---------------------------------------------------------------- soffit
  if (!pc) {
    const ys = yB + 0.05; // soffit underside, 50 mm above the fascia bottom: a crisp shadow line
    const x0 = X0 + fd, x1 = X1 - fd, z0 = Z0 + fd, z1 = Z1 - fd;
    part(K, 'backing', x1 - x0, 0.004, z1 - z0, (x0 + x1) / 2, ys + 0.03, (z0 + z1) / 2);
    if (c.ceiling === 'graphite') {
      const n = Math.max(1, Math.round((z1 - z0) / 1.25));
      const L = (z1 - z0) / n;
      for (let i = 0; i < n; i++)
        part(K, 'soffitGraphite', x1 - x0, 0.012, L - 0.01, (x0 + x1) / 2, ys + 0.006, z0 + (i + 0.5) * L, { round: 0.002, seg: 2 });
    } else {
      const wood = c.ceiling === 'wood';
      const bw = wood ? 0.09 : 0.15, gap = wood ? 0.007 : 0.006;
      const n = Math.floor((z1 - z0) / (bw + gap));
      const pad = (z1 - z0 - n * (bw + gap) + gap) / 2;
      for (let i = 0; i < n; i++) {
        const z = z0 + pad + i * (bw + gap);
        if (wood) slat(K, 'wood', 'x', x1 - x0, bw, 0.02, x0, ys, z + bw / 2, { wood: true });
        else {
          part(K, 'soffitWhite', x1 - x0, 0.012, bw, (x0 + x1) / 2, ys + 0.006, z + bw / 2, { round: 0.003, seg: 2 });
        }
      }
    }
    if (led) {
      const nr = Math.max(2, Math.round(d / 1.7));
      for (let i = 0; i < nr; i++) {
        const z = z0 + ((z1 - z0) * (i + 0.5)) / nr;
        const two = w > 4.2;
        const len = two ? Math.min(2.2, w / 2 - 0.9) : Math.min(2.2, w - 1.2);
        const xc = two ? [-w / 4 + (i % 2 ? 0.25 : -0.25), w / 4 + (i % 2 ? 0.25 : -0.25)] : [0];
        for (const x of xc) ledLine(K, 'x', len, x - len / 2, ys, z);
        lamp(K, 0, ys - 0.03, z, { type: 'spot', intensity: 16 + w * 2.4, distance: 10 + w * 0.5 });
      }
    }
  } else if (led) {
    // polycarbonate roof: LED lines along the inside faces of the side beams
    for (const sg of [-1, 1]) ledLine(K, 'z', d - 0.4, sg * (px - 0.05), yBeam0 + 0.05, Z0 + 0.2, { face: sg < 0 ? '+x' : '-x' });
    for (const z of [-d / 4, d / 4]) lamp(K, 0, yB - 0.2, z, { type: 'spot', intensity: 20, distance: 10 });
  }

  // ---------------------------------------------------------------- screens
  const screenKey = woodFascia ? 'wood' : 'slat';
  const screen = (ax, a, b, f, sg, supports) => {
    const y0 = 0.12, y1 = yB - 0.04;
    const sh = 0.09, gp = 0.024;
    const n = Math.floor((y1 - y0 + gp) / (sh + gp));
    for (const t of supports) {
      // 60 × 40 rail posts with their own shoes where there is no structural post
      if (!posts.some(([x, z]) => (ax === 'x' ? Math.abs(x - t) < 0.12 && Math.abs(z - f) < 0.2 : Math.abs(z - t) < 0.12 && Math.abs(x - f) < 0.2)))
        ax === 'x' ? post(K, t, f, yBeam0, 0.06, { sd: 0.04 }) : post(K, f, t, yBeam0, 0.04, { sd: 0.06 });
    }
    const off = f + sg * (s / 2 + (ax === 'x' ? 0.012 : 0.022)); // in front of the posts
    for (let i = 0; i < n; i++) {
      const y = y0 + i * (sh + gp);
      if (ax === 'x') slat(K, screenKey, 'x', b - a, 0.02, sh, a, y, off, { wood: woodFascia });
      else slat(K, screenKey, 'z', b - a, 0.02, sh, off, y, a, { wood: woodFascia });
    }
  };
  if (c.extras.includes('side')) {
    const a = zBk - s / 2, b = zF + s / 2;
    const n = Math.ceil((b - a) / 2.2);
    const sup = [];
    for (let i = 1; i < n; i++) sup.push(a + ((b - a) * i) / n);
    screen('z', a, b, -px, -1, sup);
  }
  if (c.extras.includes('back')) {
    const a = -px - s / 2, b = px + s / 2;
    const n = Math.ceil((b - a) / 2.2);
    const sup = [];
    for (let i = 1; i < n; i++) sup.push(a + ((b - a) * i) / n);
    screen('x', a, b, zBk, -1, sup);
  }

  // ---------------------------------------------------------------- paving under the carport
  const pv = { x0: X0 - 0.6, x1: X1 + 0.6, z0: Z0 - 0.6, z1: Z1 + 3.2 };
  const g = new THREE.BoxGeometry(pv.x1 - pv.x0, 0.06, pv.z1 - pv.z0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + (pv.x0 + pv.x1) / 2 + 0.37, p.getZ(i) + (pv.z0 + pv.z1) / 2);
  K.batch.add('pavers', g, M((pv.x0 + pv.x1) / 2, -0.024, (pv.z0 + pv.z1) / 2));
  // granite-look curb on three sides
  for (const [x, z, ww, dd] of [
    [pv.x0 - 0.04, (pv.z0 + pv.z1) / 2, 0.08, pv.z1 - pv.z0 + 0.16],
    [pv.x1 + 0.04, (pv.z0 + pv.z1) / 2, 0.08, pv.z1 - pv.z0 + 0.16],
    [(pv.x0 + pv.x1) / 2, pv.z0 - 0.04, pv.x1 - pv.x0, 0.08],
  ])
    part(K, 'curb', ww, 0.1, dd, x, 0.0, z, { round: 0.006 });

  const group = K.batch.build(mats);
  for (const L of K.lights) {
    group.add(L);
    if (L.target) group.add(L.target);
  }
  group.traverse((o) => {
    if (o.isMesh && (o.name === 'pavers' || o.name === 'curb')) o.castShadow = false;
  });
  return { group, mats, lights: K.lights, bounds: pv, meta: { yB, yT } };
}
