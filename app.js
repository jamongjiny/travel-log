/* 여행 기록장 PWA — 구글 시트(Apps Script) 버전 */
'use strict';

/* ───────── 기본 도구 ───────── */
const CFG = window.TL_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const UA = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(UA);
const isMobile = isIOS || isAndroid;

const CATS = [['이동', '🚗'], ['숙소', '🏨'], ['식사', '🍽️'], ['갈곳', '📍'], ['체험', '🎡'], ['쇼핑', '🛍️'], ['기타', '📝']];
const ICON = Object.fromEntries(CATS);
const iconOf = c => ICON[c] || '📌'; // 예전에 쓰던 다른 분류도 그대로 표시
const CCOL = { 이동: '#4C7BD9', 숙소: '#7C5CDB', 식사: '#E8742E', 갈곳: '#2F9E6E', 체험: '#D69E00', 쇼핑: '#D6336C', 기타: '#868E96' };
const won = n => '₩' + Math.round(+n || 0).toLocaleString('ko-KR');
const COLORS = {
  ocean: ['바다', 'p', '#DCEBF5', '#C4DDF0'],
  sky: ['하늘', 'p', '#E4F2FD', '#CBE5FA'],
  aqua: ['아쿠아', 'p', '#DDF4F3', '#C2EAE8'],
  mint: ['민트', 'p', '#DDF5EA', '#C3EBD7'],
  forest: ['숲', 'p', '#DDEEDD', '#C7E2CC'],
  sage: ['세이지', 'p', '#E7EDDF', '#D3DFC6'],
  lemon: ['레몬', 'p', '#FBF6D8', '#F5EAA8'],
  butter: ['버터', 'p', '#FBF0DA', '#F4DFAF'],
  sand: ['모래', 'p', '#F3EAD3', '#E9DBB8'],
  apricot: ['살구', 'p', '#FDE9DD', '#F9D3BD'],
  sunset: ['노을', 'p', '#FCE3D2', '#F8CDB8'],
  coral: ['코랄', 'p', '#FDE1DC', '#F8C5BD'],
  rose: ['장미', 'p', '#F8DFE4', '#F1C8D2'],
  blush: ['블러시', 'p', '#FBE5EF', '#F4CCDF'],
  lavender: ['라벤더', 'p', '#E7E1F5', '#D6CCEF'],
  lilac: ['라일락', 'p', '#F0E3F7', '#E1CBEF'],
  periwinkle: ['페리윙클', 'p', '#E4E7FA', '#CDD3F4'],
  cloud: ['구름', 'p', '#EFF1F4', '#DDE2E8'],
  dawn: ['새벽', 'g', '#FDE2E4', '#D7E3FC'],
  cotton: ['솜사탕', 'g', '#FBD5EA', '#D9D4F7'],
  peach: ['복숭아', 'g', '#FFE6D2', '#FBD1E1'],
  citrus: ['시트러스', 'g', '#FFF3C6', '#FFD9C4'],
  meadow: ['초원', 'g', '#E8F5D2', '#CDEFE3'],
  lagoon: ['라군', 'g', '#D2F1EC', '#D7E4FB'],
  aurora: ['오로라', 'g', '#D9F2EE', '#E8DAF6'],
  dusk: ['땅거미', 'g', '#E5DEF6', '#F6D6E3'],
  night: ['밤하늘', 'd', '#2B3448', '#1D2433'],
  navy: ['네이비', 'd', '#24406A', '#172B48'],
  pine: ['깊은 숲', 'd', '#24564A', '#163A31'],
  plum: ['자두', 'd', '#58355E', '#3A2240'],
  cocoa: ['코코아', 'd', '#5A4636', '#3B2D23']
}; // 이름, 묶음(p 파스텔 · g 그라데이션 · d 진한색), 색1, 색2
const COLOR_GROUPS = [['p', '파스텔'], ['g', '파스텔 그라데이션'], ['d', '진한 색']];
const covBg = k => { const c = COLORS[k] || COLORS.ocean; return `linear-gradient(135deg,${c[2]},${c[3]})`; };
const covCls = k => `c-${COLORS[k] ? k : 'ocean'}${(COLORS[k] || COLORS.ocean)[1] === 'd' ? ' c-dark' : ''}`;
(function () { const st = document.createElement('style'); st.textContent = Object.keys(COLORS).map(k => `.c-${k}{background:${covBg(k)}}`).join('\n'); document.head.appendChild(st); })();
const EMOJIS = ['✈️', '🏖️', '⛰️', '🚗', '🏯', '🌸', '🍜', '📚', '♨️', '🎡', '🌊', '🏕️', '🍁', '❄️'];
const PACK_SUG = ['신분증', '충전기', '보조배터리', '상비약', '세면도구', '선크림', '우산', '잠옷', '책', '여권', '유심 / eSIM', '카메라', '차 키'];
const WD = '일월화수목금토';

const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), b => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-3);
const nowISO = () => new Date().toISOString();
const isYmd = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const today = () => ymd(new Date());
const md = s => isYmd(s) ? `${+s.slice(5, 7)}.${+s.slice(8)}(${WD[pd(s).getDay()]})` : '';
const validYmd = s => isYmd(s) && ymd(pd(s)) === s;

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}

/* ───────── 상태 ───────── */
const S = {
  user: null, trips: [], items: [],
  tripId: null, tab: 'all', day: 0,
  home: 'up', theme: '', q: '',
  lastPull: 0, pulling: false, sheetUrl: '', costView: 'cat'
};

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

/* 보기 전용 공유 링크(?share=…)로 열었을 때: 그 여행 1건만, 읽기만 */
const SHARE_TOKEN = (new URLSearchParams(location.search).get('share') || '').replace(/[^0-9a-f]/gi, '');
const VIEW = SHARE_TOKEN ? { token: SHARE_TOKEN, opt: { cost: false, memo: false }, err: '' } : null;

function saveCache() { if (VIEW) return; if (S.user) LS.set('tl:data', { uid: S.user.id, trips: S.trips, items: S.items, at: Date.now() }); }
function loadCache(uid) {
  const c = LS.get('tl:data', null);
  if (c && c.uid === uid) { S.trips = c.trips || []; S.items = c.items || []; return true; }
  return false;
}

/* ───────── 구글 시트 API (Apps Script) ───────── */
const API_URL = String(CFG.API_URL || '').trim();
const configured = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(API_URL);
const getKey = () => localStorage.getItem('tl:key') || '';

class ApiError extends Error { constructor(m, net) { super(m); this.net = net; } }
async function api(action, payload = {}, key = getKey()) {
  let r;
  try {
    // Content-Type 을 붙이지 않아야(text/plain) 브라우저 사전 확인 없이 Apps Script로 바로 보낼 수 있어요
    r = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ key, action, ...payload }), redirect: 'follow' });
  } catch (e) { throw new ApiError('인터넷 연결을 확인해주세요', true); }
  let j;
  try { j = await r.json(); } catch (e) { throw new ApiError('Apps Script 응답을 읽지 못했어요. 배포 액세스가 "모든 사용자"인지 확인해주세요'); }
  if (j.error === 'key') {
    if (key && key === getKey()) { localStorage.removeItem('tl:key'); S.user = null; render(); toast('Apps Script의 비밀번호가 바뀌었어요. 다시 입력해주세요', 5000); }
    throw new ApiError('비밀번호가 맞지 않아요');
  }
  if (j.error) throw new ApiError(j.error);
  return j;
}

/* 시트 열 이름(기존 웹앱과 동일) ↔ 앱 내부 형식 */
const imgIds = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
function parseRoute(s) {
  if (!s) return null;
  const pt = v => {
    const m = String(v || '').split(',').map(Number);
    if (m.length !== 2 || !m.every(n => isFinite(n) && n !== 0)) return null;
    return Math.abs(m[1]) > 90 ? [m[1], m[0]] : m; // [경도, 위도]
  };
  const p = String(s).split('|');
  const g = p.length >= 2 ? { from: pt(p[0]), to: pt(p[1]) } : { from: null, to: pt(p[0]) };
  return g.from || g.to ? g : null;
}
function normTrip(t) {
  let pk = t.packing;
  if (typeof pk === 'string') { try { pk = JSON.parse(pk || '[]'); } catch (e) { pk = []; } }
  return {
    id: String(t.id), title: t.title || '', tags: t.tags || '', start_date: t.start_date || '', end_date: t.end_date || '',
    emoji: t.emoji || '✈️', color: COLORS[t.color] ? t.color : 'ocean', memo: t.memo || '', review: t.review || '',
    rating: t.rating ? +t.rating : 0, packing: Array.isArray(pk) ? pk.filter(p => p && p.t) : [],
    created_at: t.created_at || nowISO(), updated_at: t.updated_at || nowISO()
  };
}
function normItem(x) {
  return {
    id: String(x.id), trip_id: String(x.trip_id), date: x.date || '', end_date: x.end_date || '', time: x.time || '', end_time: x.end_time || '',
    category: x.category || '기타', title: x.title || '', place: x.place || '', cost: x.cost || '',
    link: x.link || '', memo: x.memo || '', ord: +x.ord || 0, route: x.route || '', geo: parseRoute(x.route),
    photos: Array.isArray(x.photos) ? x.photos : [], created_at: x.created_at || ''
  };
}
const fromSheetTrip = r => normTrip({
  id: r.id, title: r.title, tags: r.tags, start_date: r.startDate, end_date: r.endDate, emoji: r.emoji, color: r.color,
  memo: r.memo, review: r.review, rating: r.rating, packing: r.packing, created_at: r.createdAt, updated_at: r.updatedAt
});
const fromSheetItem = r => normItem({
  id: r.id, trip_id: r.tripId, date: r.date, end_date: r.endDate, time: r.time, end_time: r.endTime, category: r.category,
  title: r.title, place: r.place, cost: r.cost, link: r.link, memo: r.memo, ord: r.order, route: r.route,
  photos: imgIds(r.images).map(id => ({ id })), created_at: r.createdAt
});
const tripRow = t => ({
  id: t.id, title: t.title, tags: t.tags, startDate: t.start_date, endDate: t.end_date, emoji: t.emoji, color: t.color,
  memo: t.memo, review: t.review, rating: t.rating ? String(t.rating) : '', packing: JSON.stringify(t.packing),
  createdAt: t.created_at, updatedAt: t.updated_at
});
const itemRow = x => ({
  id: x.id, tripId: x.trip_id, date: x.date, endDate: x.end_date, time: x.time, endTime: x.end_time, category: x.category,
  title: x.title, place: x.place, cost: x.cost, link: x.link, memo: x.memo, order: String(x.ord), route: x.route,
  images: x.photos.map(p => p.id).filter(Boolean).join(','), createdAt: x.created_at
});

/* 변경 대기열 — 화면은 바로 바뀌고, 시트 저장은 뒤에서 한 번에 모아서 보냄 (오프라인이면 연결될 때) */
let OB = LS.get('tl:outbox', []);
let flushing = false, flushTimer = 0;
const saveOB = () => LS.set('tl:outbox', OB);

function queue(op) {
  if (VIEW) return; // 보기 전용: 아무것도 저장하지 않음
  if (op.op === 'up') {
    const i = OB.findIndex(o => o.t === op.t && o.op === 'up' && o.row.id === op.row.id);
    if (i >= 0) { OB[i] = op; saveOB(); flushSoon(); return; }
  }
  OB.push(op); saveOB(); flushSoon();
}
function flushSoon(ms = 700) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms); renderSync(); }

async function flush() {
  if (VIEW) return;
  if (flushing || !S.user || !navigator.onLine || !OB.length) { renderSync(); return; }
  flushing = true; renderSync();
  const ops = OB.slice();
  try {
    const r = await api('batch', { ops });
    OB = OB.filter(o => !ops.includes(o)); saveOB();
    // 서버가 좌표(route)를 새로 찾은 일정 반영
    let changed = false;
    (r.items || []).forEach(row => {
      const x = S.items.find(v => v.id === row.id);
      if (x && x.route !== (row.route || '')) { x.route = row.route || ''; x.geo = parseRoute(x.route); changed = true; }
    });
    if (changed) { saveCache(); render(); }
  } catch (e) {
    if (!e.net) toast('저장 실패: ' + e.message, 5000);
  } finally {
    flushing = false; renderSync();
    if (OB.length && navigator.onLine && !OB.every(o => ops.includes(o))) flushSoon(300); // 보내는 사이 생긴 변경
  }
}

