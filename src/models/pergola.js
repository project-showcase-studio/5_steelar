// «Перголы премиум класса» (steelar.pro/besedki-novosibirsk.html): metal-frame pergola in the loft / hi-tech /
// modern styles. Posts 150 × 150, perimeter frame 250 × 120 with an integrated gutter and an LED line along its
// inner face; roof of rotating aluminium louvres, thermowood slats, aluminium composite (ACP) with downlights,
// or monolithic polycarbonate; screens of vertical thermowood slats; podium of thermowood decking or porcelain
// stoneware with an LED under-glow. References: the pergola photos on the site (louvred, wood-slat, loft).
import * as THREE from 'three';
import { makeKit, baseMaterials, part, tube, post, slat, vslat, ledLine, lamp, groundWash, M } from './kit.js';
import { loungeSet, diningSet, planter } from './furniture.js';
import { surface } from '../materials.js';

export const PERGOLA = {
  id: 'pergola',
  sun: [0.5, 0.86],
  materials: () => ({
    ...baseMaterials(),
    pavers: surface('pavers', { tint: 'paint', color: '#7b7a77', contrast: 1.05, roughness: 0.85 }),
  }),
  build,
  views(c) {
    const { w, d, h } = c;
    return {
      main: [[w * 0.9 + 4.6, h + 1.6, d * 0.9 + 5.6], [0, h * 0.5, 0]],
      front: [[0.4, 1.7, d / 2 + 6.2 + w * 0.3], [0, h * 0.55, 0]],
      inside: [[w * 0.32, 1.45, d / 2 + 0.9], [-w * 0.1, h * 0.75, -d * 0.2]],
      side: [[-(w / 2 + 6), h * 0.7, d * 0.4 + 1.2], [0, h * 0.55, 0]],
      top: [[w * 0.5 + 3.5, h + 8, d * 0.6 + 4.5], [0, h * 0.3, 0]],
    };
  },
  footprint(c) {
    return { x0: -c.w / 2, x1: c.w / 2, z0: -c.d / 2, z1: c.d / 2 };
  },
};

// louvre blade: extruded aluminium aerofoil 210 × 36 mm with drip lips (section in the y/z plane, pivot at 0)
let bladeGeo, bladeLen;
function louvreGeometry(len) {
  if (bladeGeo && bladeLen === len) return bladeGeo;
  const s = new THREE.Shape();
  const W = 0.105, T = 0.018;
  s.moveTo(-W, -0.004);
  s.quadraticCurveTo(-W, T * 0.9, -W * 0.55, T);
  s.quadraticCurveTo(0, T * 1.25, W * 0.55, T);
  s.quadraticCurveTo(W, T * 0.9, W, -0.004);
  s.lineTo(W - 0.006, -0.004);
  s.lineTo(W - 0.006, 0.006);
  s.quadraticCurveTo(0, T * 0.35, -W + 0.006, 0.006);
  s.lineTo(-W + 0.006, -0.004);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 10 });
  // extrusion runs along +z → turn it to run along x, centred
  g.translate(0, 0, -len / 2);
  g.rotateY(Math.PI / 2);
  // metre UVs for the powder-coat micro relief
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getY(i) + p.getZ(i));
  bladeGeo = g;
  bladeLen = len;
  return g;
}

