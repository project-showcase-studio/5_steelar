import * as THREE from 'three';
import { Engine } from './engine.js';
import { PRODUCTS, COMPANY, price, rub, fmt } from './catalog.js';
import { preloadSets, onTextureReady, BASE } from './materials.js';
import { setMetal, setWood, setGlow } from './models/kit.js';
import { makeGround, makeFence, makeTrees, placed, mulchBed } from './site.js';

const MODELS = {
  hitech: () => import('./models/carport.js').then((m) => ({ def: m.CARPORT })),
  pergola: () => import('./models/pergola.js').then((m) => ({ def: m.PERGOLA, setLouvres: m.setLouvres })),
};

const $ = (s) => document.querySelector(s);
const engine = new Engine($('#viewport'));
onTextureReady.add(() => engine.invalidate(3));
preloadSets(['teak', 'fabric', 'pavers', 'porcelain', 'concrete', 'grass', 'ground']);

const params = new URLSearchParams(location.search);
const qp = params.get('p');
// shareable view: ?cam=x,y,z,tx,ty,tz (camera and target) and ?tod=evening; ?clean — scene only
const qcam = (params.get('cam') || '').split(',').map(Number);
if (params.has('clean')) document.body.classList.add('clean');
const state = {
  product: PRODUCTS[qp] ? qp : 'hitech',
  tod: params.get('tod') === 'evening' ? 'evening' : 'day',
  cfg: {},
};
for (const id of Object.keys(PRODUCTS)) state.cfg[id] = structuredClone(PRODUCTS[id].defaults);

// ---------------------------------------------------------------- scene
const scene = engine.scene;
scene.add(makeGround());
scene.add(makeFence({ runs: [[[-15, -13], [17, -13]], [[-15, 14], [-15, -13]]] }));
const world = new THREE.Group();
scene.add(world);
const plants = new THREE.Group();
scene.add(plants);
let current = null; // { id, def, mod, built, key }
const matsCache = {};

const structuralKey = (id, c) => {
  const { angle, metal, wood, ...rest } = c;
  return JSON.stringify([id, rest]);
};

let queued = null, building = false;
/** Rebuilds the model; rapid slider input collapses into one build per frame. */
function rebuild(opts = {}) {
  queued = { ...(queued || {}), ...opts };
  if (building) return;
  building = true;
  requestAnimationFrame(async () => {
    const o = queued;
    queued = null;
    await doBuild(o);
    building = false;
    if (queued) rebuild();
  });
}

async function doBuild({ fly = false } = {}) {
  const id = state.product;
  const mod = await MODELS[id]();
  const c = state.cfg[id];
  const key = structuralKey(id, c);
  const productChanged = !current || current.id !== id;
  if (current && current.key === key) return;
  const mats = matsCache[id] || (matsCache[id] = mod.def.materials());
  const built = mod.def.build(c, mats);
  if (current) {
    world.remove(current.built.group);
    current.built.group.traverse((m) => m.isMesh && m.geometry.dispose());
  }
  world.add(built.group);
  current = { id, def: mod.def, mod, built, key };
  if (built.louvres) mod.setLouvres(built.louvres, c.angle);
  engine.sunFrom = mod.def.sun;
  applyLooks();
  if (productChanged) await applyTod();
  else applyGlow();
  placePlants(built);
  if (fly || productChanged) {
    const [p, t] = qcam.length === 6 && qcam.every(Number.isFinite) && !state.started ? [qcam.slice(0, 3), qcam.slice(3)] : fit(mod.def.views(c).main);
    if (!state.started) {
      engine.camera.position.set(...p);
      engine.controls.target.set(...t);
      state.started = true;
    } else engine.flyTo(p, t);
  }
  engine.invalidate(3);
}

/** Pulls a preset view back on narrow viewports so the whole structure stays in frame. */
function fit([p, t]) {
  const k = Math.min(1.4, Math.max(1, 1.1 / engine.camera.aspect));
  return [p.map((v, i) => t[i] + (v - t[i]) * k), t];
}