/* 공유 링크로 받은 여행 1건 불러오기 (비밀번호 없이, 받은 사람 기기에만 저장본 보관) */
const viewCacheKey = () => 'tl:sv:' + VIEW.token;
function applyShared(r) {
  S.trips = [fromSheetTrip(r.trip)];
  S.items = (r.items || []).filter(x => x.id).map(fromSheetItem);
  S.tripId = S.trips[0].id; VIEW.opt = r.opt || { cost: false, memo: false }; VIEW.err = '';
  document.title = (S.trips[0].title || '여행') + ' · 여행 기록장';
}
async function pullShared(force) {
  if (S.pulling || !navigator.onLine) return;
  if (!force && Date.now() - S.lastPull < 15000) return;
  S.pulling = true; renderSync();
  try {
    const r = await api('share', { token: VIEW.token }, '');
    applyShared(r); LS.set(viewCacheKey(), r);
    S.lastPull = Date.now(); render();
  } catch (e) {
    if (e.message === 'share') { // 공유 중지됐거나 주소가 바뀜 → 남아 있던 저장본도 지움
      try { localStorage.removeItem(viewCacheKey()); } catch (x) { }
      S.trips = []; S.items = []; S.tripId = null; VIEW.err = 'stopped'; render();
    } else if (!S.trips.length) { VIEW.err = e.net ? 'offline' : e.message; render(); }
    else if (!e.net) toast('불러오기 실패: ' + e.message, 5000);
  } finally { S.pulling = false; renderSync(); }
}

async function pull(force) {
  if (VIEW) return pullShared(force);
  if (!S.user || S.pulling || !navigator.onLine) return;
  if (!force && Date.now() - S.lastPull < 15000) return;
  S.pulling = true; renderSync();
  try {
    await flush();
    if (OB.length) return; // 아직 못 보낸 변경이 있으면 내 화면을 우선
    const r = await api('pull');
    S.trips = (r.trips || []).filter(t => t.id).map(fromSheetTrip);
    S.items = (r.items || []).filter(x => x.id).map(fromSheetItem);
    S.lastPull = Date.now(); saveCache();
    if (!SHEET) render(); else S.dirty = true; // 편집 창이 열려 있으면 닫힐 때 다시 그림
  } catch (e) {
    if (!e.net) toast('불러오기 실패: ' + e.message, 5000);
  } finally { S.pulling = false; renderSync(); }
}

function upsertLocal(arr, obj) { const i = arr.findIndex(x => x.id === obj.id); if (i >= 0) arr[i] = obj; else arr.push(obj); }
function putTrip(t) { t.updated_at = nowISO(); upsertLocal(S.trips, t); queue({ t: 'Trips', op: 'up', row: tripRow(t) }); saveCache(); }
function putItem(x) { upsertLocal(S.items, x); queue({ t: 'Items', op: 'up', row: itemRow(x) }); saveCache(); }
function dropItem(id) { S.items = S.items.filter(x => x.id !== id); queue({ t: 'Items', op: 'del', id }); saveCache(); }
function dropTrip(id) {
  S.items = S.items.filter(x => x.trip_id !== id);
  S.trips = S.trips.filter(x => x.id !== id);
  OB = OB.filter(o => !(o.t === 'Items' && o.op === 'up' && o.row.tripId === id)); // 보낼 필요 없는 일정 변경 정리
  queue({ t: 'Trips', op: 'del', id }); saveCache(); // 서버가 그 여행의 일정·안 쓰는 사진까지 정리
}

/* ───────── 사진 (구글 드라이브) ───────── */
const LOCAL = new Map(); // 방금 올린 사진은 드라이브 썸네일이 준비될 때까지 내 기기 사본으로 표시
const photoSrc = p => p.url || LOCAL.get(p.id) || (p.id ? `https://drive.google.com/thumbnail?id=${enc(p.id)}&sz=w1600` : '');
const imgTag = p => `<img src="${esc(photoSrc(p))}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
function hydratePhotos() { } // 드라이브 주소는 바로 쓸 수 있어서 따로 준비할 것이 없음

function loadImage(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 1000); };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('이미지를 읽지 못했어요')); };
    im.src = u;
  });
}
async function compress(file, max = 1600) {
  const im = await loadImage(file);
  const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}
async function uploadPhoto(file) {
  const dataUrl = await compress(file);
  const r = await api('upload', { data: dataUrl.split(',')[1], mime: 'image/jpeg', name: (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg' });
  LOCAL.set(r.id, dataUrl);
  return { id: r.id };
}
function removePhotos(ids) { // 드라이브 휴지통으로 (다른 일정에서 쓰는 사진은 서버가 남겨둠)
  ids = (ids || []).filter(Boolean);
  if (ids.length && navigator.onLine) api('trash', { ids }).catch(() => { });
}

function km(a, b) {
  const R = 6371, r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ───────── 여행·일정 계산 ───────── */
const tripOf = id => S.trips.find(t => t.id === id);
const itemsOf = id => S.items.filter(x => x.trip_id === id);
const byOrd = (a, b) => (a.ord - b.ord) || String(a.created_at).localeCompare(String(b.created_at));
/* 하루 일정 정렬: 시간 있는 일정은 시간순, 시간 없는 일정은 바로 앞 일정에 붙어서 따라감
   예) 11:00 픽업 → (시간 없음) 링엄사 → 09:30 조식  ⇒  09:30 조식, 11:00 픽업, 링엄사 */
function sortDay(list) {
  const a = list.slice().sort(byOrd);
  let last = '';
  const eff = a.map(x => (last = x.time || last));
  return a.map((x, i) => [x, eff[i], i]).sort((p, q) => (p[1] < q[1] ? -1 : p[1] > q[1] ? 1 : p[2] - q[2])).map(p => p[0]);
}
/* 하루 순서를 화면 순서 그대로 1, 2, 3… 으로 다시 매김 (바뀐 일정만 저장) */
function renumber(list) { list.forEach((x, i) => { if (x.ord !== i + 1) { x.ord = i + 1; putItem(x); } }); }
const tagsOf = t => String(t.tags || '').split(',').map(s => s.trim()).filter(Boolean);
const allTags = () => [...new Set(S.trips.flatMap(tagsOf))].sort();

function tripDays(t) {
  if (validYmd(t.start_date)) {
    const end = validYmd(t.end_date) && t.end_date >= t.start_date ? t.end_date : t.start_date;
    const n = Math.min(diffDays(t.start_date, end), 90);
    return Array.from({ length: n + 1 }, (_, i) => addDays(t.start_date, i));
  }
  return [...new Set(itemsOf(t.id).map(x => x.date).filter(validYmd))].sort();
}
function lenLabel(t) {
  if (!validYmd(t.start_date)) return '';
  const end = validYmd(t.end_date) ? t.end_date : t.start_date;
  const n = diffDays(t.start_date, end);
  return n <= 0 ? '당일' : `${n}박 ${n + 1}일`;
}
function dateLabel(t) {
  if (!validYmd(t.start_date)) return '날짜 미정';
  const y = t.start_date.slice(0, 4), ty = today().slice(0, 4);
  const s = (y !== ty ? y + '. ' : '') + md(t.start_date);
  const e = validYmd(t.end_date) && t.end_date !== t.start_date ? ' – ' + md(t.end_date) : '';
  return `${s}${e} · ${lenLabel(t)}`;
}
function ddayOf(t) {
  if (!validYmd(t.start_date)) return '';
  const s = diffDays(today(), t.start_date);
  if (s > 0) return 'D-' + s;
  if (s === 0) return 'D-DAY';
  const e = validYmd(t.end_date) ? diffDays(today(), t.end_date) : 0;
  return e >= 0 ? `여행 중 · ${1 - s}일차` : '';
}
const isPast = t => validYmd(t.start_date) && (validYmd(t.end_date) ? t.end_date : t.start_date) < today();

const checkoutOf = x => (validYmd(x.end_date) && x.end_date > x.date ? x.end_date : (validYmd(x.date) ? addDays(x.date, 1) : ''));
const nightsOf = x => validYmd(x.date) ? diffDays(x.date, checkoutOf(x)) : 0;
const sleepsOn = (x, d) => x.category === '숙소' && validYmd(x.date) && x.date <= d && d < checkoutOf(x);

/* 이동 일정에 도착지가 비어 있으면 그다음 일정의 장소로 자동 연결 */
function orderedItems(t) {
  const days = tripDays(t), rank = d => { const i = days.indexOf(d); return i < 0 ? 9999 : i; };
  const by = {};
  itemsOf(t.id).forEach(x => (by[x.date] = by[x.date] || []).push(x));
  return Object.keys(by).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).flatMap(d => sortDay(by[d]));
}
function nextPlaceItem(x) {
  const t = tripOf(x.trip_id); if (!t) return null;
  const list = orderedItems(t), i = list.findIndex(v => v.id === x.id);
  return list.slice(i + 1).find(v => v.place && v.category !== '이동') || list.slice(i + 1).find(v => v.place) || null;
}

const costNum = v => { const s = String(v || ''); return /^[\s₩원,\d.-]+$/.test(s) ? +(s.replace(/[^\d.-]/g, '')) || 0 : 0; };

/* ───────── 지도 링크 ───────── */
const appname = () => location.origin || 'travel-log';
function naverRouteUrl(sname, from, dname, to) {
  if (isMobile && to) {
    const s = from ? `slat=${from[1]}&slng=${from[0]}&sname=${enc(sname)}&` : '';
    return `nmap://route/car?${s}dlat=${to[1]}&dlng=${to[0]}&dname=${enc(dname)}&appname=${enc(appname())}`;
  }
  if (!isMobile && from && to)
    return `https://map.naver.com/index.nhn?slng=${from[0]}&slat=${from[1]}&stext=${enc(sname)}&elng=${to[0]}&elat=${to[1]}&etext=${enc(dname)}&menu=route&pathType=0`;
  return '';
}
function tmapUrl(name, to) {
  if (!to) return '';
  return isIOS ? `tmap://route?rGoName=${enc(name)}&rGoX=${to[0]}&rGoY=${to[1]}`
    : `tmap://route?goalname=${enc(name)}&goalx=${to[0]}&goaly=${to[1]}`;
}
const A_ = (href, label, ext) => `<a href="${esc(href)}" ${ext ? 'target="_blank" rel="noopener"' : ''} onclick="event.stopPropagation()">${label}</a>`;
const hintA = (label, msg, dim) => `<a href="#" style="opacity:${dim ? .5 : 1}" onclick="event.stopPropagation();event.preventDefault();toast('${esc(msg)}',4500)">${label}</a>`;

function tmapLink(name, to) {
  if (!to) return hintA('🚗 티맵 (좌표 없음)', '장소 좌표를 찾지 못했어요. 상호+지점이나 도로명 주소처럼 구체적으로 적고 다시 저장해주세요', true);
  if (!isMobile) return hintA('🚗 티맵', '티맵은 휴대폰 앱이라 휴대폰에서 누르면 바로 길안내가 시작돼요');
  return A_(tmapUrl(name, to), '🚗 티맵');
}

function linksOf(x) {
  const L = [];
  if (x.category === '이동') {
    const nx = x.place ? null : nextPlaceItem(x);
    const dname = x.place || (nx && nx.place) || '';
    const to = x.place ? x.geo && x.geo.to : nx && nx.geo && nx.geo.to;
    const from = x.geo && x.geo.from;
    if (dname) {
      const nv = naverRouteUrl(x.title, from, dname, to);
      L.push(nv ? A_(nv, '🚗 네이버 길찾기', nv.startsWith('http')) : A_(`https://map.naver.com/p/search/${enc(dname)}`, '🚗 네이버 (도착지 검색)', true));
      L.push(tmapLink(dname, to));
    }
  } else if (x.place) {
    // 휴대폰: 지금 위치에서 그 장소까지 네이버 길찾기 / PC: 네이버 지도에서 장소 보기
    const to = x.geo && x.geo.to, nv = naverRouteUrl('', null, x.place, to);
    L.push(nv ? A_(nv, '🚗 네이버 길찾기', false) : A_(`https://map.naver.com/p/search/${enc(x.place)}`, '📍 네이버 지도', true));
    L.push(tmapLink(x.place, to));
  }
  if (x.link) L.push(A_(/^https?:/i.test(x.link) ? x.link : 'https://' + x.link, '🔗 링크', true));
  return L.length ? `<div class="lk">${L.join('')}</div>` : '';
}

/* ───────── 일정 사이 이동시간 (카카오 자동차 길찾기 · 지금 출발 기준) ─────────
   타임라인 세로선 옆에 "🚗 25분 · 12.3km" 표시. 키가 없거나 실패하면 직선거리만 */
