// Shared building blocks of the СТИЛАР metal structures: rectangular steel tubes with rolled corners,
// post shoes, slats (steel and thermowood), screw heads, LED profiles, trapezoidal roof sheet, materials.
import * as THREE from 'three';
import { Batch, beam, box, M, rng, pipe } from '../geom.js';
import { surface, powderCoat, aluminium, ledDiffuser, polycarbonate, setFinish } from '../materials.js';

export const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);

export function makeKit(mats, seed = 1) {
  const K = { batch: new Batch(), mats, rnd: rng(seed), lights: [] };
  return K;
}

// ---------------------------------------------------------------- materials
export function baseMaterials() {
  const teak = (o = {}) => surface('teak', { tint: 'natural', vertexColors: true, roughness: 0.62, ...o });
  const m = {
    // powder-coated steel: frame (posts, beams), slats and flashings share the configurator RAL colour
    frame: powderCoat('#474a50'),
    slat: powderCoat('#474a50', { roughness: 0.5 }),
    flash: powderCoat('#474a50', { roughness: 0.42 }),
    acp: powderCoat('#474a50', { roughness: 0.32, sheen: 0.6 }), // aluminium composite cassettes: smoother, glossier
    backing: new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.9 }),
    soffitWhite: powderCoat('#eceeec', { roughness: 0.38, sheen: 0.4 }),
    soffitGraphite: powderCoat('#3a3d41', { roughness: 0.34, sheen: 0.5 }),
    deckSheet: powderCoat('#5b5e62', { roughness: 0.5 }), // profiled sheet top (seen only from above)
    galv: new THREE.MeshStandardMaterial({ color: '#a9adb0', roughness: 0.42, metalness: 0.9 }),
    // thermowood / teak: slats, soffit boards, decking, table tops
    wood: teak(),
    woodDeck: teak({ roughness: 0.7 }),
    alu: aluminium(),
    aluDark: aluminium({ color: '#2b2d30', roughness: 0.4 }),
    led: ledDiffuser('#ffe6c4'),
    pc: polycarbonate('#cfd6d9', 0.3),
    rubber: new THREE.MeshStandardMaterial({ color: '#111213', roughness: 0.85 }),
    screw: new THREE.MeshStandardMaterial({ color: '#3d4045', roughness: 0.35, metalness: 0.7 }),
    // furniture
    // outdoor acrylic upholstery: woven texture + velvet-like sheen at grazing angles
    fabric: surface('fabric', { tint: 'paint', color: '#a7a196', contrast: 1.25, roughness: 0.92, normalScale: 1.4, sheen: '#e9e4da' }),
    fabricDark: surface('fabric', { tint: 'paint', color: '#45484b', contrast: 1.2, roughness: 0.9, normalScale: 1.4, sheen: '#8d9296' }),
    fabricAccent: surface('fabric', { tint: 'paint', color: '#8c6a4a', contrast: 1.2, roughness: 0.9, normalScale: 1.4, sheen: '#d9b48c' }),
    cord: new THREE.MeshStandardMaterial({ color: '#3b3a37', roughness: 0.8 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#2f3336', roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 }), // glazed stoneware
    stone: surface('porcelain', { tint: 'paint', color: '#8d8a85', contrast: 1.1, roughness: 0.55 }),
    tile: surface('porcelain', { tint: 'paint', color: '#a19d96', contrast: 1.15, roughness: 0.6 }),
    planter: surface('concrete', { tint: 'paint', color: '#6f6d6a', contrast: 0.9, roughness: 0.85 }),
    soil: surface('ground', { tint: 'stain', color: '#3a2c20', keep: 0.4, roughness: 1 }),
    wash: washMaterial(),
    glassTop: new THREE.MeshPhysicalMaterial({ color: '#2a2f31', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1 }),
  };
  m.pc.userData.noShadow = true;
  m.glassTop.userData.noShadow = true;
  m.deckSheet.side = THREE.DoubleSide;
  return m;
}

/** RAL colour of every powder-coated part. */
export function setMetal(mats, hex) {
  for (const k of ['frame', 'slat', 'flash', 'acp']) mats[k].color.set(hex);
  const c = new THREE.Color(hex);
  mats.deckSheet.color.copy(c).lerp(new THREE.Color('#6b6e72'), 0.4);
}

/** Thermowood tone: natural teak or an oil/stain colour. */
export function setWood(mats, f) {
  for (const k of ['wood', 'woodDeck']) setFinish(mats[k], f);
}

/** LED lines and light sources on/off. */
export function setGlow(mats, lights, on, level = 1) {
  for (const m of Object.values(mats)) {
    if (m.userData?.glow) m.emissiveIntensity = on ? 9 * level : 0;
    if (m.userData?.wash) m.opacity = on ? m.userData.wash * level : 0;
  }
  for (const L of lights) L.intensity = on ? L.userData.on * level : 0;
}

