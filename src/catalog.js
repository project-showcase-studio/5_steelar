// Products, options and prices of СТИЛАР (steelar.pro, October 2026).
// «Навес HI-TECH»: «Стоимость навеса под ключ: от 10 500 руб. м²» (navesy-novosibirsk.html) — the only published
// rate, so the configurator multiplies it by the roof area and marks every option beyond the base specification
// «по запросу». «Перголы премиум класса»: «Цена по запросу» (besedki-novosibirsk.html) — no figure is shown.

export const COMPANY = {
  name: 'СТИЛАР',
  site: 'https://steelar.pro',
  city: 'Новосибирск, ул. Адриена Лежена, 9к3',
  phone: '+7 (383) 227-99-73',
  phoneHref: 'tel:+73832279973',
  mobile: '+7 923 777-55-59',
  mobileHref: 'tel:+79237775559',
  telegram: 'tg://resolve?domain=steelar54',
  email: 'zakaz@steelar.pro',
};

// polymer powder coat (the site: «Полимерное покрытие навесов»)
const RAL = {
  label: 'Цвет металла (порошковая окраска)',
  items: [
    { id: 'ral7024', label: 'RAL 7024', note: 'графит', color: '#474a50' },
    { id: 'ral7016', label: 'RAL 7016', note: 'антрацит', color: '#383e42' },
    { id: 'ral9005', label: 'RAL 9005', note: 'чёрный', color: '#151618' },
    { id: 'ral8019', label: 'RAL 8019', note: 'серо-коричневый', color: '#3e3634' },
    { id: 'ral9016', label: 'RAL 9016', note: 'белый', color: '#eef0ec' },
  ],
};
// thermowood: natural or oiled
const WOOD = {
  label: 'Тон термодерева',
  items: [
    { id: 'natural', label: 'Тик', note: 'натуральный', tint: 'natural' },
    { id: 'honey', label: 'Мёд', color: '#a57a49', tint: 'stain' },
    { id: 'walnut', label: 'Орех', color: '#5a3d28', tint: 'stain' },
    { id: 'smoke', label: 'Дымчатый', color: '#6f6a63', tint: 'stain' },
  ],
};