const LEGS = new Map(); // 'lng,lat>lng,lat' → { s: 초, m: 미터, at } 또는 { err }
let LEG_NOKEY = false, LEG_BUSY = false, LEG_ERR_SHOWN = false;
const LEG_TTL = 10 * 60 * 1000;
const ptKey = p => p[0].toFixed(5) + ',' + p[1].toFixed(5);
function fmtDur(sec) {
  const m = Math.max(1, Math.round(sec / 60));
  return m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ' ' + (m % 60) + '분' : ''}`;
}
function legText(k, line) {
  const v = LEGS.get(k);
  if (v && v.s != null) return `🚗 ${fmtDur(v.s)} · ${(v.m / 1000).toFixed(1)}km`;
  if (LEG_NOKEY || (v && v.err)) return `📏 직선 ${line}km`;
  return `🚗 계산 중… · 직선 ${line}km`;
}
function legRow(a, b) {
  if (!a || !b) return '';
  const d = km(a, b);
  if (d < 0.3) return ''; // 같은 곳이면 표시 안 함
  const k = ptKey(a) + '>' + ptKey(b), line = d.toFixed(1);
  return `<div class="tl-leg" data-k="${k}" data-line="${line}"><span>${legText(k, line)}</span></div>`;
}
/* 하루 일정 사이사이에 이동시간 줄 끼워 넣기 */
function rowsWithLegs(main, startPt) {
  let cur = startPt, out = '';
  main.forEach(x => {
    const isMove = x.category === '이동';
    let s, e;
    if (isMove) {
      const nx = x.place ? null : nextPlaceItem(x);
      s = (x.geo && x.geo.from) || cur;
      e = x.place ? x.geo && x.geo.to : nx && nx.geo && nx.geo.to;
    } else s = e = x.geo && x.geo.to;
    if (!isMove) out += legRow(cur, s);   // 앞 장소 → 이 장소
    out += itemCard(x);
    if (isMove) out += legRow(s, e);      // 이동 일정 자체의 출발 → 도착
    cur = e || s || cur;
  });
  return out;
}
async function fillLegs() {
  if (LEG_NOKEY || LEG_BUSY || !navigator.onLine) return;
  const now = Date.now();
  const need = [...new Set($$('.tl-leg[data-k]').map(el => el.dataset.k))]
    .filter(k => { const v = LEGS.get(k); return !v || (v.s != null && now - v.at > LEG_TTL); }).slice(0, 25);
  if (!need.length) return;
  LEG_BUSY = true;
  try {
    const r = await api('legs', VIEW ? { keys: need, token: VIEW.token } : { keys: need }, VIEW ? '' : getKey());
    if (r.nokey) LEG_NOKEY = true;
    Object.entries(r.legs || {}).forEach(([k, v]) => LEGS.set(k, Object.assign({ at: Date.now() }, v)));
    const bad = Object.values(r.legs || {}).find(v => v.err);
    if (bad && !LEG_ERR_SHOWN && !VIEW) { LEG_ERR_SHOWN = true; toast('이동시간을 못 가져온 구간이 있어요: ' + bad.err, 5000); }
  } catch (e) {
    if (/알 수 없는 요청/.test(e.message || '')) LEG_NOKEY = true; // Apps Script가 아직 예전 버전
  } finally {
    LEG_BUSY = false;
    $$('.tl-leg[data-k]').forEach(el => { el.firstElementChild.textContent = legText(el.dataset.k, el.dataset.line); });
  }
}

/* ───────── 화면 ───────── */
function render() {
  const app = $('#app');
  if (!configured) { app.innerHTML = setupView(); return; }
  if (VIEW) {
    const vt = S.tripId && tripOf(S.tripId);
    app.innerHTML = vt ? tripView(vt) : viewMsg();
    renderSync(); if (vt) setTimeout(fillLegs, 50); return;
  }
  if (!S.user) { app.innerHTML = loginView(); return; }
  const t = S.tripId && tripOf(S.tripId);
  if (S.tripId && !t) { S.tripId = null; if (location.hash) history.replaceState(null, '', location.pathname); }
  app.innerHTML = t ? tripView(t) : homeView();
  renderSync();
  if (t) setTimeout(fillLegs, 50);
  hydratePhotos(app);
}

function renderSync() {
  const el = $('#sync'); if (!el) return;
  let s, off = false;
  if (VIEW) {
    off = !navigator.onLine;
    s = '👀 보기 전용 · ' + (off ? '오프라인 · 저장된 내용 보는 중' : S.pulling ? '최신 내용 확인 중…' : S.lastPull ? '최신 내용' : '');
    el.textContent = s; el.classList.toggle('off', off); return;
  }
  if (!navigator.onLine) { off = true; s = '오프라인' + (OB.length ? ` · 변경 ${OB.length}건 대기 중` : ' · 저장된 내용 보는 중'); }
  else if (flushing || S.pulling) s = '동기화 중…';
  else if (OB.length) s = `변경 ${OB.length}건 보내는 중…`;
  else s = S.lastPull ? '동기화됨' : '';
  el.textContent = s; el.classList.toggle('off', off);
}

function setupView() {
  return `<div class="login"><div class="logo">🧳</div><h1>여행 기록장</h1>
    <p>처음 설정이 필요해요.<br><b>config.js</b> 파일에 Apps Script 웹 앱 주소를 넣어주세요.<br>(README 2단계)</p></div>`;
}
function viewMsg() {
  const m = !VIEW.err ? ['⏳', '여행을 불러오는 중이에요…']
    : VIEW.err === 'stopped' ? ['🔒', '공유가 중지되었거나 주소가 바뀐 링크예요.<br>공유해준 분께 새 링크를 받아주세요.']
      : VIEW.err === 'offline' ? ['📶', '인터넷에 연결되면 여행 일정을 볼 수 있어요.']
        : ['⚠️', esc(VIEW.err)];
  return `<div class="login"><div class="logo">${m[0]}</div><h1>여행 기록장</h1><p>${m[1]}</p>
    ${VIEW.err && VIEW.err !== 'stopped' ? '<button class="btn" style="width:100%" onclick="A.refresh()">다시 시도</button>' : ''}</div>`;
}
function loginView() {
  return `<div class="login"><div class="logo">🧳</div><h1>여행 기록장</h1><p>Apps Script에 정한 비밀번호를 입력해주세요<br><small>기기마다 처음 한 번만 입력해요</small></p>
    <form onsubmit="event.preventDefault();A.login()">
      <input class="in" id="lg_p" type="password" autocomplete="current-password" placeholder="비밀번호">
      <div class="hint err" id="lg_h"></div>
      <button class="btn pri" style="width:100%;margin-top:8px">연결</button>
    </form></div>`;
}

function card(t) {
  const its = itemsOf(t.id), pk = t.packing || [];
  const dd = ddayOf(t);
  const meta = [its.length ? `일정 ${its.length}` : '', pk.length && !isPast(t) ? `준비물 ${pk.filter(p => p.d).length}/${pk.length}` : '',
    t.rating ? '★'.repeat(t.rating) : ''].filter(Boolean).join(' · ');
  return `<button class="trip ${covCls(t.color)}" onclick="A.open('${t.id}')">
    ${dd ? `<span class="dd">${dd}</span>` : ''}
    <div class="em">${esc(t.emoji)}</div><h3>${esc(t.title || '제목 없는 여행')}</h3>
    <div class="dt">${esc(dateLabel(t))}</div>
    ${tagsOf(t).map(g => `<span class="tag">#${esc(g)}</span>`).join('')}
    ${meta ? `<div class="meta">${meta}</div>` : ''}</button>`;
}

function homeView() {
  const q = S.q.trim().toLowerCase();
  let list = S.trips.filter(t => !q || [t.title, t.tags, t.memo, t.review].join(' ').toLowerCase().includes(q) ||
    itemsOf(t.id).some(x => [x.title, x.place, x.memo].join(' ').toLowerCase().includes(q)));
  const startKey = t => validYmd(t.start_date) ? t.start_date : '9999';
  let body = '';
  if (S.home === 'up' || S.home === 'past') {
    const arr = S.home === 'up'
      ? list.filter(t => !isPast(t)).sort((a, b) => startKey(a).localeCompare(startKey(b)))
      : list.filter(isPast).sort((a, b) => b.start_date.localeCompare(a.start_date));
    body = arr.map(card).join('') || emptyView(S.home === 'up' ? '다가오는 여행이 없어요' : '지난 여행이 없어요');
  } else if (S.home === 'theme') {
    const count = {};
    list.forEach(t => tagsOf(t).forEach(g => count[g] = (count[g] || 0) + 1));
    const tags = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b));
    if (S.theme && !count[S.theme]) S.theme = '';
    body = `<div class="chips"><button class="chip ${!S.theme ? 'on' : ''}" onclick="A.theme('')">전체</button>${tags.map(g =>
      `<button class="chip ${S.theme === g ? 'on' : ''}" onclick="A.theme('${esc(g).replace(/'/g, '&#39;')}')">#${esc(g)} ${count[g]}</button>`).join('')}</div>`;
    const sorted = list.slice().sort((a, b) => startKey(b).localeCompare(startKey(a)));
    if (S.theme) body += sorted.filter(t => tagsOf(t).includes(S.theme)).map(card).join('');
    else {
      body += tags.map(g => `<div class="group-h"><span>#${esc(g)}</span><span>${count[g]}</span></div>` +
        sorted.filter(t => tagsOf(t).includes(g)).map(card).join('')).join('');
      const none = sorted.filter(t => !tagsOf(t).length);
      if (none.length) body += `<div class="group-h"><span>태그 없음</span><span>${none.length}</span></div>` + none.map(card).join('');
      if (!list.length) body += emptyView('여행을 추가해보세요');
    }
  } else {
    const g = {};
    list.forEach(t => { const y = validYmd(t.start_date) ? t.start_date.slice(0, 4) + '년' : '날짜 미정'; (g[y] = g[y] || []).push(t); });
    body = Object.keys(g).sort().reverse().map(y => `<div class="group-h"><span>${y}</span><span>${g[y].length}개</span></div>` +
      g[y].sort((a, b) => startKey(b).localeCompare(startKey(a))).map(card).join('')).join('') || emptyView('여행을 추가해보세요');
  }
  const tabs = [['up', '다가오는'], ['past', '지난 여행'], ['theme', '테마별'], ['year', '연도별']];
  return `<div class="wrap">
    <div class="top"><h1>여행 기록장</h1>
      <button class="ibtn" onclick="A.settings()" aria-label="설정">⚙️</button>
      <button class="ibtn dark" onclick="A.editTrip()" aria-label="새 여행">＋</button></div>
    <div class="sync" id="sync"></div>
    ${homeStats()}
    <div class="seg">${tabs.map(([k, l]) => `<button class="${S.home === k ? 'on' : ''}" onclick="A.home('${k}')">${l}</button>`).join('')}</div>
    <input class="search" id="q" placeholder="🔍 여행·장소·메모 검색" value="${esc(S.q)}" oninput="A.search(this.value)">
    <div id="list">${body}</div></div>`;
}
function homeStats() {
  const ts = S.trips, y = today().slice(0, 4);
  const days = ts.filter(t => validYmd(t.start_date) && t.start_date <= today()).reduce((a, t) => a + tripDays(t).filter(d => d <= today()).length, 0);
  return `<div class="hstats home"><div><b>${ts.length}</b><span>전체 여행</span></div><div><b>${days}일</b><span>여행한 날</span></div>
    <div><b>${allTags().length}</b><span>테마 · 지역</span></div><div><b>${ts.filter(t => (t.start_date || '').startsWith(y)).length}</b><span>${y}년 여행</span></div></div>`;
}
const emptyView = m => `<div class="empty"><div class="big">🗺️</div><p>${m}</p></div>`;

