/* Candidate flow: intro, test pages, submit, done. */
let timerId = null;

function topbar(extra) {
  return '<div class="topbar"><div class="brand"><i></i>適性診断</div><div class="row">' + (extra || "") + "</div></div>";
}

function renderIntro() {
  const S = App.state, hashTrack = App.hashTrack;
  const canSave = !!(App.caps.db && App.uid);
  const trackPick = hashTrack
    ? '<p><span class="chip accent">' + esc(D.tracks[hashTrack].label) + "</span></p>"
    : '<div class="field"><label>受検区分</label><div class="seg" role="group" aria-label="受検区分">' +
      Object.keys(D.tracks).map((k) => '<button type="button" data-act="track" data-v="' + k + '" aria-pressed="' + (S.track === k) + '">' + esc(D.tracks[k].label) + "</button>").join("") + "</div></div>";
  const ready = S.track && S.name.trim() && S.ident.trim() && canSave;
  const back = App.isAdmin ? '<button class="btn quiet" data-act="to-admin">管理画面に戻る</button>' : "";
  return topbar(back) +
    '<div class="wrap"><div class="card stack">' +
    "<h1>適性診断</h1>" +
    '<p class="muted">性格、仕事の進め方に関する価値観、基礎的な能力の3部構成です。所要時間は約25分です。能力検査だけ制限時間（12分）があり、他の部分に制限はありません。</p>' +
    trackPick +
    '<div class="field"><label for="f-name">氏名</label><input class="input" id="f-name" autocomplete="name" value="' + esc(S.name) + '"></div>' +
    '<div class="field"><label for="f-ident">受検ID またはメールアドレス</label><input class="input" id="f-ident" autocomplete="email" value="' + esc(S.ident) + '"></div>' +
    '<div class="notice">回答は採用選考の参考情報として、採用担当者が確認します。診断結果だけで合否を決めることはありません。正解を探さず、普段の自分に近いものを選んでください。</div>' +
    (canSave ? "" : '<div class="notice">この画面では回答を保存できません。サインインしてから、もう一度開いてください。</div>') +
    '<div class="row"><button class="btn primary" data-act="start" id="btn-start"' + (ready ? "" : " disabled") + ">検査を始める</button></div>" +
    "</div></div>";
}

function pageNumberBase(plan, kind, page) {
  let n = 0;
  for (let i = 0; i < page; i++) if (plan.pages[i].kind === kind) n += plan.pages[i].ix.length;
  return n;
}

function pageComplete() {
  const S = App.state, pg = S.plan.pages[S.page];
  return pg.ix.every((i) => S.ans[pg.kind][i] != null);
}

function renderTest() {
  const S = App.state, plan = S.plan, pg = plan.pages[S.page], total = plan.pages.length;
  const parts = ["性格", "価値観", "能力"];
  const phases = '<div class="phases">' + parts.map((p) => (p === pg.part ? "<b>" + p + "</b>" : "<span>" + p + "</span>")).join("") + "</div>";
  const timer = pg.kind === "a" ? '<div class="timer" id="timer" aria-live="off">' + fmtClock(remaining()) + "</div>" : "";
  const base = pageNumberBase(plan, pg.kind, S.page);
  let body = "";
  pg.ix.forEach((i, n) => {
    const num = base + n + 1;
    if (pg.kind === "a") {
      const it = plan.a[i];
      body += '<div class="q"><div class="q-tag">' + esc(it.s) + " " + num + '</div><div class="q-text">' + esc(it.q) + '</div><div class="opts" role="radiogroup">' +
        it.o.map((o, k) => '<div class="opt"><input type="radio" name="a:' + i + '" id="a-' + i + "-" + k + '" value="' + k + '"' + (S.ans.a[i] === k ? " checked" : "") + '><label for="a-' + i + "-" + k + '">' + esc(o) + "</label></div>").join("") + "</div></div>";
    } else {
      const it = plan[pg.kind][i];
      body += '<div class="q"><div class="q-tag">Q' + num + '</div><div class="q-text">' + esc(it.t) + '</div><div class="scale" role="radiogroup" aria-label="Q' + num + '">' +
        [1, 2, 3, 4, 5].map((v) => '<input type="radio" name="' + pg.kind + ":" + i + '" id="' + pg.kind + "-" + i + "-" + v + '" value="' + v + '"' + (S.ans[pg.kind][i] === v ? " checked" : "") + '><label for="' + pg.kind + "-" + i + "-" + v + '" title="' + D.likert[v - 1] + '">' + v + "</label>").join("") +
        '</div><div class="scale-ends"><span>1 ' + D.likert[0] + "</span><span>5 " + D.likert[4] + "</span></div></div>";
    }
  });
  const last = S.page === total - 1;
  const canBack = S.page > 0 && !(pg.kind === "a" && plan.pages[S.page - 1].kind !== "a");
  const confirmQuit = S.confirmQuit
    ? '<div class="notice stack-sm" role="alertdialog" aria-label="診断の中断"><p><b>診断を中断しますか？</b> ここまでの回答は保存されず、最初の画面に戻ります。</p><div class="row"><button class="btn danger" data-act="quit-yes">中断して最初の画面に戻る</button><button class="btn" data-act="quit-no">続ける</button></div></div>'
    : "";
  return topbar(timer + '<button class="btn quiet" data-act="quit">中断する</button>') +
    '<div class="wrap"><div class="card stack">' +
    '<div class="progress"><div class="track"><div class="fill" style="width:' + Math.round((S.page / total) * 100) + '%"></div></div>' + phases + "</div>" +
    confirmQuit +
    "<div>" + body + "</div>" +
    '<div class="pager"><button class="btn" data-act="back"' + (canBack ? "" : " hidden") + '>戻る</button><button class="btn primary" data-act="' + (last ? "submit" : "next") + '" id="btn-next"' + (pageComplete() ? "" : " disabled") + ">" + (last ? "回答を送信する" : "次へ") + "</button></div>" +
    "</div></div>";
}