// ---------------------------------------------------------------- planting around the structure
let plantKey = '';
let plantGen = 0;
function placePlants(built) {
  const b = built.bounds;
  const k = JSON.stringify([current.id, b, built.plants]);
  if (k === plantKey) return;
  plantKey = k;
  const gen = ++plantGen;
  plants.clear();
  const spots = [];
  const beds = new THREE.Group();
  // shrub border behind the structure and a few at the sides, grounded on mulch beds
  const n = Math.max(3, Math.round((b.x1 - b.x0) / 1.6));
  for (let i = 0; i < n; i++) {
    const x = b.x0 + 0.2 + ((b.x1 - b.x0 - 0.4) * (i + 0.5)) / n, z = b.z0 - 1.1 - (i % 2) * 0.3;
    spots.push({ kind: ['bush1', 'bush2', 'bush3'][i % 3], x, z, seed: 3 + i, rot: i * 1.7, scale: 0.9 + (i % 3) * 0.2 });
    beds.add(mulchBed(x, z, 0.75, i + 1));
  }
  for (const [x, z, s] of [[b.x1 + 1.3, b.z0 + 0.8, 1.15], [b.x0 - 1.4, b.z1 - 1.2, 0.9], [b.x1 + 1.1, b.z1 - 0.4, 0.7]]) {
    spots.push({ kind: 'bush1', x, z, seed: 9, rot: x, scale: s });
    beds.add(mulchBed(x, z, s * 0.62 + 0.15, Math.round(x * 7)));
  }
  for (const p of built.plants || []) spots.push({ kind: 'bush2', x: p.x, y: p.y - 0.05, z: p.z, seed: 7, rot: p.x, scale: p.h });
  plants.add(beds);
  placed('rock_moss_set_01', { height: 0.32, x: b.x1 + 0.9, z: b.z0 - 0.2, rotY: 0.5 }).then((o) => gen === plantGen && (plants.add(o), engine.invalidate()));
  makeTrees(spots, () => engine.invalidate()).then((g) => {
    if (gen === plantGen) plants.add(g);
    engine.invalidate(3);
  });
}

// ---------------------------------------------------------------- trees (shared, generated once)
async function plantTrees() {
  const R = mulberryLocal(5);
  const spots = [];
  const ring = [
    ['spruce', -20, -17], ['spruce', -25, -6], ['birch', -22, 9], ['spruce', -14, -24], ['birch', 4, -24], ['spruce', 14, -22],
    ['birch', 24, -12], ['spruce', 28, -1], ['birch', -30, -20], ['spruce', -4, -33], ['spruce', 26, -28], ['birch', -27, 19],
    ['spruce', 34, 10], ['birch', -13, 26], ['spruce', -36, 4],
  ];
  ring.forEach(([kind, x, z], i) => spots.push({ kind, x: x + (R() - 0.5) * 2, z: z + (R() - 0.5) * 2, seed: 10 + (i % 3), rot: R() * 6.28, scale: 0.85 + R() * 0.35 }));
  // distant pine & birch forest edge (Novosibirsk), keeps the horizon from looking empty
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * 0.95 + (i / 46) * Math.PI * 1.55 + (R() - 0.5) * 0.08;
    const r = 52 + R() * 26;
    spots.push({ kind: R() < 0.72 ? 'spruce' : 'birch', x: Math.cos(a) * r, z: Math.sin(a) * r, seed: 10 + (i % 3), rot: R() * 6.28, scale: 1.0 + R() * 0.5, far: true });
  }
  const g = await makeTrees(spots, () => engine.invalidate());
  scene.add(g);
  engine.invalidate(3);
}
function mulberryLocal(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- looks (material-only changes)
function finishOf(item) {
  if (item.tint === 'natural') return { natural: true };
  return { natural: false, color: item.color, keep: 0.4, contrast: 1.1 };
}
function pick(id, group) {
  const P = PRODUCTS[id];
  return P.palettes[group].items.find((i) => i.id === state.cfg[id][group]) || P.palettes[group].items[0];
}
function applyLooks() {
  if (!current) return;
  const m = current.built.mats;
  setMetal(m, pick(current.id, 'metal').color);
  setWood(m, finishOf(pick(current.id, 'wood')));
  engine.invalidate(3);
}
function applyGlow() {
  if (!current) return;
  const on = state.tod === 'evening' && state.cfg[current.id].extras.includes('led');
  setGlow(current.built.mats, current.built.lights, on);
  engine.invalidate(3);
}
async function applyTod() {
  await engine.setEnvironment(state.tod);
  applyGlow();
}

// ---------------------------------------------------------------- UI
const VIEWS = [
  ['main', 'Общий вид'],
  ['front', 'Фасад'],
  ['inside', 'Внутри'],
  ['side', 'Сбоку'],
  ['top', 'Сверху'],
];

function renderHeader() {
  $('#models').innerHTML = Object.values(PRODUCTS)
    .map((p) => `<button data-p="${p.id}" class="${p.id === state.product ? 'on' : ''}">${p.short}</button>`)
    .join('');
  $('#views').innerHTML = VIEWS.map(([k, l]) => `<button data-v="${k}">${l}</button>`).join('');
  $('#tod').innerHTML = [
    ['day', 'День'],
    ['evening', 'Вечер'],
  ]
    .map(([k, l]) => `<button data-t="${k}" class="${state.tod === k ? 'on' : ''}">${l}</button>`)
    .join('');
}
$('#models').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b || b.dataset.p === state.product) return;
  state.product = b.dataset.p;
  history.replaceState(null, '', '?p=' + state.product);
  renderAll();
  rebuild({ fly: true });
};
$('#views').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b || !current) return;
  const v = current.def.views(state.cfg[current.id])[b.dataset.v];
  const [p, t] = b.dataset.v === 'inside' ? v : fit(v);
  engine.flyTo(p, t);
};
$('#tod').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.tod = b.dataset.t;
  renderHeader();
  applyTod();
};