export const PRODUCTS = {
  hitech: {
    id: 'hitech',
    name: 'Навес HI-TECH',
    short: 'Навес HI-TECH',
    series: 'Навесы для автомобиля · современный минимализм',
    url: 'https://steelar.pro/navesy-novosibirsk.html',
    tagline: 'Плоский навес прямой формы: скрытая кровля за парапетом, фасад из ламелей или композита, подшив с LED-линиями. Металл, дерево, композит, стекло.',
    rate: 10500,
    priceNote: 'от 10 500 ₽ за м² под ключ',
    dims: {
      w: { label: 'Ширина', min: 3, max: 9, step: 0.5, unit: 'м', hint: '1 авто — 3,5 м, 2 авто — 6 м, 3 авто — 9 м' },
      d: { label: 'Глубина', min: 5, max: 8, step: 0.5, unit: 'м' },
      h: { label: 'Высота в свету', min: 2.4, max: 3.2, step: 0.1, unit: 'м' },
    },
    groups: [
      { key: 'post', title: 'Стойки', cards: [[100, '100 × 100 мм', 'Стенка 3 мм, для пролётов до 9 м', true], [80, '80 × 80 мм', 'Стенка 3 мм, для навесов до 6 м', true]] },
      { key: 'roof', title: 'Кровля', cards: [['sheet', 'Скрытая плоская', 'Профлист с уклоном за парапетом, подшив снизу', true], ['pc', 'Монолитный поликарбонат', 'Светопрозрачная, 8 мм, на алюминиевых прижимах', false]] },
      { key: 'fascia', title: 'Фасад (парапет)', cards: [['slats', 'Стальные ламели', '6 ламелей 75 мм с теневыми зазорами', true], ['wood', 'Термодерево', 'Ламели из термодерева на стальной подсистеме', false], ['acp', 'Композит (АКП)', 'Гладкие кассеты с рустами 12 мм', false]] },
      { key: 'ceiling', title: 'Подшив потолка', when: (c) => c.roof === 'sheet', cards: [['white', 'Белые софиты', 'Металлические панели, V-шов', true], ['wood', 'Термодерево', 'Доска 90 мм с зазором', false], ['graphite', 'Графитовый АКП', 'Крупные панели с рустами', false]] },
    ],
    palettes: { metal: RAL, wood: WOOD },
    woodUsed: (c) => c.fascia === 'wood' || (c.roof === 'sheet' && c.ceiling === 'wood'),
    extras: [
      { id: 'led', label: 'LED-подсветка', note: 'Линейные светильники в подшиве' },
      { id: 'side', label: 'Боковой экран', note: 'Ламели в цвет фасада, левая сторона' },
      { id: 'back', label: 'Задний экран', note: 'Ламели во всю ширину' },
    ],
    defaults: { w: 6, d: 6, h: 2.6, post: 100, roof: 'sheet', fascia: 'slats', ceiling: 'white', metal: 'ral7024', wood: 'natural', extras: ['led', 'side'] },
    specs: (c) => [
      ['Размер', `${fmt(c.w)} × ${fmt(c.d)} м`],
      ['Площадь кровли', `${fmt(c.w * c.d)} м²`],
      ['Высота в свету', `${fmt(c.h)} м`],
      ['Машиномест', `${c.w >= 8.5 ? 3 : c.w >= 5.5 ? 2 : 1}`],
    ],
    included: [
      ['Каркас', 'Стойки 80×80 / 100×100 мм со стенкой от 3 мм, скрытые балки и прогоны'],
      ['Расчёт', 'Снеговые нагрузки для НСО'],
      ['Покрытие', 'Полимерная порошковая окраска по RAL'],
      ['Проект', '3D-визуализация вашего навеса'],
      ['Монтаж', 'Собственный сварочный цех и опытная монтажная бригада'],
      ['Гарантия', 'От 5 лет'],
    ],
  },
  pergola: {
    id: 'pergola',
    name: 'Пергола премиум',
    short: 'Пергола премиум',
    series: 'Беседки и перголы · лофт, хай-тек, модерн',
    url: 'https://steelar.pro/besedki-novosibirsk.html',
    tagline: 'Архитектурный акцент участка: металлический каркас и премиальные материалы — дерево, АКП, монолитный поликарбонат. LED-подсветка превращает перголу в световой объект вечером.',
    rate: null,
    priceNote: 'цена по запросу',
    dims: {
      w: { label: 'Ширина', min: 3, max: 6, step: 0.25, unit: 'м' },
      d: { label: 'Глубина', min: 3, max: 6, step: 0.25, unit: 'м' },
      h: { label: 'Высота в свету', min: 2.4, max: 3.0, step: 0.1, unit: 'м' },
    },
    groups: [
      { key: 'roof', title: 'Кровля', cards: [['louvre', 'Поворотные ламели', 'Алюминий, угол 0–90°: тень, свет и защита от дождя'], ['wood', 'Термодерево', 'Ламели 45 × 95 мм на стальных балках'], ['acp', 'Композит (АКП)', 'Глухая кровля, потолок с точечными светильниками'], ['pc', 'Монолитный поликарбонат', 'Светопрозрачная, на алюминиевых профилях']] },
      { key: 'floor', title: 'Пол', cards: [['deck', 'Подиум из термодерева', 'Террасная доска 140 мм'], ['tile', 'Керамогранит', 'Крупный формат на подиуме'], ['lawn', 'Без подиума', 'Стойки на винтовых сваях']] },
      { key: 'furniture', title: 'Обстановка на модели', cards: [['lounge', 'Лаунж-зона', 'Диван, кресла, столик'], ['dining', 'Обеденная', 'Стол из тика и 6 стульев'], ['none', 'Пусто', 'Только конструкция']], decor: true },
    ],
    palettes: { metal: RAL, wood: WOOD },
    woodUsed: (c) => c.roof === 'wood' || c.floor === 'deck' || ['back', 'left', 'right'].some((s) => c.extras.includes(s)) || c.furniture !== 'none',
    extras: [
      { id: 'led', label: 'LED-подсветка', note: 'Контур каркаса и подиума' },
      { id: 'back', label: 'Экран сзади', note: 'Вертикальные ламели из термодерева' },
      { id: 'left', label: 'Экран слева', note: 'Вертикальные ламели из термодерева' },
      { id: 'right', label: 'Экран справа', note: 'Вертикальные ламели из термодерева' },
      { id: 'planters', label: 'Кашпо с растениями', note: 'Пара у входа', decor: true },
    ],
    defaults: { w: 4.5, d: 4, h: 2.7, angle: 55, roof: 'louvre', floor: 'deck', furniture: 'lounge', metal: 'ral7024', wood: 'natural', extras: ['led', 'back', 'planters'] },
    specs: (c) => [
      ['Размер', `${fmt(c.w)} × ${fmt(c.d)} м`],
      ['Площадь', `${fmt(c.w * c.d)} м²`],
      ['Высота в свету', `${fmt(c.h)} м`],
      ['Стиль', c.roof === 'louvre' || c.roof === 'acp' ? 'хай-тек' : c.roof === 'wood' ? 'лофт' : 'модерн'],
    ],
    included: [
      ['Каркас', 'Металлический, стойки 150 × 150 мм, балки 250 × 120 мм со скрытым водостоком'],
      ['Обшивка', 'Натуральное дерево, алюминиевый композит, монолитный поликарбонат и другие материалы'],
      ['Свет', 'LED-подсветка по контуру — пергола становится световым объектом'],
      ['Покрытие', 'Полимерная порошковая окраска по RAL'],
      ['Монтаж', 'Под ключ, под ваш участок'],
    ],
  },
};

export function fmt(n) {
  return (Math.round(n * 100) / 100).toLocaleString('ru-RU');
}

/** Price as published: rate × area for the carport ("от"), by request for the pergola. */
export function price(id, c) {
  const P = PRODUCTS[id];
  const area = c.w * c.d;
  const extras = P.extras.filter((e) => !e.decor && c.extras.includes(e.id));
  const upgrades = P.groups
    .filter((g) => !g.decor && (!g.when || g.when(c)))
    .map((g) => [g, g.cards.find((x) => x[0] === c[g.key])])
    .filter(([, x]) => x && x[3] === false)
    .map(([g, x]) => `${g.title.replace(/ \(.*\)/, '')}: ${x[1].toLowerCase()}`);
  return { area, base: P.rate ? Math.round(area * P.rate) : null, extras, upgrades };
}

export const rub = (n) => n.toLocaleString('ru-RU').replace(/[  ,]/g, ' ') + ' ₽';