function renderSending() {
  return topbar() + '<div class="wrap"><div class="card empty"><h3>回答を送信しています</h3><p>このまま少しお待ちください。</p></div></div>';
}

function renderError() {
  return topbar() + '<div class="wrap"><div class="card stack"><h2>送信できませんでした</h2><p class="muted">' + esc(App.state.err) + '</p><div class="row"><button class="btn primary" data-act="retry">もう一度送信する</button></div></div></div>';
}

function renderDone() {
  const S = App.state;
  const msg = S.already
    ? "この診断は、すでに受検済みです。再受検が必要な場合は、採用担当者にご連絡ください。"
    : "回答を送信しました。ご協力ありがとうございました。この画面は閉じて構いません。";
  const back = App.isAdmin ? '<div class="row"><button class="btn primary" data-act="to-admin">管理画面で結果を見る</button></div>' : "";
  return topbar() + '<div class="wrap"><div class="card stack"><h2>' + (S.already ? "受検済みです" : "受検が完了しました") + '</h2><p class="muted">' + esc(App.isAdmin && !S.already ? "テスト受検として保存しました。結果は管理画面に表示されます。" : msg) + "</p>" + back + "</div></div>";
}

/* timer */
function remaining() { return Math.max(0, Math.ceil((App.state.deadline - Date.now()) / 1000)); }
function fmtClock(s) { return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
function startTimer() {
  const S = App.state;
  if (!S.deadline) S.deadline = Date.now() + D.ability[S.track].limit * 1000;
  if (timerId) return;
  timerId = setInterval(() => {
    const r = remaining(), el = $("#timer");
    if (el) { el.textContent = fmtClock(r); el.classList.toggle("low", r <= 60); }
    if (r <= 0) { clearInterval(timerId); timerId = null; submitAnswers(true); }
  }, 1000);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

async function submitAnswers(timedOut) {
  const S = App.state;
  if (S.busy) return;
  S.busy = true; stopTimer(); S.view = "sending"; render();
  const plan = S.plan;
  const secs = S.deadline ? Math.min(D.ability[S.track].limit, D.ability[S.track].limit - remaining()) : 0;
  const raw = (arr, n) => Array.from({ length: n }, (_, i) => (arr[i] == null ? "-" : arr[i])).join("");
  const doc = {
    name: S.name.trim(), ident: S.ident.trim(), track: S.track, at: Date.now(), sample: false, preview: App.isAdmin,
    p: scoreScale(plan.p, S.ans.p, D.personalityDims.map((d) => d.k)),
    c: scoreScale(plan.c, S.ans.c, cultureDimsFor(S.track).map((d) => d.k)),
    ab: Object.assign(scoreAbility(plan.a, S.ans.a), { secs, timedOut: !!timedOut }),
    raw: { p: raw(S.ans.p, plan.p.length), c: raw(S.ans.c, plan.c.length), a: raw(S.ans.a, plan.a.length) }
  };
  try {
    await App.caps.db.doc("results/" + App.uid).set(doc);
    S.busy = false; S.view = "done"; S.already = false;
  } catch (e) {
    S.busy = false; S.view = "error";
    S.err = e && e.code === "quota_exceeded" ? "保存の上限に達しています。採用担当者にご連絡ください。" : "通信に失敗しました。回答は画面に残っています。もう一度お試しください。";
  }
  render();
}

function candidateClick(act, el) {
  const S = App.state;
  if (act === "track") { S.track = el.dataset.v; render(); return true; }
  if (act === "start") {
    S.plan = buildPlan(S.track); S.page = 0; S.ans = { p: [], c: [], a: [] }; S.deadline = 0; S.view = "test"; render(); window.scrollTo(0, 0); return true;
  }
  if (act === "next") {
    if (!pageComplete()) return true;
    S.page++; if (S.plan.pages[S.page].kind === "a") startTimer(); render(); window.scrollTo(0, 0); return true;
  }
  if (act === "back") { S.page--; render(); window.scrollTo(0, 0); return true; }
  if (act === "submit") { if (pageComplete()) submitAnswers(false); return true; }
  if (act === "retry") { S.view = "test"; submitAnswers(false); return true; }
  if (act === "to-admin") { S.view = "admin"; stopTimer(); render(); return true; }
  if (act === "quit") { S.confirmQuit = true; render(); const b = $('[data-act="quit-no"]'); if (b) b.focus(); return true; }
  if (act === "quit-no") { S.confirmQuit = false; render(); return true; }
  if (act === "quit-yes") {
    stopTimer();
    Object.assign(S, { view: "intro", track: App.hashTrack, name: "", ident: "", page: 0, plan: null, ans: { p: [], c: [], a: [] }, deadline: 0, secs: 0, err: "", busy: false, confirmQuit: false });
    render(); window.scrollTo(0, 0); return true;
  }
  return false;
}

function candidateInput(e) {
  const S = App.state, t = e.target;
  if (t.id === "f-name") S.name = t.value;
  else if (t.id === "f-ident") S.ident = t.value;
  else if (t.type === "radio" && t.name.indexOf(":") > 0) {
    const [kind, idx] = t.name.split(":"); S.ans[kind][Number(idx)] = Number(t.value);
    const b = $("#btn-next"); if (b) b.disabled = !pageComplete();
    return;
  } else return;
  const s = $("#btn-start"); if (s) s.disabled = !(S.track && S.name.trim() && S.ident.trim() && App.caps.db && App.uid);
}