let washTex;
/** Additive light pool cast by an under-glow LED onto the paving (u along the strip, v away from it). */
function washMaterial() {
  if (!washTex) {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 128;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,214,160,1)');
    g.addColorStop(0.25, 'rgba(255,200,140,0.55)');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 8, 128);
    washTex = new THREE.CanvasTexture(c);
    washTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  m.userData.wash = 0.85;
  m.userData.noShadow = true;
  return m;
}

/** Light pool on the ground along a side of a podium: from (x0, z0) to (x1, z1), spreading `out` metres outwards. */
export function groundWash(K, x0, z0, x1, z1, nx, nz, out = 0.45, y = 0.012) {
  const pos = [x0, y, z0, x1, y, z1, x1 + nx * out, y, z1 + nz * out, x0 + nx * out, y, z0 + nz * out];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 0, 0.5, 0, 0.5, 1, 0.5, 1], 2));
  const up = (x1 - x0) * nz - (z1 - z0) * nx < 0; // keep the face pointing up
  g.setIndex(up ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  K.batch.add('wash', g);
}

// ---------------------------------------------------------------- primitives
/** Axis-aligned box (centre x, y, z). Rounded edges: rolled corners of steel tube, eased arrises of panels. */
export function part(K, key, w, h, d, x, y, z, { round = 0, seg = 3, rx = 0, ry = 0, rz = 0 } = {}) {
  K.batch.add(key, box(w, h, d, { round, seg }), M(x, y, z, rx, ry, rz));
}

/** Square / rectangular steel tube between two points along one axis. r ≈ 1.5 × wall thickness. */
export function tube(K, key, axis, a, b, w, h, cx, cy, cz, { r = 0.0045 } = {}) {
  const L = b - a, c = (a + b) / 2;
  if (axis === 'x') part(K, key, L, h, w, c, cy, cz, { round: r });
  else if (axis === 'z') part(K, key, w, h, L, cx, cy, c, { round: r });
  else part(K, key, w, L, h, cx, c, cz, { round: r });
}

/** Post: tube from the ground with a decorative shoe that hides the base plate and anchors. */
export function post(K, x, z, y1, s, { key = 'frame', shoe = true, sd = s } = {}) {
  tube(K, key, 'y', 0, y1, s, sd, x, 0, z, { r: Math.min(0.006, s * 0.06) });
  if (shoe) {
    const sh = 0.11;
    part(K, key, s + 0.03, sh, sd + 0.03, x, sh / 2, z, { round: 0.004 });
    // shadow gap between shoe and post
    part(K, 'backing', s + 0.006, 0.006, sd + 0.006, x, sh + 0.003, z);
  }
}

/** Countersunk screw heads (Ø8) on the outer face of a slat. */
export function screws(K, pts, out, { r = 0.0042, key = 'screw' } = {}) {
  const g0 = new THREE.CylinderGeometry(r * 0.75, r, 0.0024, 14);
  for (const [x, y, z] of pts) {
    const g = g0.clone();
    const m = out === 'x' ? M(x, y, z, 0, 0, Math.PI / 2) : out === '-x' ? M(x, y, z, 0, 0, -Math.PI / 2) : out === 'z' ? M(x, y, z, Math.PI / 2) : M(x, y, z, -Math.PI / 2);
    K.batch.add(key, g, m);
  }
}

/**
 * Horizontal slat along a run. Wood slats get per-board grain offset and tone (beam()), steel slats are
 * rolled tubes. dir: 'x' or 'z'. (x, y, z): start of the slat, bottom edge at y, centred in depth.
 */
export function slat(K, key, dir, len, w, h, x, y, z, { wood = false, endShade } = {}) {
  if (wood) {
    const g = beam(len, w, h, { kind: 'planed', rnd: K.rnd, endShade });
    K.batch.add(key, g, dir === 'x' ? M(x, y, z) : M(x, y, z, 0, -Math.PI / 2, 0));
  } else if (dir === 'x') part(K, key, len, h, w, x + len / 2, y + h / 2, z, { round: 0.003 });
  else part(K, key, w, h, len, x, y + h / 2, z + len / 2, { round: 0.003 });
}

/** Vertical wood slat (screens): bottom at y0, height h, section w (along the run) × d (depth). */
export function vslat(K, key, x, y0, z, h, w, d, alongX = true) {
  // beam runs along +x with section (z = d, y = w); Rz stands it up (section y → run direction), Ry turns the run to z
  const g = beam(h, d, w, { kind: 'planed', rnd: K.rnd });
  g.translate(0, -w / 2, 0);
  K.batch.add(key, g, mul(M(x, y0, z), M(0, 0, 0, 0, alongX ? 0 : Math.PI / 2, Math.PI / 2)));
}