function renderProject() {
  const P = PRODUCTS[state.product], c = state.cfg[state.product];
  $('#project').innerHTML = `
    <div class="eyebrow">${P.series.split(' · ').map((t) => `<span>${t}</span>`).join(' · ')}</div>
    <h1>${P.name}</h1>
    <p class="tag">${P.tagline}</p>
    <dl class="specs" id="specs">${specsHtml(P, c)}</dl>
    <details class="incl"><summary>Что входит</summary>
      <dl>${P.included.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </details>`;
}
const specsHtml = (P, c) => P.specs(c).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

function swatch(item, on, group) {
  const bg = item.tint === 'natural' ? `url(${BASE}tex/teak/color.webp) center/320%` : item.color;
  return `<button class="sw ${on ? 'on' : ''}" data-g="${group}" data-v="${item.id}" title="${item.label}${item.note ? ' — ' + item.note : ''}">
      <i style="background:${bg}"></i><span>${item.label}${item.note ? `<small>${item.note}</small>` : ''}</span></button>`;
}
const palette = (P, c, g) =>
  `<div class="pal"><h3>${P.palettes[g].label}</h3><div class="sws">${P.palettes[g].items.map((it) => swatch(it, c[g] === it.id, g)).join('')}</div></div>`;

function renderOptions() {
  const id = state.product, P = PRODUCTS[id], c = state.cfg[id];
  let num = 0;
  const sec = (title, body, sub = '') => `<section class="opt"><h2><em>${String(++num).padStart(2, '0')}</em>${title}${sub ? `<span>${sub}</span>` : ''}</h2>${body}</section>`;
  const priced = !!P.rate;
  let html = '';
  html += sec(
    'Размеры',
    Object.entries(P.dims)
      .map(
        ([k, d]) => `<label class="dim"><span><b>${d.label}</b><output id="o-${k}">${fmt(c[k])} ${d.unit}</output></span>
        <input type="range" data-dim="${k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${c[k]}">
        ${d.hint ? `<small>${d.hint}</small>` : ''}</label>`,
      )
      .join(''),
    'шаг ' + fmt(P.dims.w.step) + ' м',
  );
  for (const g of P.groups) {
    if (g.when && !g.when(c)) continue;
    let body = `<div class="cards ${g.cards.length > 3 ? 'c2' : ''}">${g.cards
      .map(([v, l, d, incl]) => {
        const tag = g.decor ? '' : priced ? (incl ? 'входит' : 'по запросу') : '';
        return `<button data-k="${g.key}" data-v="${v}" class="card ${String(c[g.key]) === String(v) ? 'on' : ''}"><b>${l}</b><small>${d}</small>${tag ? `<em class="${incl ? '' : 'req'}">${tag}</em>` : ''}</button>`;
      })
      .join('')}</div>`;
    if (g.key === 'roof' && c.roof === 'louvre')
      body += `<label class="dim"><span><b>Угол ламелей</b><output id="o-angle">${c.angle}°</output></span>
        <input type="range" id="angle" min="0" max="90" step="1" value="${c.angle}"><small>0° — закрыто, защита от дождя · 90° — максимум света и проветривания</small></label>`;
    html += sec(g.title, body, g.decor ? 'для визуализации' : '');
  }
  html += sec('Цвет', palette(P, c, 'metal') + (P.woodUsed(c) ? palette(P, c, 'wood') : ''), 'входит');
  html += sec(
    'Дополнительно',
    `<div class="list">${P.extras
      .map(
        (s) => `<label class="row check ${c.extras.includes(s.id) ? 'on' : ''}"><input type="checkbox" value="${s.id}" ${c.extras.includes(s.id) ? 'checked' : ''}>
        <span><b>${s.label}</b><small>${s.note}</small></span><em>${s.decor ? 'декор' : 'по запросу'}</em></label>`,
      )
      .join('')}</div>`,
    'рассчитаем индивидуально',
  );
  $('#options').innerHTML = html;
}