function build(c, mats) {
  const K = makeKit(mats, 33);
  const { w, d, h } = c;
  const X0 = -w / 2, X1 = w / 2, Z0 = -d / 2, Z1 = d / 2;
  const S = 0.15; // posts
  const FW = 0.12, FH = 0.25; // frame section
  const led = c.extras.includes('led');

  // ---------------------------------------------------------------- podium
  let yF = 0;
  const pad = 0.3;
  const P = { x0: X0 - pad, x1: X1 + pad, z0: Z0 - pad, z1: Z1 + pad };
  if (c.floor === 'deck' || c.floor === 'tile') {
    yF = c.floor === 'deck' ? 0.18 : 0.14;
    const pw = P.x1 - P.x0, pd = P.z1 - P.z0;
    // recessed plinth in graphite with a shadow gap and LED under the nosing
    part(K, 'backing', pw - 0.08, yF - 0.04, pd - 0.08, 0, (yF - 0.04) / 2, 0);
    if (c.floor === 'deck') {
      // thermowood decking ~140 × 28 along x, 5 mm gaps: board width adjusted so the courses fill the podium
      // edge to edge; fascia boards recessed 10 mm under the nosing of the edge boards and board ends
      const gap = 0.005;
      const n = Math.round((pd + gap) / (0.14 + gap));
      const bw = (pd - (n - 1) * gap) / n;
      for (let i = 0; i < n; i++) slat(K, 'woodDeck', 'x', pw, bw, 0.028, P.x0, yF - 0.028, P.z0 + i * (bw + gap) + bw / 2, { wood: true });
      const ft = 0.024, rec = 0.01, fh = 0.1, fy = yF - 0.028 - fh; // fascia: 24 mm board, top tight under the decking
      for (const sz of [-1, 1]) slat(K, 'woodDeck', 'x', pw - 2 * rec, ft, fh, P.x0 + rec, fy, sz * (pd / 2 - rec - ft / 2), { wood: true });
      for (const sx of [-1, 1]) slat(K, 'woodDeck', 'z', pd - 2 * (rec + ft), ft, fh, sx * (pw / 2 - rec - ft / 2), fy, P.z0 + rec + ft, { wood: true });
      // hidden joists 100 × 50 under the boards
      for (let x = P.x0 + 0.2; x < P.x1 - 0.1; x += 0.5) part(K, 'backing', 0.05, 0.1, pd - 0.1, x, yF - 0.028 - 0.05, 0);
    } else {
      // porcelain stoneware 20 mm on a slab, steel edging angle
      const g = new THREE.BoxGeometry(pw, 0.04, pd);
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + 0.3, p.getZ(i) + 0.15);
      K.batch.add('tile', g, M(0, yF - 0.02, 0));
      for (const [x, z, ww, dd] of [[0, P.z1 + 0.003, pw + 0.012, 0.006], [0, P.z0 - 0.003, pw + 0.012, 0.006], [P.x0 - 0.003, 0, 0.006, pd], [P.x1 + 0.003, 0, 0.006, pd]])
        part(K, 'flash', ww, 0.1, dd, x, yF - 0.05, z);
    }
    if (led) {
      const ly = c.floor === 'deck' ? yF - 0.14 : yF - 0.115;
      // under-glow: LED profile under the overhanging nosing, washing the plinth and the paving
      ledLine(K, 'x', pw - 0.1, P.x0 + 0.05, ly, P.z1 - 0.045, { face: '+z', w: 0.012 });
      ledLine(K, 'x', pw - 0.1, P.x0 + 0.05, ly, P.z0 + 0.045, { face: '-z', w: 0.012 });
      ledLine(K, 'z', pd - 0.1, P.x0 + 0.045, ly, P.z0 + 0.05, { face: '-x', w: 0.012 });
      ledLine(K, 'z', pd - 0.1, P.x1 - 0.045, ly, P.z0 + 0.05, { face: '+x', w: 0.012 });
      groundWash(K, P.x0, P.z1, P.x1, P.z1, 0, 1);
      groundWash(K, P.x0, P.z0, P.x1, P.z0, 0, -1);
      groundWash(K, P.x0, P.z0, P.x0, P.z1, -1, 0);
      groundWash(K, P.x1, P.z0, P.x1, P.z1, 1, 0);
    }
  }

  // ---------------------------------------------------------------- posts & frame
  const yb = yF + h; // frame underside
  const yt = yb + FH;
  const px = X1 - S / 2, pz = Z1 - S / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(K, sx * px, sz * pz, yb, S, { shoe: yF === 0 });
  tube(K, 'frame', 'x', X0, X1, FW, FH, 0, (yb + yt) / 2, Z1 - FW / 2, { r: 0.006 });
  tube(K, 'frame', 'x', X0, X1, FW, FH, 0, (yb + yt) / 2, Z0 + FW / 2, { r: 0.006 });
  tube(K, 'frame', 'z', Z0 + FW, Z1 - FW, FW, FH, X0 + FW / 2, (yb + yt) / 2, 0, { r: 0.006 });
  tube(K, 'frame', 'z', Z0 + FW, Z1 - FW, FW, FH, X1 - FW / 2, (yb + yt) / 2, 0, { r: 0.006 });
  // corner joints: thin reveal line where the beams meet the posts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(K, 'backing', S + 0.004, 0.005, S + 0.004, sx * px, yb + 0.0025, sz * pz);
  // top cap flashing around the frame (the roof infill stays open from above)
  const cw = FW + 0.008;
  part(K, 'flash', w + 0.016, 0.006, cw, 0, yt + 0.003, Z1 - cw / 2 + 0.008, { round: 0.002, seg: 2 });
  part(K, 'flash', w + 0.016, 0.006, cw, 0, yt + 0.003, Z0 + cw / 2 - 0.008, { round: 0.002, seg: 2 });
  part(K, 'flash', cw, 0.006, d - 2 * cw + 0.016, X0 + cw / 2 - 0.008, yt + 0.003, 0, { round: 0.002, seg: 2 });
  part(K, 'flash', cw, 0.006, d - 2 * cw + 0.016, X1 - cw / 2 + 0.008, yt + 0.003, 0, { round: 0.002, seg: 2 });
  const ix0 = X0 + FW, ix1 = X1 - FW, iz0 = Z0 + FW, iz1 = Z1 - FW; // inner opening

  if (led) {
    // LED line along the inner bottom edge of the frame (as in the site's louvred pergola photo)
    const y = yb + 0.035;
    ledLine(K, 'x', ix1 - ix0 - 0.04, ix0 + 0.02, y, iz1, { face: '-z' });
    ledLine(K, 'x', ix1 - ix0 - 0.04, ix0 + 0.02, y, iz0, { face: '+z' });
    ledLine(K, 'z', iz1 - iz0 - 0.04, ix0, y, iz0 + 0.02, { face: '+x' });
    ledLine(K, 'z', iz1 - iz0 - 0.04, ix1, y, iz0 + 0.02, { face: '-x' });
  }
  lamp(K, -w * 0.22, yb - 0.05, 0, { type: 'spot', intensity: 10 + w * 1.4, distance: 9 });
  lamp(K, w * 0.22, yb - 0.05, 0, { type: 'spot', intensity: 10 + w * 1.4, distance: 9 });

  // ---------------------------------------------------------------- roof
  let louvres = null;
  if (c.roof === 'louvre') {
    // blades across x, 200 mm pitch; side beams hide the drive and pivots
    const len = ix1 - ix0 - 0.02;
    const n = Math.floor((iz1 - iz0 - 0.02) / 0.2);
    const off = (iz1 - iz0 - n * 0.2) / 2;
    const geo = louvreGeometry(len);
    louvres = new THREE.InstancedMesh(geo, mats.frame, n);
    louvres.castShadow = louvres.receiveShadow = true;
    louvres.name = 'louvres';
    louvres.userData.z = Array.from({ length: n }, (_, i) => iz0 + off + 0.1 + i * 0.2);
    louvres.userData.y = yt - 0.07;
    // inner gutter channel along the front/back beams
    part(K, 'aluDark', ix1 - ix0, 0.02, 0.05, 0, yt - 0.14, iz0 + 0.025);
    part(K, 'aluDark', ix1 - ix0, 0.02, 0.05, 0, yt - 0.14, iz1 - 0.025);
    // pivot pins / end caps at the blade ends
    for (const z of louvres.userData.z)
      for (const x of [ix0 + 0.006, ix1 - 0.006]) part(K, 'aluDark', 0.012, 0.03, 0.03, x, yt - 0.07, z, { round: 0.004 });
  } else if (c.roof === 'wood') {
    // steel cross beams 160 × 80 + thermowood slats 45 × 95 at 80 mm along the depth
    const nb = Math.max(1, Math.round((ix1 - ix0) / 1.5));
    for (let i = 1; i < nb; i++) {
      const x = ix0 + ((ix1 - ix0) * i) / nb;
      tube(K, 'frame', 'z', iz0, iz1, 0.08, 0.16, x, yt - 0.1 - 0.08, 0, { r: 0.005 });
    }
    const pitch = 0.08;
    const n = Math.floor((ix1 - ix0) / pitch);
    const off = (ix1 - ix0 - (n - 1) * pitch) / 2;
    for (let i = 0; i < n; i++) slat(K, 'wood', 'z', iz1 - iz0 - 0.01, 0.045, 0.095, ix0 + off + i * pitch, yt - 0.1, iz0 + 0.005, { wood: true });
  } else if (c.roof === 'acp') {
    // closed roof: ACP over a hidden frame, ceiling of graphite ACP with recessed downlights
    part(K, 'acp', ix1 - ix0, 0.006, iz1 - iz0, 0, yt - 0.01, 0);
    const yc = yb + 0.09;
    const n = Math.max(1, Math.round((iz1 - iz0) / 1.2));
    const L = (iz1 - iz0) / n;
    for (let i = 0; i < n; i++) part(K, 'soffitGraphite', ix1 - ix0 - 0.01, 0.012, L - 0.01, 0, yc, iz0 + (i + 0.5) * L, { round: 0.002, seg: 2 });
    const cols = Math.max(2, Math.round((ix1 - ix0) / 1.3)), rows = Math.max(2, Math.round((iz1 - iz0) / 1.3));
    const ring = new THREE.CylinderGeometry(0.045, 0.045, 0.006, 32);
    const lens = new THREE.CylinderGeometry(0.032, 0.032, 0.004, 32);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = ix0 + ((ix1 - ix0) * (i + 0.5)) / cols, z = iz0 + ((iz1 - iz0) * (j + 0.5)) / rows;
        K.batch.add('aluDark', ring.clone(), M(x, yc - 0.008, z));
        K.batch.add('led', lens.clone(), M(x, yc - 0.011, z));
      }
  } else {
    // monolithic polycarbonate on aluminium T-rafters, 3° fall to the back, clamp profiles
    const n = Math.max(2, Math.ceil((ix1 - ix0) / 1.0));
    const ang = THREE.MathUtils.degToRad(3);
    const Ld = (iz1 - iz0) / Math.cos(ang);
    const yc = yt - 0.06;
    for (let i = 0; i <= n; i++) {
      const x = ix0 + ((ix1 - ix0) * i) / n;
      part(K, 'frame', 0.05, 0.1, Ld, x, yc - 0.06, 0, { rx: -ang, round: 0.003 });
      part(K, 'alu', 0.05, 0.012, Ld, x, yc + 0.012, 0, { rx: -ang, round: 0.003 });
    }
    part(K, 'pc', ix1 - ix0, 0.008, Ld, 0, yc, 0, { rx: -ang });
  }

  // ---------------------------------------------------------------- screens (vertical thermowood slats)
  const screen = (side) => {
    const y0 = yF + 0.06, y1 = yb - 0.06;
    const sw = 0.04, sd = 0.06, pitch = 0.075;
    const along = side === 'back' ? 'x' : 'z';
    const a = (along === 'x' ? -px : -pz) + S / 2 + 0.01, b = (along === 'x' ? px : pz) - S / 2 - 0.01;
    const f = side === 'back' ? -pz : side === 'left' ? -px : px;
    const n = Math.floor((b - a - sw) / pitch) + 1;
    const off = (b - a - (n - 1) * pitch) / 2;
    // top and bottom rails 40 × 40
    if (along === 'x') {
      tube(K, 'frame', 'x', a, b, 0.04, 0.04, 0, y0 - 0.02, f);
      tube(K, 'frame', 'x', a, b, 0.04, 0.04, 0, y1 + 0.02, f);
      for (let i = 0; i < n; i++) vslat(K, 'wood', a + off + i * pitch, y0, f, y1 - y0, sw, sd, true);
    } else {
      tube(K, 'frame', 'z', a, b, 0.04, 0.04, f, y0 - 0.02, 0);
      tube(K, 'frame', 'z', a, b, 0.04, 0.04, f, y1 + 0.02, 0);
      for (let i = 0; i < n; i++) vslat(K, 'wood', f, y0, a + off + i * pitch, y1 - y0, sw, sd, false);
    }
  };
  for (const sd of ['back', 'left', 'right']) if (c.extras.includes(sd)) screen(sd);

  // ---------------------------------------------------------------- furniture & planters
  if (c.furniture === 'lounge') loungeSet(K, 0, yF, 0, w - 2 * S, d - 2 * S);
  else if (c.furniture === 'dining' && w >= 3.4) diningSet(K, 0, yF, 0.05, w, d);
  const plants = [];
  if (c.extras.includes('planters')) {
    for (const sx of [-1, 1]) {
      const x = sx * (X1 + pad + 0.45), z = Z1 - 0.2;
      plants.push({ x, z, y: planter(K, x, z), h: 0.95 });
    }
  }

  // ---------------------------------------------------------------- paving around the podium
  const pv = { x0: P.x0 - 0.9, x1: P.x1 + 0.9, z0: P.z0 - 0.9, z1: P.z1 + 1.3 };
  const g = new THREE.BoxGeometry(pv.x1 - pv.x0, 0.05, pv.z1 - pv.z0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + 0.9, p.getZ(i) + 0.4);
  K.batch.add('pavers', g, M(0, -0.02, (pv.z0 + pv.z1) / 2));
  const group = K.batch.build(mats);
  const pm = group.getObjectByName('pavers');
  if (pm) pm.castShadow = false;
  if (louvres) group.add(louvres);
  for (const L of K.lights) {
    group.add(L);
    if (L.target) group.add(L.target);
  }
  return { group, mats, lights: K.lights, louvres, plants, bounds: pv, meta: { yF, yb, yt } };
}

/** Sets the louvre blade angle (degrees, 0 = closed, 90 = fully open). */
export function setLouvres(louvres, deg) {
  if (!louvres) return;
  const m = new THREE.Matrix4();
  const a = THREE.MathUtils.degToRad(deg);
  louvres.userData.z.forEach((z, i) => {
    m.compose(new THREE.Vector3(0, louvres.userData.y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-a, 0, 0)), new THREE.Vector3(1, 1, 1));
    louvres.setMatrixAt(i, m);
  });
  louvres.instanceMatrix.needsUpdate = true;
  louvres.computeBoundingSphere();
}