/**
 * Recessed LED line: aluminium channel with an opal diffuser and end caps. Runs along `dir` from (x, y, z),
 * the diffuser face points down (-y) or sideways (face: '-y' | '+x' | '-x' | '+z' | '-z').
 */
export function ledLine(K, dir, len, x, y, z, { w = 0.025, face = '-y' } = {}) {
  const h = 0.012;
  const along = dir === 'x' ? [len, 0, 0] : [0, 0, len];
  const cx = x + along[0] / 2, cz = z + along[2] / 2;
  const sz = (a, b) => (dir === 'x' ? [len, a, b] : [b, a, len]);
  if (face === '-y') {
    // surface-mounted under y: channel hangs 12 mm below the soffit, diffuser flush with its underside
    const [w1, h1, d1] = sz(h, w + 0.006);
    part(K, 'alu', w1, h1, d1, cx, y - h / 2, cz, { round: 0.0015, seg: 2 });
    const [w2, h2, d2] = sz(0.004, w - 0.004);
    part(K, 'led', w2, h2, d2, cx, y - h - 0.0015, cz, { round: 0.0015, seg: 2 });
  } else {
    // side-facing strip (inside face of a beam): thin profile on a vertical surface
    const nx = face === '+x' ? 1 : face === '-x' ? -1 : 0, nz = face === '+z' ? 1 : face === '-z' ? -1 : 0;
    const t = 0.01;
    if (dir === 'x') {
      part(K, 'alu', len, w + 0.006, t, cx, y, cz + nz * t / 2, { round: 0.0015, seg: 2 });
      part(K, 'led', len, w - 0.004, 0.004, cx, y, cz + nz * (t + 0.001), { round: 0.0015, seg: 2 });
    } else {
      part(K, 'alu', t, w + 0.006, len, cx + nx * t / 2, y, cz, { round: 0.0015, seg: 2 });
      part(K, 'led', 0.004, w - 0.004, len, cx + nx * (t + 0.001), y, cz, { round: 0.0015, seg: 2 });
    }
  }
}

/** Light source that comes on with the LEDs in the evening (no shadows, cheap). */
export function lamp(K, x, y, z, { intensity = 2.2, distance = 6, color = '#ffd9a8', type = 'point', target } = {}) {
  let L;
  if (type === 'spot') {
    L = new THREE.SpotLight(color, 0, distance, Math.PI / 2.4, 0.85, 2);
    L.target.position.set(...(target || [x, 0, z]));
  } else L = new THREE.PointLight(color, 0, distance, 2);
  L.position.set(x, y, z);
  L.userData.on = intensity;
  K.lights.push(L);
  return L;
}

/**
 * Trapezoidal profiled sheet (С44-type: 44 mm ribs, 200 mm pitch) in the XZ plane, ribs along z.
 * x 0..width, z 0..length, top of the ribs at y = 0. Flat-shaded, metre UVs.
 */
export function profiledSheet(width, length, { pitch = 0.2, rib = 0.044, top = 0.045, bottom = 0.105 } = {}) {
  const sl = (pitch - top - bottom) / 2;
  const prof = [];
  for (let x = 0; x <= width + 1e-6; x += pitch) {
    prof.push([x, 0], [x + top, 0], [x + top + sl, -rib], [x + top + sl + bottom, -rib], [x + pitch, 0]);
  }
  const P = prof.filter((p, i) => i === 0 || p[0] !== prof[i - 1][0] || p[1] !== prof[i - 1][1]).map(([x, y]) => [Math.min(x, width), y]);
  const pos = [], nor = [], uv = [];
  let u = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1];
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (l < 1e-6) continue;
    const nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
    const quad = [[x0, y0, 0, u, 0], [x1, y1, 0, u + l, 0], [x1, y1, length, u + l, length], [x0, y0, 0, u, 0], [x1, y1, length, u + l, length], [x0, y0, length, u, length]];
    for (const [x, y, z, a, b] of quad) {
      pos.push(x, y, z);
      nor.push(nx, ny, 0);
      uv.push(a, b);
    }
    u += l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** Downpipe outlet at the foot of a post: the drain runs inside the post and leaves through a short spout. */
export function spout(K, x, z, out, s) {
  const [dx, dz] = out;
  const p0 = [x + dx * (s / 2 - 0.01), 0.3, z + dz * (s / 2 - 0.01)];
  const p1 = [x + dx * (s / 2 + 0.06), 0.3, z + dz * (s / 2 + 0.06)];
  const p2 = [x + dx * (s / 2 + 0.12), 0.2, z + dz * (s / 2 + 0.12)];
  K.batch.add('frame', pipe([p0, p1, p2], 0.028, { bend: 0.05, radial: 20 }));
}

export { M, box, beam, mul as mmul, polycarbonate };