function renderSummary() {
  const id = state.product, P = PRODUCTS[id], c = state.cfg[id];
  const p = price(id, c);
  const req = [...p.upgrades, ...p.extras.map((e) => e.label)];
  $('#summary').innerHTML = P.rate
    ? `<div class="sum-lines">
        <div><span>${fmt(c.w)} × ${fmt(c.d)} м · ${fmt(p.area)} м² × ${rub(P.rate)}</span><b>${rub(p.base)}</b></div>
        ${req.length ? `<div><span>${req.join(', ')}</span><b>по запросу</b></div>` : ''}
      </div>
      <div class="sum-total"><span>Навес под ключ</span><strong><small>от</small> ${rub(p.base)}</strong><small>${P.priceNote} · точную стоимость назовёт специалист</small></div>
      <button class="btn primary" id="send">Получить точный расчёт</button>`
    : `<div class="sum-lines">
        <div><span>${fmt(c.w)} × ${fmt(c.d)} м · ${fmt(p.area)} м²</span><b>${PRODUCTS[id].groups[0].cards.find((x) => x[0] === c.roof)[1]}</b></div>
      </div>
      <div class="sum-total"><span>Стоимость</span><strong>Цена по запросу</strong><small>Рассчитаем под ваш участок и выбранные материалы</small></div>
      <button class="btn primary" id="send">Запросить стоимость</button>`;
  $('#send').onclick = openRequest;
}

function renderAll() {
  renderHeader();
  renderProject();
  renderOptions();
  renderSummary();
}

// option clicks (cards, swatches)
$('#options').addEventListener('click', (e) => {
  const c = state.cfg[state.product];
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.k) {
    const v = t.dataset.v;
    c[t.dataset.k] = /^\d+$/.test(v) ? Number(v) : v;
    rebuild();
  } else if (t.dataset.g) {
    c[t.dataset.g] = t.dataset.v;
    applyLooks();
  } else return;
  renderOptions();
  renderSummary();
});
// sliders: live rebuild while dragging, panel re-rendered on release
$('#options').addEventListener('input', (e) => {
  const c = state.cfg[state.product];
  const t = e.target;
  if (t.dataset.dim) {
    c[t.dataset.dim] = Number(t.value);
    $('#o-' + t.dataset.dim).textContent = `${fmt(c[t.dataset.dim])} ${PRODUCTS[state.product].dims[t.dataset.dim].unit}`;
    $('#specs').innerHTML = specsHtml(PRODUCTS[state.product], c);
    renderSummary();
    rebuild();
  } else if (t.id === 'angle') {
    c.angle = Number(t.value);
    $('#o-angle').textContent = c.angle + '°';
    if (current?.built.louvres) {
      current.mod.setLouvres(current.built.louvres, c.angle);
      engine.invalidate(2);
    }
  }
});
$('#options').addEventListener('change', (e) => {
  const P = PRODUCTS[state.product], c = state.cfg[state.product];
  const t = e.target;
  if (t.type !== 'checkbox') return;
  c.extras = P.extras.map((s) => s.id).filter((sid) => (sid === t.value ? t.checked : c.extras.includes(sid)));
  rebuild();
  renderOptions();
  renderSummary();
});

