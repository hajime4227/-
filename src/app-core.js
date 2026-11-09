/* Core: helpers, plan building, scoring, capability setup. */
const D = window.DATA;
const App = {
  caps: { db: null, user: null, downloads: null },
  uid: null,
  isAdmin: false,
  target: JSON.parse(JSON.stringify(D.defaultTarget)),
  results: null,
  state: { view: "loading", track: null, name: "", ident: "", page: 0, ans: { p: [], c: [], a: [] }, deadline: 0, secs: 0, err: "", busy: false },
  admin: { tab: "results", filter: "all", sel: null, confirmDel: null, draftTarget: null }
};

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r) => (r || document).querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (t) => { const d = new Date(t); return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const fmtSecs = (s) => Math.floor(s / 60) + "分" + pad(s % 60) + "秒";

function toast(msg) {
  const old = $(".toast"); if (old) old.remove();
  const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
}

/* Items are shown interleaved across dimensions so that neighbours measure different things. */
function interleave(items) {
  const groups = {}, order = [];
  items.forEach((it, i) => { if (!groups[it.d]) { groups[it.d] = []; order.push(it.d); } groups[it.d].push(i); });
  const out = []; let n = 0, more = true;
  while (more) { more = false; order.forEach((d) => { if (groups[d][n] !== undefined) { out.push(groups[d][n]); more = true; } }); n++; }
  return out;
}
function chunk(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }

function buildPlan(track) {
  const c = D.culture.common.concat(D.culture[track]);
  const a = D.ability[track].items;
  const pages = [];
  chunk(interleave(D.personality), 5).forEach((ix) => pages.push({ kind: "p", part: "性格", ix }));
  chunk(interleave(c), 7).forEach((ix) => pages.push({ kind: "c", part: "価値観", ix }));
  chunk(a.map((_, i) => i), 4).forEach((ix) => pages.push({ kind: "a", part: "能力", ix }));
  return { p: D.personality, c, a, pages };
}

function cultureDimsFor(track) { return D.cultureDims.common.concat(D.cultureDims[track] || []); }

function scoreScale(items, ans, dimKeys) {
  const out = {};
  dimKeys.forEach((k) => {
    let sum = 0, n = 0;
    items.forEach((it, i) => { if (it.d !== k) return; const x = ans[i]; sum += it.r ? 6 - x : x; n++; });
    out[k] = n ? Math.round(((sum / n) - 1) * 25) : null;
  });
  return out;
}

function scoreAbility(items, ans) {
  const s = D.abilitySections.map(() => 0), n = D.abilitySections.map(() => 0);
  items.forEach((it, i) => { const k = D.abilitySections.indexOf(it.s); n[k]++; if (ans[i] === it.a) s[k]++; });
  return { s, n };
}

function targetFor(track) { return Object.assign({}, D.defaultTarget[track], (App.target && App.target[track]) || {}); }

/* Closeness to the target profile: 100 minus the mean absolute gap across the culture dimensions. */
function fitScore(doc) {
  const t = targetFor(doc.track), dims = cultureDimsFor(doc.track);
  let sum = 0, n = 0;
  dims.forEach((d) => { if (doc.c && doc.c[d.k] != null && t[d.k] != null) { sum += Math.abs(doc.c[d.k] - t[d.k]); n++; } });
  return n ? Math.round(100 - sum / n) : null;
}
const fitClass = (f) => (f == null ? "" : f >= 80 ? "fit-good" : f >= 65 ? "fit-mid" : "fit-low");
const abilityTotal = (doc) => (doc.ab ? doc.ab.s.reduce((a, b) => a + b, 0) : 0);
const abilityMax = (doc) => (doc.ab ? doc.ab.n.reduce((a, b) => a + b, 0) : 0);

function withTimeout(p, ms) { return Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]); }

async function initCaps() {
  const use = (n) => (window.claude && window.claude.use ? withTimeout(window.claude.use(n).catch(() => null), 5000) : Promise.resolve(null));
  const [db, user, downloads] = await Promise.all([use("db"), use("user"), use("downloads")]);
  App.caps = { db, user, downloads };
  if (user) {
    try { App.isAdmin = !!(await user.canEdit()); } catch (e) { App.isAdmin = false; }
    try { App.uid = await user.id(); } catch (e) { App.uid = null; }
  }
}
