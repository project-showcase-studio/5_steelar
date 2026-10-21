// The plot: anti-tiling photo lawn, fence, trees and shrubs (ez-tree), scanned rocks.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadSet, surface, BASE, mulberry } from './materials.js';
import { box, beam, M, Batch, metreUV } from './geom.js';

// ---------------------------------------------------------------- lawn
export function makeGround() {
  const mat = new THREE.MeshStandardMaterial({ color: '#7d9a5a', roughness: 1 });
  const u = { uDirt: { value: null }, uOn: { value: 0 } };
  Promise.all([loadSet('grass'), loadSet('ground')]).then(([G, dirt]) => {
    const rep = (t, s) => {
      const c = t.clone();
      c.repeat.set(1 / s, 1 / s);
      c.needsUpdate = true;
      return c;
    };
    mat.map = rep(G.map, 2.6);
    mat.normalMap = rep(G.normal, 2.6);
    mat.normalScale.set(0.9, 0.9);
    const orm = rep(G.orm, 2.6);
    mat.roughnessMap = orm;
    mat.aoMap = orm;
    mat.color.set('#ffffff');
    u.uDirt.value = dirt.map;
    u.uOn.value = 1;
    mat.needsUpdate = true;
  });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uDirt; uniform float uOn;
        float gH(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float gN(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(gH(i),gH(i+vec2(1,0)),f.x), mix(gH(i+vec2(0,1)),gH(i+vec2(1,1)),f.x), f.y); }
        float gF(vec2 p){ return 0.55*gN(p)+0.3*gN(p*2.13+3.1)+0.15*gN(p*4.7+7.7); }`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec2 gUv = vMapUv;
          vec4 gA = texture2D(map, gUv);
          vec4 gB = texture2D(map, gUv * 0.37 + vec2(0.31, 0.77));
          vec4 gc = mix(gA, gB, smoothstep(0.35, 0.65, gF(gUv * 0.35)));
          float big = gF(gUv * 0.05 + 11.0);
          gc.rgb *= mix(vec3(0.78, 0.82, 0.7), vec3(1.02, 1.0, 0.86), big);
          float gl = dot(gc.rgb, vec3(0.2126, 0.7152, 0.0722));
          gc.rgb = mix(vec3(gl), gc.rgb, 0.72) * vec3(1.02, 1.0, 0.9);
          float dm = smoothstep(0.72, 0.88, gF(gUv * 0.16 + 5.0)) * uOn * 0.3;
          diffuseColor *= mix(gc, texture2D(uDirt, gUv * 0.7), dm);
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => 'lawn';
  const g = new THREE.CircleGeometry(400, 96);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  return mesh;
}

// ---------------------------------------------------------------- fence (horizontal thermowood boards on steel posts)
export function makeFence({ runs }) {
  const B = new Batch();
  const rnd = mulberry(77);
  const wood = surface('teak', { tint: 'stain', color: '#6b6359', vertexColors: true, keep: 0.35, roughness: 0.8 });
  const post = new THREE.MeshStandardMaterial({ color: '#2a2b2d', roughness: 0.5, metalness: 0.5 });
  const H = 1.8;
  const run = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(-(bz - az), bx - ax);
    const base = M(ax, 0, az, 0, ang, 0);
    const n = Math.ceil(L / 2.5);
    for (let i = 0; i <= n; i++) {
      const x = (L * i) / n;
      B.add('post', box(0.06, H + 0.05, 0.06), new THREE.Matrix4().multiplyMatrices(base, M(x, (H + 0.05) / 2, 0)));
    }
    for (let y = 0.12; y < H; y += 0.135) {
      for (let i = 0; i < n; i++) {
        const xa = (L * i) / n + 0.035, xb = (L * (i + 1)) / n - 0.035;
        const g = beam(xb - xa, 0.02, 0.115, { kind: 'board', rnd });
        B.add('wood', g, new THREE.Matrix4().multiplyMatrices(base, M(xa, y, 0.045)));
      }
    }
  };
  for (const [a, b] of runs) run(a[0], a[1], b[0], b[1]);
  const g = B.build({ wood, post });
  g.name = 'fence';
  return g;
}

// ---------------------------------------------------------------- GLB models (Poly Haven scans)
const gltf = new GLTFLoader();
const modelCache = new Map();
export function loadModel(name) {
  if (!modelCache.has(name))
    modelCache.set(
      name,
      gltf.loadAsync(`${BASE}models/${name}.glb`).then((g) => {
        g.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            ms.forEach((m) => {
              if (m.map) m.map.anisotropy = 8;
              if (m.alphaTest > 0 || m.transparent) m.side = THREE.DoubleSide;
            });
          }
        });
        return g.scene;
      }),
    );
  return modelCache.get(name).then((s) => s.clone(true));
}

// ---------------------------------------------------------------- planting beds
let mulchMat;
/** Bark-mulch bed under a shrub: a low irregular mound that grounds the plant on the lawn. */
export function mulchBed(x, z, r, seed = 1) {
  mulchMat ||= surface('ground', { tint: 'stain', color: '#4b3a2b', keep: 0.4, contrast: 1.3, roughness: 1 });
  const rnd = mulberry(seed * 977 + 13);
  const seg = 40;
  const g = new THREE.CircleGeometry(r, seg, 0, Math.PI * 2);
  const p = g.attributes.position;
  const ph = rnd() * 6.28;
  for (let i = 1; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    const k = 1 + 0.12 * Math.sin(a * 3 + ph) + 0.06 * Math.sin(a * 7 + ph * 2);
    p.setXY(i, p.getX(i) * k, p.getY(i) * k);
  }
  g.rotateX(-Math.PI / 2);
  // soft dome: 4 cm at the centre, feathered into the lawn
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i), p.getZ(i)) / (r * 1.15);
    p.setY(i, 0.012 + 0.03 * Math.max(0, 1 - d * d));
  }
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) + x, p.getZ(i) + z);
  const m = new THREE.Mesh(g, mulchMat);
  m.position.set(x, 0, z);
  m.receiveShadow = true;
  return m;
}

export async function placed(name, opts) {
  const { height, x = 0, y = 0, z = 0, rotY = 0 } = opts;
  const o = await loadModel(name);
  const b = new THREE.Box3().setFromObject(o);
  const s = height / (b.max.y - b.min.y);
  o.scale.setScalar(s);
  const c = b.getCenter(new THREE.Vector3());
  o.position.set(-c.x * s, -b.min.y * s, -c.z * s);
  const g = new THREE.Group();
  g.add(o);
  // scanned plants are sunk a few centimetres so the stems start in the soil, not on top of it
  g.position.set(x, y - (opts.sink ?? 0.04), z);
  g.rotation.y = rotY;
  return g;
}

// ---------------------------------------------------------------- trees (ez-tree)
const TREES = {
  spruce: { preset: 'Pine Medium', height: 13, tint: 0x9fb197, count: 1.7, size: 1.25 },
  birch: { preset: 'Aspen Medium', height: 11, tint: 0xc9d6b4, leaf: 'ash', count: 1.8, size: 1.1 },
  oak: { preset: 'Oak Medium', height: 9.5, tint: 0xa9b892 },
  // garden shrubs (height 1 m, scaled per planting): dense, leafy crowns
  bush1: { preset: 'Bush 1', height: 1, tint: 0x9fb48a, count: 2.2, size: 0.9 },
  bush2: { preset: 'Bush 1', height: 1, tint: 0xb2c294, count: 2.6, size: 1.0 },
  bush3: { preset: 'Bush 3', height: 1, tint: 0x8faa86, count: 2.0, size: 0.95 },
};
const protoCache = new Map();
async function treeProto(kind, seed) {
  const key = kind + seed;
  if (protoCache.has(key)) return protoCache.get(key);
  const p = (async () => {
    const { Tree } = await import('ez-tree');
    const K = TREES[kind];
    const tree = new Tree();
    tree.loadPreset(K.preset);
    tree.options.seed = seed;
    tree.options.leaves.tint = K.tint;
    if (K.leaf) tree.options.leaves.type = K.leaf;
    if (K.count) tree.options.leaves.count = Math.round(tree.options.leaves.count * K.count);
    if (K.size) tree.options.leaves.size *= K.size;
    tree.generate();
    const br = tree.branchesMesh, lv = tree.leavesMesh;
    const std = (ph, extra = {}) =>
      new THREE.MeshStandardMaterial({
        color: ph.color, map: ph.map || null, normalMap: ph.normalMap || null, aoMap: ph.aoMap || null, roughnessMap: ph.roughnessMap || null,
        roughness: 1, side: ph.side, alphaTest: ph.alphaTest, ...extra,
      });
    br.material = std(br.material);
    const lm = std(lv.material, { side: THREE.DoubleSide });
    // bend foliage normals outwards from the crown centre: soft, volumetric shading
    const lg = lv.geometry;
    lg.computeBoundingBox();
    const ctr = lg.boundingBox.getCenter(new THREE.Vector3());
    const pos = lg.attributes.position, nor = lg.attributes.normal;
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).sub(ctr).normalize();
      nn.fromBufferAttribute(nor, i);
      if (nn.dot(v) < 0) nn.negate();
      nn.lerp(v, 0.75).normalize();
      nor.setXYZ(i, nn.x, nn.y, nn.z);
    }
    lv.material = lm;
    const g = new THREE.Group();
    g.add(br, lv);
    [br, lv].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    const b = new THREE.Box3().setFromObject(g);
    const s = K.height / (b.max.y - b.min.y);
    g.scale.setScalar(s);
    g.position.y = -b.min.y * s;
    const w = new THREE.Group();
    w.add(g);
    // wait for textures
    const texs = [];
    w.traverse((o) => o.isMesh && ['map', 'normalMap', 'roughnessMap', 'aoMap'].forEach((k) => o.material[k] && texs.push(o.material[k])));
    await Promise.all(
      texs.map(
        (t) =>
          new Promise((res) => {
            const t0 = performance.now();
            const tick = () => (t.image && (t.image.naturalWidth || t.image.width) ? res() : performance.now() - t0 > 30000 ? res() : setTimeout(tick, 100));
            tick();
          }),
      ),
    );
    return w;
  })();
  protoCache.set(key, p);
  return p;
}

export async function makeTrees(spots, onEach) {
  const group = new THREE.Group();
  group.name = 'trees';
  for (const s of spots) {
    const proto = await treeProto(s.kind, s.seed);
    const t = proto.clone(true);
    t.position.set(s.x, s.y || 0, s.z);
    t.rotation.y = s.rot || 0;
    t.scale.setScalar(s.scale || 1);
    if (s.far) t.traverse((o) => o.isMesh && (o.castShadow = false));
    group.add(t);
    onEach && onEach();
    await new Promise((r) => setTimeout(r, 0));
  }
  return group;
}

export { metreUV };