function tripView(t) {
  const days = tripDays(t), its = itemsOf(t.id);
  const undated = its.filter(x => !days.includes(x.date));
  const tabs = [['all', '전체', '']].concat(days.map((d, i) => [d, `${i + 1}일차`, md(d)]));
  if (undated.length) tabs.push(['none', '날짜 미정', '']);
  const pkShow = !VIEW || (t.packing || []).length; // 받은 사람: 준비물을 공유한 경우에만
  if (pkShow) { const pk = t.packing || []; tabs.push(['pack', '🧳 준비물', pk.length ? `${pk.filter(p => p.d).length}/${pk.length}` : '']); }
  tabs.push(['log', VIEW ? (VIEW.opt.cost ? '📷 사진·경비' : '📷 사진') : '📝 기록', '']);
  if (!tabs.some(x => x[0] === S.tab)) S.tab = 'all';
  const total = its.reduce((s, x) => s + costNum(x.cost), 0);
  let body;
  if (S.tab === 'pack') body = packingView(t);
  else if (S.tab === 'log') body = logView(t);
  else if (S.tab === 'none') body = dayBlock(t, '', -1, days.length);
  else if (S.tab !== 'all') body = dayBlock(t, S.tab, days.indexOf(S.tab), days.length);
  else body = days.map((d, i) => dayBlock(t, d, i, days.length)).join('') + (undated.length || !days.length ? dayBlock(t, '', -1, days.length) : '');
  const st = ddayOf(t) || (isPast(t) ? '다녀옴' : '');

  const hideCost = VIEW && !VIEW.opt.cost;
  const acts = VIEW ? `<button onclick="A.print('${t.id}')">🖨 출력 · 저장</button>`
    : `<button onclick="A.editTrip('${t.id}')">✏️ 편집</button><button onclick="A.share('${t.id}')">🔗 공유</button><button onclick="A.dupTrip('${t.id}')">📑 복제</button>
        <button onclick="A.print('${t.id}')">🖨 출력</button><button onclick="A.delTrip('${t.id}')">🗑 삭제</button>`;
  return `<div class="wrap">
    ${VIEW ? '<div class="sync" id="sync" style="margin:14px 0 8px"></div>'
      : '<button class="back" onclick="A.home()">‹ 여행 목록</button><div class="sync" id="sync" style="margin-top:-30px"></div>'}
    <div class="hero ${covCls(t.color)}">
      <div class="em">${esc(t.emoji)}</div><h2>${esc(t.title || '제목 없는 여행')}</h2>
      <div class="dt">${esc(dateLabel(t))}</div>
      <div style="margin-top:6px">${st ? `<span class="tag st">${st}</span>` : ''}${tagsOf(t).map(g => `<span class="tag">#${esc(g)}</span>`).join('')}</div>
      ${t.memo ? `<div class="memo">${esc(t.memo)}</div>` : ''}
      <div class="hstats"><div><b>${its.length}</b><span>전체 일정</span></div>
        <div><b>${its.filter(x => x.category === '갈곳' || x.category === '체험').length}</b><span>갈 곳 · 체험</span></div>
        ${hideCost ? `<div><b>${days.length}일</b><span>여행 일수</span></div>` : `<div><b>${total ? won(total) : '-'}</b><span>경비</span></div>`}</div>
      <div class="acts">${acts}</div>
    </div>
    <nav class="daytabs" id="daytabs">${tabs.map(([k, l, sub]) =>
      `<button class="${S.tab === k ? 'on' : ''}" onclick="A.tab('${k}')">${l}${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</nav>
    ${body}
    ${S.tab === 'pack' ? '' : packingView(t)}
  </div>
  ${VIEW ? '' : '<button class="fab" onclick="A.newItem()">＋ 일정</button>'}`;
}

function dayBlock(t, d, i, total) {
  const its = itemsOf(t.id), days = tripDays(t);
  const main = sortDay(d ? its.filter(x => x.date === d) : its.filter(x => !days.includes(x.date)));
  const outs = d ? its.filter(x => x.category === '숙소' && validYmd(x.date) && x.date < d && checkoutOf(x) === d) : [];
  const mids = d ? its.filter(x => x.category === '숙소' && validYmd(x.date) && x.date < d && d < checkoutOf(x)) : [];
  const tonight = d ? its.find(x => sleepsOn(x, d)) : null;
  const cnt = k => main.filter(x => x.category === k).length;
  const stay = !d ? '' : tonight ? esc(tonight.title || tonight.place) : i === total - 1 && total > 1 ? '돌아오는 날' : '숙소 미정';
  const cost = main.reduce((s, x) => s + costNum(x.cost), 0);
  return `<section class="day">
    <div class="day-h"><span class="dnum">${i >= 0 ? 'DAY ' + (i + 1) : '날짜 미정'}</span><b>${d ? md(d) : '날짜 미정 · 기간 밖 일정'}</b>
      ${cost ? `<span class="dcost">${won(cost)}</span>` : ''}</div>
    ${d ? `<div class="day-sum"><span>🏨 ${stay}</span><span>🍽️ 식사 ${cnt('식사')}</span><span>📍 갈곳 ${cnt('갈곳') + cnt('체험')}</span></div>` : ''}
    <div class="tl">
      ${outs.map(x => itemCard(x, 'out')).join('')}
      ${rowsWithLegs(main, outs[0] && outs[0].geo && outs[0].geo.to)}
      ${mids.map(x => itemCard(x, 'mid', d)).join('')}
      ${!outs.length && !main.length && !mids.length ? `<div class="tl-empty">${VIEW ? '이 날은 일정이 없어요.' : '아직 일정이 없어요. 아래에서 바로 추가해보세요.'}</div>` : ''}
    </div>
    ${VIEW ? '' : `<div class="quick">${CATS.map(([c, ic]) => `<button style="--c:${CCOL[c]}" onclick="A.newItem('${d}','${c}')">＋ ${ic} ${c}</button>`).join('')}</div>`}
  </section>`;
}

function itemCard(x, mode, d) {
  const col = CCOL[x.category] || CCOL['기타'];
  if (mode === 'out' || mode === 'mid') {
    return `<div class="tl-item ghost" style="--c:${CCOL['숙소']}" onclick="A.editItem('${x.id}')">
      <div class="tl-time">${mode === 'out' ? esc(x.end_time) : ''}</div><div class="tl-dot">${mode === 'out' ? '🧳' : '🌙'}</div>
      <div class="tl-card"><div class="tl-top"><span class="tl-cat">${mode === 'out' ? '체크아웃' : `연박 · ${diffDays(x.date, d) + 1}박째`}</span></div>
      <div class="tl-title">${esc(x.title || x.place)}</div></div></div>`;
  }
  const isMove = x.category === '이동';
  let title = esc(x.title || x.place || '(이름 없음)');
  const sub = [];
  if (isMove) {
    const nx = x.place ? null : nextPlaceItem(x);
    const dest = x.place || (nx ? nx.place + ' (다음 일정)' : '');
    title = `${esc(x.title || '출발지')} → ${esc(dest || '도착지')}`;
    const from = x.geo && x.geo.from, to = x.place ? x.geo && x.geo.to : nx && nx.geo && nx.geo.to;
    if (from && to) sub.push(`직선 ${km(from, to).toFixed(1)}km`);
  }
  if (x.category === '숙소' && validYmd(x.date)) {
    sub.push(`${md(x.date)}${x.time ? ' ' + esc(x.time) : ''} → ${md(checkoutOf(x))}${x.end_time ? ' ' + esc(x.end_time) : ''} · ${nightsOf(x)}박`);
  }
  if (!isMove && x.place && x.title) sub.push('📍 ' + esc(x.place));
  const ph = x.photos || [];
  const thumbs = ph.length ? `<div class="thumbs">${ph.slice(0, 4).map((p, k) =>
    `<button onclick="event.stopPropagation();A.lightbox('${x.id}',${k})">${imgTag(p)}${k === 3 && ph.length > 4 ? `<span class="more">+${ph.length - 4}</span>` : ''}</button>`).join('')}</div>` : '';
  return `<div class="tl-item" style="--c:${col}" onclick="A.editItem('${x.id}')">
    <div class="tl-time">${esc(x.time)}</div><div class="tl-dot">${iconOf(x.category)}</div>
    <div class="tl-card">
      <div class="tl-top"><span class="tl-cat">${esc(x.category)}</span>${costNum(x.cost) ? `<span class="tl-cost">${won(costNum(x.cost))}</span>` : x.cost ? `<span class="tl-cost">${esc(x.cost)}</span>` : ''}</div>
      <div class="tl-title">${title}</div>
      ${sub.length ? `<div class="sm">${sub.join(' · ')}</div>` : ''}
      ${x.memo ? `<div class="sm">${esc(x.memo)}</div>` : ''}
      ${linksOf(x)}${thumbs}
    </div></div>`;
}

/* 준비물: 사람별로 나눠 기록 (p.w = 누구 것, 비어 있으면 공용). 체크는 내가, 공유 링크에서는 보기만 */
const pkWho = p => String(p.w || '').trim();
/* 쉼표로 여러 개 입력, 단 괄호 안의 쉼표는 나누지 않음: '세면도구(칫솔, 치약), 수건' → 2개 */
function splitList(str) {
  const out = []; let cur = '', depth = 0;
  for (const ch of str) {
    if ('([{（'.includes(ch)) depth++; else if (')]}）'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}
function pkPeople(t) {
  const list = [];
  (t.packing || []).forEach(p => { const w = pkWho(p); if (w && !list.includes(w)) list.push(w); });
  ((S.pkExtra || {})[t.id] || []).forEach(w => { if (!list.includes(w)) list.push(w); });
  return list;
}
function packingView(t) {
  const pk = t.packing || [], done = pk.filter(p => p.d).length, ro = !!VIEW;
  const people = pkPeople(t);
  if (S.pkWho && !people.includes(S.pkWho)) S.pkWho = '';
  const who = S.pkWho || '';
  const groups = ['', ...people].map(w => ({ w, list: pk.map((p, i) => ({ p, i })).filter(o => pkWho(o.p) === w) }))
    .filter(g => g.list.length || (!ro && g.w && g.w === who));
  const multi = people.length > 0;
  const row = ({ p, i }) => ro
    ? `<div class="pk ro ${p.d ? 'done' : ''}"><span class="cb">${p.d ? '✓' : ''}</span><span>${esc(p.t)}</span></div>`
    : `<div class="pk ${p.d ? 'done' : ''}"><button class="cb" onclick="A.pk(${i})">${p.d ? '✓' : ''}</button>
      <span onclick="A.pk(${i})">${esc(p.t)}</span><button class="x" onclick="A.pkDel(${i})">✕</button></div>`;
  const body = groups.map(g => {
    const gd = g.list.filter(o => o.p.d).length;
    return `<div class="pk-g">${multi ? `<div class="pk-gh"><span>${g.w ? '👤 ' + esc(g.w) : '🧺 공용'}</span><small>${g.list.length ? `${gd} / ${g.list.length}` : '아직 없음'}</small></div>` : ''}
      ${g.list.map(row).join('')}</div>`;
  }).join('');
  const head = `<h4>🧳 준비물 <small>${pk.length ? `${done} / ${pk.length} 챙김` : ''}</small></h4>
    ${pk.length ? `<div class="bar"><i style="width:${done / pk.length * 100}%"></i></div>` : ''}`;
  if (ro) return pk.length ? `<div class="box" id="packing">${head}${body}</div>` : '';
  const q = s => esc(s).replace(/'/g, '&#39;');
  const have = new Set(pk.filter(p => pkWho(p) === who).map(p => p.t));
  return `<div class="box" id="packing">${head}
    <div class="chips pk-who" style="margin:4px 0 2px">
      <button class="chip ${!who ? 'on' : ''}" onclick="A.pkWho('')">🧺 공용</button>
      ${people.map(w => `<button class="chip ${who === w ? 'on' : ''}" onclick="A.pkWho('${q(w)}')">👤 ${esc(w)}</button>`).join('')}
      <button class="chip" onclick="A.pkPerson()">＋ 사람</button></div>
    ${who ? `<div class="hint" style="margin:0 0 4px">👤 ${esc(who)} 준비물에 추가돼요 · <button class="lnk" onclick="A.pkRename('${q(who)}')">이름 바꾸기·빼기</button></div>` : ''}
    ${body}
    <form class="row" style="margin-top:10px" onsubmit="event.preventDefault();A.pkAdd()">
      <input class="in" id="pk_in" placeholder="${who ? esc(who) + ' 준비물' : '여권, 충전기, 우산'} (쉼표로 여러 개)" enterkeyhint="done">
      <button class="btn pri" style="flex:none;padding:0 16px">추가</button></form>
    <div class="sug">${PACK_SUG.filter(s => !have.has(s)).map(s => `<button onclick="A.pkAdd('${s}')">＋ ${s}</button>`).join('')}</div>
    ${pk.length ? `<div style="margin-top:12px"><button class="lnk" onclick="A.pkReset()">체크 모두 해제</button><button class="lnk" onclick="A.pkClear()">목록 비우기</button></div>` : ''}
  </div>`;
}

function logView(t) {
  const its = orderedItems(t), days = tripDays(t);
  const photos = its.flatMap(x => (x.photos || []).map((p, k) => ({ p, id: x.id, k })));
  const spent = its.filter(x => costNum(x.cost));
  const by = {};
  spent.forEach(x => { by[x.category] = (by[x.category] || 0) + costNum(x.cost); });
  const total = Object.values(by).reduce((a, b) => a + b, 0), max = Math.max(1, ...Object.values(by));
  const cats = Object.keys(by).sort((a, b) => by[b] - by[a]);
  const when = x => { const i = days.indexOf(x.date); return x.date ? `${i >= 0 ? i + 1 + '일차 ' : ''}${md(x.date)}${x.time ? ' ' + x.time : ''}` : '날짜 미정'; };
  const costBox = total ? `
      <div class="seg mini">${[['cat', '분류별'], ['item', '항목별'], ['day', '일차별']].map(([k, l]) =>
        `<button class="${S.costView === k ? 'on' : ''}" onclick="A.costView('${k}')">${l}</button>`).join('')}</div>
      ${S.costView === 'item' ? `<div class="clist">${spent.map(x => `<div class="crow" onclick="A.editItem('${x.id}')">
          <span class="cdot" style="background:${CCOL[x.category] || CCOL['기타']}"></span>
          <div><b>${esc(x.category === '이동' ? (x.title + (x.place ? ' → ' + x.place : '')) : (x.title || x.place))}</b><small>${esc(when(x))} · ${esc(x.category)}</small></div>
          <span class="camt">${won(costNum(x.cost))}</span></div>`).join('')}</div>`
      : S.costView === 'day' ? `<div class="clist">${days.concat(spent.some(x => !days.includes(x.date)) ? [''] : []).map((d, i) => {
          const list = spent.filter(x => d ? x.date === d : !days.includes(x.date));
          if (!list.length) return '';
          return `<div class="cday"><div class="cday-h"><span>${d ? `${i + 1}일차 · ${md(d)}` : '날짜 미정'}</span><b>${won(list.reduce((s, x) => s + costNum(x.cost), 0))}</b></div>
            ${list.map(x => `<div class="crow" onclick="A.editItem('${x.id}')"><span class="cdot" style="background:${CCOL[x.category] || CCOL['기타']}"></span>
              <div><b>${esc(x.title || x.place)}</b><small>${esc(x.category)}${x.time ? ' · ' + esc(x.time) : ''}</small></div><span class="camt">${won(costNum(x.cost))}</span></div>`).join('')}</div>`;
        }).join('')}</div>`
      : cats.map(c => `<details class="cbar" style="--c:${CCOL[c] || CCOL['기타']}"><summary>
          <span class="cl">${iconOf(c)} ${esc(c)}</span><span class="bar2"><i style="width:${by[c] / max * 100}%"></i></span><span class="camt">${won(by[c])}</span></summary>
          ${spent.filter(x => x.category === c).map(x => `<div class="crow" onclick="A.editItem('${x.id}')"><div><b>${esc(x.title || x.place)}</b><small>${esc(when(x))}</small></div><span class="camt">${won(costNum(x.cost))}</span></div>`).join('')}
        </details>`).join('')}
      <div class="ctotal"><span>합계</span><b>${won(total)}</b></div>`
    : '<div class="sm">비용이 입력된 일정이 없어요. 일정을 눌러 비용을 넣으면 자동으로 정리돼요.</div>';
  if (VIEW) return `${VIEW.opt.cost ? `<div class="box"><h4>💰 경비 정리 ${total ? `<small>${spent.length}건</small>` : ''}</h4>${costBox}</div>` : ''}
    ${t.memo ? `<div class="box"><h4>📝 여행 메모</h4><div class="sm" style="font-size:14px">${esc(t.memo)}</div></div>` : ''}
    <div class="box"><h4>📷 사진 <small>${photos.length}장</small></h4>
      ${photos.length ? `<div class="gallery">${photos.map(o => `<button onclick="A.lightbox('${o.id}',${o.k})">${imgTag(o.p)}</button>`).join('')}</div>`
      : '<div class="sm">아직 올라온 사진이 없어요</div>'}</div>`;
  return `<div class="box"><h4>⭐ 여행 별점</h4>
      <div class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="${t.rating >= n ? 'on' : ''}" onclick="A.rate(${n})">★</button>`).join('')}</div>
      <label class="f">여행 후기</label>
      <textarea class="in" id="rv" rows="6" placeholder="좋았던 곳, 다음엔 바꾸고 싶은 것, 기억하고 싶은 순간…" oninput="A.review(this.value)">${esc(t.review)}</textarea>
      <div class="hint">입력하면 자동으로 저장돼요</div></div>
    <div class="box"><h4>💰 경비 정리 ${total ? `<small>${spent.length}건</small>` : ''}</h4>${costBox}</div>
    ${t.memo ? `<div class="box"><h4>📝 여행 메모</h4><div class="sm" style="font-size:14px">${esc(t.memo)}</div></div>` : ''}
    <div class="box"><h4>📷 사진 <small>${photos.length}장</small></h4>
      ${photos.length ? `<div class="gallery">${photos.map(o => `<button onclick="A.lightbox('${o.id}',${o.k})">${imgTag(o.p)}</button>`).join('')}</div>`
      : '<div class="sm">일정에 사진을 붙이면 여기에 모여요</div>'}</div>
    <div style="text-align:center;margin:6px 0 18px"><button class="btn" style="flex:none;padding:12px 18px" onclick="A.dupTrip('${t.id}')">📋 이 여행 복제하기</button></div>`;
}

/* ───────── 시트(편집 창) ───────── */
let SHEET = null; // {kind, ...}
function openSheet(html, kind) {
  SHEET = { kind };
  $('#sheet').innerHTML = `<div class="grip"></div>${html}`;
  $('#sheet').scrollTop = 0;
  $('#sheet').classList.add('on'); $('#scrim').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeSheet(save) {
  if (!SHEET) return;
  if (SHEET.kind === 'item' && !save && E) removePhotos(E._new); // 저장 안 한 새 사진 정리
  SHEET = null; E = null;
  $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on');
  document.body.style.overflow = '';
  if (S.dirty) { S.dirty = false; render(); } // 편집 중에 받아온 최신 내용 반영
}

/* 날짜 숫자 입력: 20261112 → 2026-11-12 */
function dateField(id, label, val, next) {
  return `<label class="f">${label}</label><div class="row" style="align-items:center">
    <input class="in" id="${id}" inputmode="numeric" placeholder="20261112" value="${esc(val)}" maxlength="10"
      oninput="A.dateIn(this,'${next || ''}')">
    <label class="ibtn" style="position:relative;flex:none;box-shadow:none;border:1px solid var(--line)">📅
      <input type="date" value="${esc(val)}" style="position:absolute;inset:0;opacity:0;width:100%" onchange="A.datePick('${id}',this.value)"></label>
  </div>`;
}

function tripSheet(t) {
  const isNew = !t;
  t = t || { id: '', title: '', tags: '', start_date: '', end_date: '', emoji: '✈️', color: 'ocean', memo: '' };
  openSheet(`<h3>${isNew ? '새 여행' : '여행 편집'}</h3>
    <label class="f">여행 이름</label><input class="in" id="t_title" value="${esc(t.title)}" placeholder="예) 부산 2박 3일">
    <label class="f">아이콘</label><div class="row emojis" style="flex-wrap:wrap;gap:6px">${EMOJIS.map(e =>
      `<button type="button" class="${t.emoji === e ? 'on' : ''}" style="flex:none" onclick="A.pickOne(this)" data-v="${e}">${e}</button>`).join('')}</div>
    <label class="f">커버 색상</label><div class="colors">${COLOR_GROUPS.map(([g, gl]) => `<div class="cg-l">${gl}</div><div class="cg">${Object.keys(COLORS).filter(k => COLORS[k][1] === g).map(k =>
      `<button type="button" class="${t.color === k ? 'on' : ''}" style="background:${covBg(k)}" title="${COLORS[k][0]}" aria-label="${COLORS[k][0]}" onclick="A.pickColor(this)" data-v="${k}"></button>`).join('')}</div>`).join('')}</div>
    <label class="f">테마·지역 태그 (쉼표로 구분)</label><input class="in" id="t_tags" value="${esc(t.tags)}" placeholder="부산, 바다, 맛집">
    ${allTags().length ? `<div class="sug">${allTags().map(g => `<button type="button" onclick="A.addTag('${esc(g).replace(/'/g, '&#39;')}')">#${esc(g)}</button>`).join('')}</div>` : ''}
    <div class="row"><div>${dateField('t_s', '출발일', t.start_date, 't_e')}</div><div>${dateField('t_e', '돌아오는 날', t.end_date)}</div></div>
    <div class="hint" id="t_h">${esc(lenLabel(t))}</div>
    <label class="f">메모</label><textarea class="in" id="t_memo" placeholder="예약 번호, 주의할 점…">${esc(t.memo)}</textarea>
    <div class="btns"><button class="btn" onclick="A.close()">취소</button><button class="btn pri" onclick="A.saveTrip('${t.id}')">저장</button></div>`, 'trip');
  if (isNew && !isMobile) setTimeout(() => $('#t_title').focus(), 250);
}

let E = null; // 편집 중인 일정
function itemSheet() {
  const t = tripOf(E.trip_id), days = tripDays(t);
  const opts = days.slice();
  if (E.date && !opts.includes(E.date)) opts.push(E.date);
  const isMove = E.category === '이동', isStay = E.category === '숙소';
  const dateSel = `<select class="in" id="i_date" onchange="A.iSync()">
    ${opts.map(d => `<option value="${d}" ${E.date === d ? 'selected' : ''}>${days.indexOf(d) >= 0 ? days.indexOf(d) + 1 + '일차 · ' : ''}${md(d)}</option>`).join('')}
    <option value="" ${!E.date ? 'selected' : ''}>날짜 미정</option></select>`;
  let coOpts = '';
  if (isStay && E.date) {
    const after = [...new Set(days.filter(d => d > E.date).concat(addDays(E.date, 1), E.end_date > E.date ? E.end_date : []))].sort();
    const co = checkoutOf(E);
    coOpts = after.map(d => `<option value="${d}" ${co === d ? 'selected' : ''}>${md(d)} · ${diffDays(E.date, d)}박</option>`).join('');
  }
  const exists = !!S.items.find(x => x.id === E.id);
  const sameDay = exists ? sortDay(itemsOf(E.trip_id).filter(x => x.date === E._orig.date)) : [];
  const pos = sameDay.findIndex(x => x.id === E.id);
  const geoTo = E.geo && E.geo.to;
  openSheet(`<h3>${exists ? '일정 편집' : '일정 추가'}</h3>
    <div class="cats">${CATS.map(([c, ic]) => `<button type="button" class="${E.category === c ? 'on' : ''}" onclick="A.cat('${c}')">${ic} ${c}</button>`).join('')}</div>
    <div class="row"><div><label class="f">${isStay ? '체크인 날짜' : '날짜'}</label>${dateSel}</div>
      <div><label class="f">${isStay ? '체크인 시간' : '시간'}</label><input class="in" id="i_time" type="time" value="${esc(E.time)}"></div></div>
    ${isStay ? `<div class="row"><div><label class="f">체크아웃 날짜</label><select class="in" id="i_end" ${E.date ? '' : 'disabled'}>${coOpts}</select></div>
      <div><label class="f">체크아웃 시간</label><input class="in" id="i_etime" type="time" value="${esc(E.end_time)}"></div></div>` : ''}
    <label class="f">${isMove ? '출발지' : isStay ? '숙소 이름' : '이름'}</label>
    <input class="in" id="i_title" value="${esc(E.title)}" placeholder="${isMove ? '예) 천안 집, 서울역' : isStay ? '예) 해운대 ○○호텔' : '예) 금수복국'}">
    <label class="f">${isMove ? '도착지' : '장소 · 주소'}</label>
    <input class="in" id="i_place" value="${esc(E.place)}" placeholder="${isMove ? '비워두면 다음 일정 장소로 자동 연결' : '상호+지점이나 도로명 주소 (길찾기용)'}">
    <div class="hint">${E.place ? (geoTo ? '📍 좌표 저장됨 · 티맵·네이버 길찾기 연결' : '저장하면 좌표를 찾아 길찾기를 연결해요') : ''}</div>
    <div class="row"><div><label class="f">비용</label><input class="in" id="i_cost" value="${esc(costNum(E.cost) ? costNum(E.cost).toLocaleString('ko-KR') : E.cost)}" inputmode="numeric" placeholder="35,000" oninput="A.fmtNum(this)"></div>
      <div><label class="f">링크</label><input class="in" id="i_link" value="${esc(E.link)}" placeholder="예약·블로그 주소"></div></div>
    <label class="f">메모</label><textarea class="in" id="i_memo">${esc(E.memo)}</textarea>
    <label class="f">사진 · 캡처 ${isMobile ? '' : '<span style="font-weight:500">(Ctrl+V로 붙여넣기, 끌어다 놓기 가능)</span>'}</label>
    <div class="ph-grid" id="i_ph">${photosEditor()}</div>
    ${pos >= 0 && sameDay.length > 1 ? `<label class="f">순서</label><div class="row">
      <button class="btn" ${pos === 0 ? 'disabled style="opacity:.4"' : ''} onclick="A.move(-1)">▲ 위로</button>
      <button class="btn" ${pos === sameDay.length - 1 ? 'disabled style="opacity:.4"' : ''} onclick="A.move(1)">▼ 아래로</button></div>` : ''}
    <div class="btns">${exists ? '<button class="btn del" onclick="A.delItem()">삭제</button>' : ''}
      <button class="btn" onclick="A.close()">취소</button><button class="btn pri" onclick="A.saveItem()">저장</button></div>`, 'item');
  SHEET.kind = 'item';
  hydratePhotos($('#sheet'));
}
function photosEditor() {
  return E.photos.map((p, k) => `<div class="ph">${imgTag(p)}<button class="rm" onclick="A.phDel(${k})">✕</button></div>`).join('')
    + Array.from({ length: E._up || 0 }, () => '<div class="ph up"></div>').join('')
    + `<button class="ph add" onclick="$('#filePick').click()">＋<br>사진 추가</button>`;
}
function readItemForm() {
  if (!E || !$('#i_title')) return;
  E.date = $('#i_date').value; E.time = $('#i_time').value;
  E.title = $('#i_title').value.trim(); E.place = $('#i_place').value.trim();
  const cv = $('#i_cost').value.trim(); E.cost = /^[\d,\s₩원]+$/.test(cv) ? cv.replace(/\D/g, '') : cv; E.link = $('#i_link').value.trim(); E.memo = $('#i_memo').value.trim(); // 비용 숫자는 쉼표 없이 저장
  if ($('#i_end')) E.end_date = $('#i_end').value || ''; if ($('#i_etime')) E.end_time = $('#i_etime').value;
}
async function addPhotos(files) {
  if (!E) return;
  files = Array.from(files || []).filter(f => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name || ''));
  if (!files.length) return;
  if (!navigator.onLine) { toast('사진은 인터넷이 연결됐을 때 올릴 수 있어요'); return; }
  const ed = E;
  ed._up = (ed._up || 0) + files.length; if ($('#i_ph')) $('#i_ph').innerHTML = photosEditor();
  for (const f of files) {
    try { const p = await uploadPhoto(f); ed.photos.push(p); ed._new.push(p.id); }
    catch (e) { toast('사진 올리기 실패: ' + (e.message || e)); }
    ed._up--;
    if (E === ed && $('#i_ph')) { $('#i_ph').innerHTML = photosEditor(); hydratePhotos($('#i_ph')); }
  }
}

/* 새 일정·날짜나 시간을 바꾼 일정을 그날 알맞은 자리에 넣고 순서 번호 정리
   시간이 있으면 그 시간 자리에, 없으면 그날 맨 뒤에 */
function placeInDay(x) {
  const others = sortDay(itemsOf(x.trip_id).filter(v => v.date === x.date && v.id !== x.id));
  let idx = others.length;
  if (x.time) {
    let last = '', k = -1;
    others.forEach((v, i) => { last = v.time || last; if (last && last <= x.time) k = i; });
    idx = k + 1;
  }
  others.splice(idx, 0, x);
  renumber(others);
}

/* ───────── 라이트박스 ───────── */
let LB = null;
function showLB() {
  const p = LB.list[LB.i];
  const src = photoSrc(p);
  $('#lb').innerHTML = `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">
    ${LB.list.length > 1 ? '<button class="nav p" onclick="A.lbGo(-1)">‹</button><button class="nav n" onclick="A.lbGo(1)">›</button>' : ''}
    <button class="cl" onclick="A.lbClose()">✕</button>
    <div class="cnt">${LB.i + 1} / ${LB.list.length}${p.id ? ` · <a href="https://drive.google.com/file/d/${enc(p.id)}/view" target="_blank" rel="noopener" style="color:#fff">드라이브에서 원본 보기</a>` : ''}</div>`;
  $('#lb').classList.add('on');
}

/* ───────── 출력 (인쇄·PDF·이미지) — 기존 웹앱과 같은 선택지 ───────── */
const PR = { mode: 'day', cols: 1, pages: 1, cats: CATS.map(c => c[0]), pack: true, cost: true, memo: true, photos: false };
const PAGE_H = 1123; // A4 세로 (96dpi)

function pRow(x, opt) {
  const col = CCOL[x.category] || CCOL['기타'];
  const isMove = x.category === '이동';
  let first = esc(x.time), label = esc(x.category);
  if (opt.out) { label = '체크아웃'; first = esc(x.end_time); }
  if (opt.wide) { const i = opt.days.indexOf(x.date); first = x.date ? `${i >= 0 ? i + 1 + '일차 ' : ''}${md(x.date)}${x.time ? ' ' + esc(x.time) : ''}` : '날짜 미정'; }
  const nx = isMove && !x.place ? nextPlaceItem(x) : null;
  const name = isMove ? `${x.title || ''} → ${x.place || (nx ? nx.place : '')}` : (x.title || x.place);
  const range = x.category === '숙소' && validYmd(x.date) && !opt.out
    ? `${md(x.date)}${x.time ? ' ' + x.time : ''} → ${md(checkoutOf(x))}${x.end_time ? ' ' + x.end_time : ''} · ${nightsOf(x)}박` : '';
  const meta = opt.out ? [] : [!isMove && x.title && x.place ? '📍 ' + x.place : '', PR.cost && costNum(x.cost) ? won(costNum(x.cost)) : '', x.memo].filter(Boolean);
  const imgs = PR.photos && !opt.out ? (x.photos || []).slice(0, 4) : [];
  return `<div class="p-row${opt.wide ? ' wide' : ''}"><span class="p-time">${first}</span>
    <span class="p-cat" style="color:${col};background:${col}1f">${label}</span>
    <div><div class="p-t">${esc(name)}</div>${range ? `<div class="p-r" style="color:${col}">${esc(range)}</div>` : ''}
      ${meta.length ? `<div class="p-m">${meta.map(esc).join('  ·  ')}</div>` : ''}
      ${imgs.length ? `<div class="p-img">${imgs.map(imgTag).join('')}</div>` : ''}</div></div>`;
}

function printHtml(t) {
  const days = tripDays(t), its = itemsOf(t.id).filter(x => PR.cats.includes(x.category) || (!ICON[x.category] && PR.cats.includes('기타')));
  const all = itemsOf(t.id);
  let body = '';
  if (PR.mode === 'day') {
    body = days.map((d, i) => {
      const outs = PR.cats.includes('숙소') ? all.filter(x => x.category === '숙소' && validYmd(x.date) && x.date < d && checkoutOf(x) === d) : [];
      const main = sortDay(its.filter(x => x.date === d));
      const tonight = all.find(x => sleepsOn(x, d));
      if (!outs.length && !main.length) return '';
      return `<div class="pd"><h2><span>DAY ${i + 1}</span> ${md(d)}${tonight ? `<em>🏨 ${esc(tonight.title || tonight.place)}</em>` : ''}</h2>
        ${outs.map(x => pRow(x, { out: true })).join('')}${main.map(x => pRow(x, {})).join('')}</div>`;
    }).join('');
    const loose = sortDay(its.filter(x => !days.includes(x.date)));
    if (loose.length) body += `<div class="pd"><h2>날짜 미정</h2>${loose.map(x => pRow(x, {})).join('')}</div>`;
  } else {
    const ord = orderedItems(t);
    body = CATS.map(c => c[0]).filter(c => PR.cats.includes(c)).map(c => {
      const list = ord.filter(x => x.category === c || (c === '기타' && !ICON[x.category]));
      return list.length ? `<div class="pd"><h2>${iconOf(c)} ${c} <small>${list.length}</small></h2>${list.map(x => pRow(x, { wide: true, days })).join('')}</div>` : '';
    }).join('');
  }
  const extra = [];
  if (PR.cost) {
    const by = {}; all.forEach(x => { const n = costNum(x.cost); if (n) by[x.category] = (by[x.category] || 0) + n; });
    const tot = Object.values(by).reduce((a, b) => a + b, 0);
    if (tot) extra.push(`<div class="pd"><h2>💰 경비</h2><div class="p-cost">${Object.keys(by).map(c => `<span>${iconOf(c)} ${esc(c)} <b>${won(by[c])}</b></span>`).join('')}<span class="tot">합계 <b>${won(tot)}</b></span></div></div>`);
  }
  if (PR.memo && (t.memo || t.review)) extra.push(`<div class="pd"><h2>📝 메모 · 후기</h2>${t.memo ? `<div class="note">${esc(t.memo)}</div>` : ''}${t.review ? `<div class="note">${t.rating ? '★'.repeat(t.rating) + ' ' : ''}${esc(t.review)}</div>` : ''}</div>`);
  if (PR.pack && (t.packing || []).length) {
    const ppl = ['', ...pkPeople(t)], multi = ppl.length > 1;
    extra.push(`<div class="pd"><h2>🧳 준비물</h2>${ppl.map(w => {
      const list = t.packing.filter(p => pkWho(p) === w);
      return list.length ? `<div class="pk-p">${multi ? `<b>${w ? '👤 ' + esc(w) : '🧺 공용'}</b>` : ''}${list.map(p => `<span>${p.d ? '☑' : '☐'} ${esc(p.t)}</span>`).join('')}</div>` : '';
    }).join('')}</div>`);
  }
  return `<div class="ph1"><span class="em">${esc(t.emoji)}</span><div><h1>${esc(t.title)}</h1><div>${esc(dateLabel(t))} ${tagsOf(t).map(g => '#' + esc(g)).join(' ')}</div></div></div>
    <div class="p-body${PR.cols === 2 ? ' two' : ''}">${body || '<div class="p-m">출력할 일정이 없어요</div>'}${extra.join('')}</div>`;
}

function printBar() {
  const seg = (k, opts) => `<div class="seg mini">${opts.map(([v, l]) => `<button class="${PR[k] === v ? 'on' : ''}" onclick="A.setPR('${k}',${typeof v === 'string' ? `'${v}'` : v})">${l}</button>`).join('')}</div>`;
  const chip = (on, label, fn, c) => `<button class="pu-chip ${on ? 'on' : ''}" ${c ? `style="--c:${c}"` : ''} onclick="${fn}">${label}</button>`;
  return `<div class="pu-row"><button class="pb" onclick="A.pvClose()">✕ 닫기</button><span class="pu-info" id="puInfo"></span><span class="sp"></span>
      <button class="pb" onclick="A.pvImg()">🖼 이미지</button><button class="pb pri" onclick="window.print()">🖨 인쇄 · PDF</button></div>
    <div class="pu-row"><span class="pu-lbl">구성</span>${seg('mode', [['day', '일차별'], ['cat', '분류별']])}
      <span class="pu-lbl">단</span>${seg('cols', [[1, '1단'], [2, '2단']])}
      <span class="pu-lbl">장수</span>${seg('pages', [[1, '1장'], [2, '2장'], [3, '3장'], ['auto', '원래 크기']])}</div>
    <div class="pu-row"><span class="pu-lbl">분류</span>${CATS.map(([c, ic]) => chip(PR.cats.includes(c), `${ic} ${c}`, `A.prCat('${c}')`, CCOL[c])).join('')}</div>
    <div class="pu-row"><span class="pu-lbl">추가</span>${chip(PR.pack, '🧳 준비물', `A.setPR('pack',${!PR.pack})`)}${chip(PR.cost, '💰 경비', `A.setPR('cost',${!PR.cost})`)}
      ${chip(PR.memo, '📝 메모·후기', `A.setPR('memo',${!PR.memo})`)}${chip(PR.photos, '📷 사진', `A.setPR('photos',${!PR.photos})`)}</div>`;
}

/* 고른 장수 안에 들어가도록 글자 크기 자동 조절 + 쪽 나뉨 표시 */
function fitPage() {
  const pg = $('#page'); if (!pg) return;
  pg.style.zoom = 1; pg.style.minHeight = '0px';
  let f = 15;
  pg.style.fontSize = f + 'px';
  if (PR.pages !== 'auto') { const lim = PR.pages * PAGE_H - 4; while (f > 8 && pg.scrollHeight > lim) { f -= 0.5; pg.style.fontSize = f + 'px'; } }
  const n = Math.max(1, Math.ceil((pg.scrollHeight - 4) / PAGE_H));
  pg.style.minHeight = n * PAGE_H + 'px';
  $('#psLines').innerHTML = Array.from({ length: n - 1 }, (_, i) => `<div style="top:${(i + 1) * PAGE_H}px"><span>${i + 2}쪽</span></div>`).join('');
  const info = $('#puInfo'), small = f < 10.5;
  info.textContent = `A4 · 총 ${n}장 · 글자 ${Math.round(f / 15 * 100)}%${small ? ' · 너무 작아요, 장수를 늘리거나 2단으로' : ''}`;
  info.classList.toggle('warn', small);
  pg.style.zoom = Math.min(1, (window.innerWidth - 20) / 794);
}
function renderPrint() {
  const t = tripOf(S.tripId); if (!t) return;
  $('#puBar').innerHTML = printBar();
  $('#page').innerHTML = `<div id="psLines"></div>${printHtml(t)}`;
  requestAnimationFrame(fitPage);
  $$('#page img').forEach(im => { if (!im.complete) im.addEventListener('load', fitPage, { once: true }); });
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}

/* ───────── 동작 ───────── */
const A = window.A = {
  async login() {
    const k = $('#lg_p').value.trim();
    if (!k) { $('#lg_h').textContent = '비밀번호를 입력해주세요'; return; }
    $('#lg_h').textContent = '연결 중…';
    try {
      const r = await api('pull', {}, k);
      localStorage.setItem('tl:key', k);
      S.user = { id: API_URL }; S.sheetUrl = r.sheetUrl || '';
      if (!loadCache(S.user.id)) { S.trips = []; S.items = []; }
      S.trips = (r.trips || []).filter(t => t.id).map(fromSheetTrip);
      S.items = (r.items || []).filter(x => x.id).map(fromSheetItem);
      S.lastPull = Date.now(); saveCache(); routeFromHash(); render();
    } catch (e) { $('#lg_h').textContent = e.message; }
  },
  logout() {
    if (OB.length && !confirm(`아직 시트에 보내지 못한 변경 ${OB.length}건이 있어요. 연결을 해제하면 사라져요. 계속할까요?`)) return;
    closeSheet();
    OB = []; saveOB(); localStorage.removeItem('tl:data'); localStorage.removeItem('tl:key');
    S.user = null; S.trips = []; S.items = []; S.tripId = null; render();
  },
  home(k) {
    if (k) { S.home = k; render(); return; }
    if (location.hash) history.back(); else { S.tripId = null; render(); }
  },
  search(v) { S.q = v; const list = $('#list'); const tmp = document.createElement('div'); tmp.innerHTML = homeView(); list.innerHTML = $('#list', tmp).innerHTML; },
  theme(g) { S.theme = g; render(); },
  open(id) { location.hash = '#/trip/' + id; },
  tab(k) {
    S.tab = k; render();
    const nav = $('#daytabs'); if (nav) { const b = $('.on', nav); if (b) nav.scrollLeft = b.offsetLeft - 40; if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView(); }
  },
  costView(k) { S.costView = k; render(); },
  close() { closeSheet(); },
  fmtNum(el) { const v = el.value.replace(/[^\d]/g, ''); if (/^[\d,]*$/.test(el.value)) el.value = v ? (+v).toLocaleString('ko-KR') : ''; },
  addTag(g) { const f = $('#t_tags'), cur = f.value.split(',').map(x => x.trim()).filter(Boolean); if (!cur.includes(g)) cur.push(g); f.value = cur.join(', '); },

  /* 여행 */
  editTrip(id) { tripSheet(id ? tripOf(id) : null); },
  pickColor(b) { $$('.colors button').forEach(x => x.classList.toggle('on', x === b)); },
  pickOne(b) { $$('button', b.parentNode).forEach(x => x.classList.toggle('on', x === b)); },
  dateIn(el, next) {
    let v = el.value.replace(/\D/g, '').slice(0, 8);
    if (v.length === 8) {
      const f = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`;
      el.value = f;
      if (!validYmd(f)) { $('#t_h').textContent = '없는 날짜예요'; $('#t_h').classList.add('err'); return; }
      if (next) { const n = $('#' + next); if (n && !n.value) n.focus(); }
    } else el.value = v;
    A.tripHint();
  },
  datePick(id, v) { $('#' + id).value = v; A.tripHint(); },
  tripHint() {
    const s = $('#t_s').value, e = $('#t_e').value, h = $('#t_h');
    h.classList.remove('err');
    if (validYmd(s) && validYmd(e) && e < s) { h.textContent = '돌아오는 날이 출발일보다 빨라요'; h.classList.add('err'); return; }
    h.textContent = validYmd(s) ? lenLabel({ start_date: s, end_date: validYmd(e) ? e : s }) : '';
  },
  saveTrip(id) {
    const title = $('#t_title').value.trim();
    const s = $('#t_s').value.trim(), e = $('#t_e').value.trim();
    if (!title) { toast('여행 이름을 적어주세요'); $('#t_title').focus(); return; }
    if ((s && !validYmd(s)) || (e && !validYmd(e))) { toast('날짜를 확인해주세요 (예: 20261112)'); return; }
    if (validYmd(s) && validYmd(e) && e < s) { toast('돌아오는 날이 출발일보다 빨라요'); return; }
    const old = id && tripOf(id);
    const t = Object.assign(old ? { ...old } : normTrip({ id: newId() }), {
      title, tags: $('#t_tags').value.split(',').map(x => x.trim()).filter(Boolean).join(', '),
      start_date: s, end_date: e || s,
      emoji: ($('.emojis .on') || {}).dataset?.v || '✈️', color: ($('.colors .on') || {}).dataset?.v || 'ocean',
      memo: $('#t_memo').value.trim()
    });
    putTrip(t); closeSheet(true);
    if (!old) { S.tab = 'all'; A.open(t.id); } else render();
    toast('저장했어요');
  },
  dupTrip(id) {
    const t = tripOf(id); if (!t) return;
    const nt = normTrip({ ...t, id: newId(), title: t.title + ' (복사)', review: '', rating: 0, created_at: nowISO(),
      packing: (t.packing || []).map(p => (pkWho(p) ? { t: p.t, d: false, w: pkWho(p) } : { t: p.t, d: false })) });
    putTrip(nt);
    itemsOf(id).forEach(x => putItem(normItem({ ...x, id: newId(), trip_id: nt.id, created_at: nowISO() })));
    toast('복제했어요 · 준비물 체크와 후기는 비워졌어요', 3500);
    location.replace('#/trip/' + nt.id);
  },
  delTrip(id) {
    const t = tripOf(id); if (!t) return;
    if (!confirm(`'${t.title}' 여행과 일정 ${itemsOf(id).length}개를 모두 삭제할까요?`)) return;
    dropTrip(id); toast('삭제했어요');
    A.home();
  },
  rate(n) { const t = tripOf(S.tripId); t.rating = t.rating === n ? 0 : n; putTrip(t); render(); },
  review(v) {
    const t = tripOf(S.tripId); t.review = v;
    clearTimeout(A._rv); A._rv = setTimeout(() => putTrip(t), 700);
  },

  /* 준비물 */
  pk(i) { const t = tripOf(S.tripId); t.packing[i].d = !t.packing[i].d; putTrip(t); A._pkRender(); },
  pkDel(i) { const t = tripOf(S.tripId); t.packing.splice(i, 1); putTrip(t); A._pkRender(); },
  pkAdd(v) {
    const t = tripOf(S.tripId), inp = $('#pk_in');
    const list = splitList(String(v != null ? v : inp.value));
    const who = S.pkWho || '';
    const have = new Set(t.packing.filter(p => pkWho(p) === who).map(p => p.t)); // 같은 물건도 사람마다 따로
    list.forEach(s => { if (!have.has(s)) { t.packing.push(who ? { t: s, d: false, w: who } : { t: s, d: false }); have.add(s); } });
    if (!list.length) return;
    putTrip(t); A._pkRender();
    if (v == null) { const n = $('#pk_in'); n.value = ''; if (!isMobile) n.focus(); }
  },
  pkReset() { const t = tripOf(S.tripId); t.packing.forEach(p => p.d = false); putTrip(t); A._pkRender(); },
  pkClear() { if (!confirm('준비물 목록을 모두 지울까요?')) return; const t = tripOf(S.tripId); t.packing = []; putTrip(t); A._pkRender(); },
  pkWho(w) { S.pkWho = w; A._pkRender(); },
  pkPerson() {
    const t = tripOf(S.tripId); if (!t) return;
    const n = (prompt('누구 준비물인가요? (이름)') || '').trim().replace(/[,]/g, ' ');
    if (!n) return;
    S.pkExtra = S.pkExtra || {}; const ex = S.pkExtra[t.id] = S.pkExtra[t.id] || [];
    if (!pkPeople(t).includes(n)) ex.push(n);
    S.pkWho = n; A._pkRender();
    if (!isMobile) { const f = $('#pk_in'); if (f) f.focus(); }
  },
  pkRename(old) {
    const t = tripOf(S.tripId); if (!t) return;
    const v = prompt(`'${old}' 이름 바꾸기\n비워두고 확인하면 이 사람 준비물을 공용으로 옮겨요`, old);
    if (v === null) return;
    const n = v.trim().replace(/[,]/g, ' ');
    if (n === old) return;
    t.packing.forEach(p => { if (pkWho(p) === old) { if (n) p.w = n; else delete p.w; } });
    S.pkExtra = S.pkExtra || {};
    const ex = (S.pkExtra[t.id] || []).filter(w => w !== old);
    if (n && !t.packing.some(p => pkWho(p) === n) && !ex.includes(n)) ex.push(n); // 아직 물건이 없는 사람이면 칩 유지
    S.pkExtra[t.id] = ex;
    S.pkWho = n; putTrip(t); A._pkRender();
  },
  _pkRender() { const box = $('#packing'), t = tripOf(S.tripId); if (box && t) box.outerHTML = packingView(t); },

  /* 일정 */
  newItem(d, cat) {
    const t = tripOf(S.tripId), days = tripDays(t);
    if (d === undefined) d = days.includes(S.tab) ? S.tab : (days.includes(today()) ? today() : days[0]);
    E = normItem({ id: newId(), trip_id: t.id, date: d || '', category: cat || '갈곳', created_at: nowISO() });
    E._new = []; E._removed = []; E._orig = null;
    itemSheet();
    if (!isMobile) setTimeout(() => $('#i_title') && $('#i_title').focus(), 250);
  },
  editItem(id) {
    if (VIEW) return; // 보기 전용
    const x = S.items.find(v => v.id === id); if (!x) return;
    E = normItem(JSON.parse(JSON.stringify(x)));
    E._new = []; E._removed = []; E._orig = x;
    itemSheet();
  },
  cat(c) { readItemForm(); E.category = c; const y = $('#sheet').scrollTop; itemSheet(); $('#sheet').scrollTop = y; },
  iSync() { readItemForm(); if (E.category === '숙소') { const y = $('#sheet').scrollTop; E.end_date = ''; itemSheet(); $('#sheet').scrollTop = y; } },
  phDel(k) { readItemForm(); const [p] = E.photos.splice(k, 1); if (p && E._new.includes(p.id)) { removePhotos([p.id]); E._new = E._new.filter(x => x !== p.id); } $('#i_ph').innerHTML = photosEditor(); },
  saveItem() {
    readItemForm();
    if (E._up) { toast('사진을 올리는 중이에요. 잠시 후 저장해주세요'); return; }
    if (!E.title && !E.place) { toast(E.category === '이동' ? '출발지를 적어주세요' : '이름을 적어주세요'); $('#i_title').focus(); return; }
    if (E.category !== '숙소') { E.end_date = ''; E.end_time = ''; }
    else if (E.end_date && (!E.date || E.end_date <= E.date)) E.end_date = '';
    const o = E._orig;
    const replace = !o || o.date !== E.date || o.time !== E.time; // 새 일정·날짜/시간 변경 → 알맞은 자리로
    // 장소가 바뀌면 좌표를 비워두고, 시트에 저장할 때 Apps Script가 새로 찾아 채워요
    if (o && (o.place !== E.place || o.title !== E.title || o.category !== E.category)) E.route = '';
    const x = normItem(E);
    putItem(x);
    if (replace) placeInDay(x);
    if (o && o.date !== x.date) renumber(sortDay(itemsOf(x.trip_id).filter(v => v.date === o.date)));
    closeSheet(true); render(); toast('저장했어요');
  },
  delItem() {
    if (!confirm('이 일정을 삭제할까요?')) return;
    removePhotos(E._new); // 저장 전에 올린 사진 (저장된 사진은 시트에서 지울 때 함께 정리)
    dropItem(E.id); E._new = []; closeSheet(true); render(); toast('삭제했어요');
  },
  move(dir) {
    readItemForm();
    const list = sortDay(itemsOf(E.trip_id).filter(x => x.date === E._orig.date));
    const i = list.findIndex(x => x.id === E.id), j = i + dir;
    if (j < 0 || j >= list.length) return;
    if (list[i].time && list[j].time) { toast('둘 다 시간이 있으면 시간 순서로 정렬돼요. 시간을 바꿔주세요', 3500); return; }
    [list[i], list[j]] = [list[j], list[i]];
    renumber(list);
    E.ord = list.find(x => x.id === E.id).ord;
    const y = $('#sheet').scrollTop; itemSheet(); $('#sheet').scrollTop = y; render();
  },
  /* 사진 보기 */
  lightbox(id, k) {
    const x = S.items.find(v => v.id === id); if (!x) return;
    if (S.tab === 'log') {
      const t = tripOf(x.trip_id);
      const all = orderedItems(t).flatMap(v => (v.photos || []).map((p, kk) => ({ p, id: v.id, kk })));
      LB = { list: all.map(o => o.p), i: Math.max(0, all.findIndex(o => o.id === id && o.kk === k)) };
    } else LB = { list: x.photos, i: k };
    showLB();
  },
  lbGo(d) { if (!LB) return; LB.i = (LB.i + d + LB.list.length) % LB.list.length; showLB(); },
  lbClose() { LB = null; $('#lb').classList.remove('on'); $('#lb').innerHTML = ''; },

  /* 출력 */
  print(id) {
    if (!tripOf(id)) return;
    $('#pv').innerHTML = `<div class="pv-bar" id="puBar"></div><div class="page" id="page"></div>`;
    $('#pv').classList.add('on'); document.body.style.overflow = 'hidden';
    renderPrint();
  },
  setPR(k, v) { PR[k] = v; renderPrint(); },
  prCat(c) { PR.cats = PR.cats.includes(c) ? PR.cats.filter(x => x !== c) : CATS.map(x => x[0]).filter(x => x === c || PR.cats.includes(x)); renderPrint(); },
  pvClose() { $('#pv').classList.remove('on'); $('#pv').innerHTML = ''; document.body.style.overflow = ''; },
  async pvImg() {
    toast('이미지 만드는 중…');
    try {
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const pg = $('#page'), zm = pg.style.zoom; pg.style.zoom = 1; $('#psLines').style.display = 'none';
      const c = await html2canvas(pg, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      pg.style.zoom = zm; $('#psLines').style.display = '';
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const t = tripOf(S.tripId), name = `${(t && t.title) || '여행'}_일정.png`.replace(/[\\/:*?"<>|]/g, '_');
      const file = new File([blob], name, { type: 'image/png' });
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { if (e && e.name !== 'AbortError') toast('이미지를 만들지 못했어요: ' + (e.message || e)); }
  },

  /* 보기 전용 공유 (여행 1건) */
  async share(id) {
    const t = tripOf(id); if (!t) return;
    if (!navigator.onLine) { toast('공유 링크는 인터넷이 연결됐을 때 만들 수 있어요'); return; }
    openSheet(`<h3>🔗 보기 전용 공유</h3><div class="sm" style="color:var(--sub)">확인 중…</div>`, 'share');
    try {
      await flush(); // 방금 고친 내용이 시트에 먼저 들어가도록
      const r = await api('shareList');
      A._shareSheet(t, (r.shares || []).find(s => s.tripId === id) || null);
    } catch (e) { A._shareErr(e); }
  },
  _shareErr(e) {
    const old = /알 수 없는 요청/.test(e.message || '');
    if (SHEET && SHEET.kind === 'share') $('#sheet').innerHTML = `<div class="grip"></div><h3>🔗 보기 전용 공유</h3>
      <div class="hint err" style="font-size:14px">${old ? 'Apps Script에 공유 기능이 아직 없어요.<br>Share.gs를 추가하고 새 버전으로 배포해주세요. (README-공유 참고)' : esc(e.message)}</div>
      <div class="btns"><button class="btn" onclick="A.close()">닫기</button></div>`;
    else toast(old ? 'Apps Script에 공유 기능을 먼저 추가해주세요' : e.message, 5000);
  },
  _shareUrl: token => location.origin + location.pathname + '?share=' + token,
  _shareSheet(t, sh) {
    const url = sh ? A._shareUrl(sh.token) : '';
    const opt = sh ? Object.assign({ pack: true }, sh) : { cost: false, memo: false, pack: true };
    const chk = (k, label, sub) => `<label class="row" style="align-items:flex-start;gap:10px;margin:10px 0;cursor:pointer">
      <input type="checkbox" id="sh_${k}" ${opt[k] ? 'checked' : ''} style="width:20px;height:20px;flex:none;margin-top:1px">
      <span><b style="font-size:14.5px">${label}</b><br><small style="color:var(--sub)">${sub}</small></span></label>`;
    $('#sheet').innerHTML = `<div class="grip"></div><h3>🔗 보기 전용 공유</h3>
      <div class="sm" style="margin-bottom:6px"><b>${esc(t.emoji)} ${esc(t.title || '제목 없는 여행')}</b> 1건만 보여주는 링크예요.
        다른 여행은 보이지 않고, 받은 사람은 고칠 수 없어요. 내가 수정하면 상대방 화면에도 반영돼요.</div>
      ${sh ? `<label class="f">공유 링크</label>
        <div class="row"><input class="in" id="sh_url" value="${esc(url)}" readonly onclick="this.select()">
          <button class="btn pri" style="flex:none;padding:0 16px" onclick="A.shareCopy()">복사</button></div>
        ${isMobile && navigator.share ? `<button class="btn" style="width:100%;margin-top:8px" onclick="A.shareSend()">📤 카톡·문자로 보내기</button>` : ''}` : ''}
      <label class="f">함께 보여줄 항목</label>
      ${chk('pack', '🧳 준비물', '사람별 목록과 체크 상태 (보기만 가능)')}
      ${chk('cost', '💰 경비', '일정별 비용과 경비 정리')}
      ${chk('memo', '📝 메모', '여행 메모와 일정 메모 (예약 번호 등이 있으면 주의)')}
      <div class="hint">일정·숙소·지도 길찾기·링크·사진은 항상 보여요. 별점, 후기는 항상 숨겨요.</div>
      <div class="btns" style="flex-direction:column">
        ${sh ? `<button class="btn pri" onclick="A.shareSave('${t.id}')">보여줄 항목 저장</button>
          <button class="btn" onclick="A.shareSave('${t.id}',true)">🔄 새 링크로 바꾸기 <small style="font-weight:600;color:var(--sub)">(지금 링크는 막혀요)</small></button>
          <button class="btn" style="color:var(--warn)" onclick="A.shareStop('${t.id}')">공유 중지</button>`
        : `<button class="btn pri" onclick="A.shareSave('${t.id}')">공유 링크 만들기</button>`}
        <button class="btn" onclick="A.close()">닫기</button>
      </div>`;
  },
  async shareSave(id, renew) {
    const t = tripOf(id); if (!t) return;
    if (renew && !confirm('새 링크로 바꾸면 지금 링크로는 더 이상 볼 수 없어요. 바꿀까요?')) return;
    const cost = $('#sh_cost').checked, memo = $('#sh_memo').checked, pack = $('#sh_pack').checked;
    toast('저장 중…', 10000);
    try {
      await flush();
      const r = await api('shareSet', { tripId: id, cost, memo, pack, renew: !!renew });
      A._shareSheet(t, r);
      toast(renew ? '새 링크로 바꿨어요' : '저장했어요 · 링크를 복사해서 보내주세요', 3500);
    } catch (e) { A._shareErr(e); }
  },
  async shareStop(id) {
    if (!confirm('공유를 중지할까요? 보낸 링크로는 더 이상 볼 수 없어요.')) return;
    try { await api('shareStop', { tripId: id }); A._shareSheet(tripOf(id), null); toast('공유를 중지했어요'); }
    catch (e) { A._shareErr(e); }
  },
  async shareCopy() {
    const f = $('#sh_url'); if (!f) return;
    try { await navigator.clipboard.writeText(f.value); }
    catch (e) { f.select(); document.execCommand('copy'); }
    toast('링크를 복사했어요');
  },
  async shareSend() {
    const f = $('#sh_url'), t = tripOf(S.tripId); if (!f) return;
    try { await navigator.share({ title: (t && t.title) || '여행 일정', text: `${(t && t.title) || '여행'} 일정이에요`, url: f.value }); }
    catch (e) { if (e && e.name !== 'AbortError') A.shareCopy(); }
  },

  /* 설정 */
  settings() {
    const noGeo = S.items.filter(x => x.place && !(x.geo && x.geo.to)).length;
    openSheet(`<h3>설정</h3>
      <div class="sm" style="color:var(--sub);margin-bottom:6px">구글 시트 연결됨 · 여행 ${S.trips.length}개 · 일정 ${S.items.length}개${OB.length ? ` · 보낼 변경 ${OB.length}건` : ''}</div>
      <div class="btns" style="flex-direction:column">
        <button class="btn" onclick="A.close();A.refresh()">🔄 지금 동기화</button>
        ${S.sheetUrl ? `<a class="btn" style="text-align:center;text-decoration:none" href="${esc(S.sheetUrl)}" target="_blank" rel="noopener">📄 구글 시트 열기</a>` : ''}
        ${noGeo ? `<button class="btn" onclick="A.close();A.geoAll()">📍 좌표 없는 일정 ${noGeo}개 다시 찾기</button>` : ''}
        <button class="btn" onclick="A.update()">⬆️ 앱 최신 버전으로 새로고침</button>
        <button class="btn" style="color:var(--warn)" onclick="A.logout()">이 기기 연결 해제</button>
        <button class="btn" onclick="A.close()">닫기</button>
      </div>`, 'settings');
  },
  async refresh() { await pull(true); toast(navigator.onLine ? '최신 상태예요' : '오프라인이에요'); },
  async geoAll() {
    toast('좌표 찾는 중…', 60000);
    try {
      await flush();
      const r = await api('regeo');
      await pull(true);
      toast(`${r.found}개 찾음${r.missed ? ` · ${r.missed}개는 못 찾았어요 (상호+지점이나 도로명 주소로 적어주세요)` : ''}`, 5000);
    } catch (e) { toast(e.message, 4000); }
  },
  async update() {
    try { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update(); } catch (e) { }
    location.reload();
  }
};
window.toast = toast;

/* ───────── 시작 ───────── */
function routeFromHash() {
  if (VIEW) return; // 공유 링크는 그 여행 하나만
  const m = location.hash.match(/^#\/trip\/([\w-]+)/);
  const id = m ? m[1] : null;
  if (id !== S.tripId) { S.tripId = id; S.tab = 'all'; S.pkWho = ''; window.scrollTo(0, 0); }
}

window.addEventListener('hashchange', () => { closeSheet(); A.lbClose(); A.pvClose(); routeFromHash(); render(); });
$('#scrim').addEventListener('click', () => closeSheet());
$('#filePick').addEventListener('change', e => { addPhotos(e.target.files); e.target.value = ''; });
document.addEventListener('paste', e => {
  if (!SHEET || SHEET.kind !== 'item') return;
  const files = Array.from(e.clipboardData ? e.clipboardData.files : []);
  if (files.length) { e.preventDefault(); addPhotos(files); }
});
['dragover', 'drop'].forEach(ev => $('#sheet').addEventListener(ev, e => {
  if (!SHEET || SHEET.kind !== 'item') return;
  e.preventDefault();
  if (ev === 'drop') addPhotos(e.dataTransfer.files);
}));
document.addEventListener('keydown', e => {
  if ($('#lb').classList.contains('on')) {
    if (e.key === 'Escape') A.lbClose(); else if (e.key === 'ArrowLeft') A.lbGo(-1); else if (e.key === 'ArrowRight') A.lbGo(1);
    return;
  }
  if (e.key === 'Escape') { if ($('#pv').classList.contains('on')) A.pvClose(); else closeSheet(); }
});
let tx = 0;
$('#lb').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
$('#lb').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) A.lbGo(dx < 0 ? 1 : -1); }, { passive: true });
window.addEventListener('resize', () => { if ($('#pv').classList.contains('on')) fitPage(); });

window.addEventListener('online', () => { flush(); pull(true); });
window.addEventListener('offline', renderSync);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pull(false);
  else if (OB.length) flush(); // 앱을 내리기 전에 남은 변경 보내기
});
window.addEventListener('focus', () => pull(false));

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });

(function start() {
  if (!configured) { render(); return; }
  if (VIEW) {
    const c = LS.get(viewCacheKey(), null);
    if (c && c.trip) applyShared(c);
    render(); pullShared(true);
    return;
  }
  if (getKey()) {
    S.user = { id: API_URL };
    loadCache(S.user.id);
    routeFromHash(); render();
    pull(true);
  } else render();
})();