function requestLines() {
  const id = state.product, P = PRODUCTS[id], c = state.cfg[id];
  const p = price(id, c);
  const card = (g) => g.cards.find((x) => String(x[0]) === String(c[g.key]))[1];
  return [
    `Изделие: ${P.name}`,
    `Размер: ${fmt(c.w)} × ${fmt(c.d)} м (${fmt(p.area)} м²), высота в свету ${fmt(c.h)} м`,
    ...P.groups.filter((g) => !g.decor && (!g.when || g.when(c))).map((g) => `${g.title}: ${card(g)}${g.key === 'roof' && c.roof === 'louvre' ? `, угол ${c.angle}°` : ''}`),
    `Цвет металла: ${pick(id, 'metal').label} (${pick(id, 'metal').note})`,
    ...(P.woodUsed(c) ? [`Термодерево: ${pick(id, 'wood').label}`] : []),
    `Дополнительно: ${p.extras.length ? p.extras.map((e) => e.label).join(', ') : 'нет'}`,
    P.rate ? `Ориентир: от ${rub(p.base)} (${P.priceNote})${p.extras.length || p.upgrades.length ? ' + опции по запросу' : ''}` : 'Стоимость: по запросу',
  ];
}

function openRequest() {
  const P = PRODUCTS[state.product];
  const lines = requestLines();
  $('#req-body').innerHTML = `<ul>${lines.map((l) => `<li>${l.replace(/^([^:]+):/, '<span>$1</span>')}</li>`).join('')}</ul>
    <p class="note">Рассчитаем снеговые нагрузки для НСО, подготовим 3D-визуализацию под ваш участок и назовём точную стоимость под ключ. Гарантия от 5 лет.</p>
    <p class="req-phone"><a href="${COMPANY.phoneHref}">${COMPANY.phone}</a> · <a href="${COMPANY.mobileHref}">${COMPANY.mobile}</a> · <a href="${COMPANY.telegram}">Telegram</a> · <a href="mailto:${COMPANY.email}">${COMPANY.email}</a></p>`;
  $('#req-link').href = P.url;
  $('#req-copy').onclick = (e) => {
    e.preventDefault();
    navigator.clipboard?.writeText(lines.join('\n'));
    $('#req-copy').textContent = 'Скопировано';
    setTimeout(() => ($('#req-copy').textContent = 'Скопировать расчёт'), 1600);
  };
  $('#request').showModal();
}

$('#shot').onclick = () => {
  const url = engine.capture(2560, 1440);
  const a = document.createElement('a');
  a.href = url;
  a.download = `СТИЛАР-${PRODUCTS[state.product].name.replace(/\s+/g, '-')}.png`;
  a.click();
};

// ---------------------------------------------------------------- start
renderAll();
(async () => {
  const bar = $('#loader i');
  bar.style.width = '30%';
  await engine.setEnvironment(state.tod);
  bar.style.width = '70%';
  await doBuild({ fly: true });
  bar.style.width = '85%';
  // compile every shader variant (both times of day) behind the loader instead of stalling the first frames
  await engine.renderer.compileAsync(scene, engine.camera).catch(() => {});
  bar.style.width = '100%';
  setTimeout(() => $('#loader').classList.add('done'), 250);
  setTimeout(() => plantTrees(), 300);
  setTimeout(() => document.body.setAttribute('data-ready', ''), 4000);
  setTimeout(() => $('#hint').classList.add('done'), 6000);
})();

globalThis.__app = { engine, state, get current() { return current; }, rebuild, applyLooks, applyTod };
