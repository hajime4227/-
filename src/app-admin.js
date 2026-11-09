/* Hiring-team screens: results list and detail, target profile, guide, CSV export. */
const ALL_CULTURE = D.cultureDims.common.concat(D.cultureDims.shinsotsu, D.cultureDims.chuto);

function adminTopbar() {
  return topbar('<button class="btn" data-act="preview">受検画面を試す</button>');
}

function tabsHtml() {
  const A = App.admin, t = [["results", "受検結果"], ["target", "目標プロフィール"], ["guide", "使い方と注意"]];
  return '<div class="tabs" role="tablist">' + t.map((x) => '<button role="tab" data-act="tab" data-v="' + x[0] + '" aria-selected="' + (A.tab === x[0]) + '">' + x[1] + "</button>").join("") + "</div>";
}

function tagsFor(r) {
  return (r.sample ? ' <span class="chip warn">サンプル</span>' : "") + (r.preview ? ' <span class="chip warn">テスト受検</span>' : "");
}

function meter(v, target) {
  return '<div class="meter"><div class="v" style="width:' + v + '%"></div>' + (target != null ? '<div class="t" style="left:' + target + '%"></div>' : "") + "</div>";
}

function detailHtml(r) {
  const A = App.admin, f = fitScore(r), tgt = targetFor(r.track);
  const ab = r.ab || { s: [0, 0, 0], n: [4, 4, 4], secs: 0 };
  const abRows = D.abilitySections.map((s, i) => '<div><div class="bar-head"><span>' + s + '</span><span class="stat">' + ab.s[i] + " / " + ab.n[i] + "</span></div>" + meter(Math.round((ab.s[i] / ab.n[i]) * 100)) + "</div>").join("");
  const pRows = D.personalityDims.map((d) => {
    const v = r.p ? r.p[d.k] : null; if (v == null) return "";
    return '<div><div class="bar-head"><span>' + d.name + '</span><span class="stat">' + v + "</span></div>" + meter(v) + '<div class="meter-ends"><span>' + d.lo + "</span><span>" + d.hi + "</span></div></div>";
  }).join("");
  const cRows = cultureDimsFor(r.track).map((d) => {
    const v = r.c ? r.c[d.k] : null; if (v == null) return "";
    const diff = v - tgt[d.k];
    return '<div><div class="bar-head"><span>' + d.name + '</span><span class="stat">' + v + ' <span class="muted small">目標 ' + tgt[d.k] + "（" + (diff >= 0 ? "+" : "−") + Math.abs(diff) + "）</span></span></div>" + meter(v, tgt[d.k]) + "</div>";
  }).join("");
  const confirming = A.confirmDel === r.id;
  return '<div class="card stack">' +
    '<div class="row between"><div><h2>' + esc(r.name || "（氏名なし）") + "</h2><p class=\"muted small\">" + esc(r.ident || "") + "</p></div>" +
    '<button class="btn quiet" data-act="close-detail" aria-label="詳細を閉じる">閉じる</button></div>' +
    '<div class="row"><span class="chip accent">' + esc((D.tracks[r.track] || {}).label || "") + "</span>" + tagsFor(r) + '<span class="muted small num">' + fmtDate(r.at) + "</span></div>" +
    '<div class="row"><div class="grow"><div class="muted small">能力検査</div><div class="stat" style="font-size:22px">' + abilityTotal(r) + " / " + abilityMax(r) + '</div></div><div class="grow"><div class="muted small">目標プロフィールとの近さ</div><div class="stat ' + fitClass(f) + '" style="font-size:22px">' + (f == null ? "-" : f) + "</div></div></div>" +
    "<h3>能力" + (ab.timedOut ? ' <span class="chip warn">時間切れ</span>' : "") + ' <span class="muted small num">所要 ' + fmtSecs(ab.secs || 0) + "</span></h3>" + '<div class="bars">' + abRows + "</div>" +
    "<h3>性格（0〜100）</h3>" + '<div class="bars">' + pRows + "</div>" +
    "<h3>価値観・カルチャー</h3>" + '<div class="legend"><span><i></i>本人の回答</span><span><i class="t"></i>目標</span></div><div class="bars">' + cRows + "</div>" +
    '<div class="notice">設問は、性格が公開尺度の日本語訳、価値観と能力が自作です。いずれも入社後の活躍との関連は検証されていません。面接を補う参考情報として使い、合否の判断はこの結果だけで行わないでください。</div>' +
    '<div class="row">' + (confirming
      ? '<span class="small">この結果を削除します。元に戻せません。</span><button class="btn danger" data-act="del-yes" data-id="' + esc(r.id) + '">削除する</button><button class="btn" data-act="del-no">やめる</button>'
      : '<button class="btn danger" data-act="del" data-id="' + esc(r.id) + '">この結果を削除</button>') + "</div></div>";
}

function resultsTab() {
  const A = App.admin, all = App.results;
  if (all == null) return '<div class="card empty"><p>読み込んでいます</p></div>';
  const list = all.filter((r) => A.filter === "all" || r.track === A.filter);
  const sel = list.find((r) => r.id === A.sel);
  const bar = '<div class="row between" style="margin-bottom:14px"><div class="seg" role="group" aria-label="区分で絞り込み">' +
    [["all", "すべて"], ["shinsotsu", "新卒"], ["chuto", "中途"]].map((x) => '<button data-act="filter" data-v="' + x[0] + '" aria-pressed="' + (A.filter === x[0]) + '">' + x[1] + "</button>").join("") + "</div>" +
    '<button class="btn" data-act="csv"' + (list.length ? "" : " disabled") + ">CSVで書き出す</button></div>";
  if (!list.length) {
    return bar + '<div class="card flat empty"><h3>まだ受検結果がありません</h3><p>候補者が検査を送信すると、ここに一覧が表示されます。まずは「受検画面を試す」で一度受けてみると、結果の見え方を確認できます。</p></div>';
  }
  const rows = list.map((r) => {
    const f = fitScore(r);
    return '<tr data-act="select" data-id="' + esc(r.id) + '" aria-selected="' + (r.id === A.sel) + '"><td class="num small">' + fmtDate(r.at) + "</td><td>" + esc(r.name || "（氏名なし）") + tagsFor(r) + "</td><td>" + esc((D.tracks[r.track] || {}).short || "") + '</td><td class="r stat">' + abilityTotal(r) + "/" + abilityMax(r) + '</td><td class="r stat ' + fitClass(f) + '">' + (f == null ? "-" : f) + "</td></tr>";
  }).join("");
  const table = '<div class="card tablewrap" style="padding:8px"><table><thead><tr><th>受検日時</th><th>氏名</th><th>区分</th><th class="r">能力</th><th class="r">近さ</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  return bar + '<div class="split"><div>' + table + "</div><div>" + (sel ? detailHtml(sel) : '<div class="card flat empty"><p>一覧から候補者を選ぶと、詳細が表示されます。</p></div>') + "</div></div>";
}

function targetTab() {
  const A = App.admin;
  if (!A.draftTarget) A.draftTarget = JSON.parse(JSON.stringify({ shinsotsu: targetFor("shinsotsu"), chuto: targetFor("chuto") }));
  const block = (track) => '<div class="card stack"><h2>' + D.tracks[track].label + "</h2>" + cultureDimsFor(track).map((d) => {
    const v = A.draftTarget[track][d.k];
    return '<div class="stack-sm"><div><label for="t-' + track + "-" + d.k + '"><b>' + d.name + '</b></label><div class="muted small">' + d.note + '</div></div><div class="slider-row"><input type="range" min="0" max="100" step="5" id="t-' + track + "-" + d.k + '" data-track="' + track + '" data-dim="' + d.k + '" value="' + v + '"><span class="stat" id="tv-' + track + "-" + d.k + '">' + v + "</span></div></div>";
  }).join("") + "</div>";
  return '<div class="stack"><p class="muted">自社が求める傾向を、0（弱い）から100（強い）で設定します。受検者の価値観との差が小さいほど、結果画面の「近さ」が高くなります。設定は保存後すぐに、過去の結果にも反映されます。</p>' +
    '<div class="split">' + block("shinsotsu") + block("chuto") + "</div>" +
    '<div class="row"><button class="btn primary" data-act="save-target">目標を保存</button><button class="btn" data-act="reset-target">初期値に戻す</button></div></div>';
}

function guideTab() {
  return '<div class="split"><div class="card stack"><h2>受検してもらう手順</h2>' +
    "<p>このページのリンクを候補者に共有します。候補者は氏名と受検IDを入力し、性格・価値観・能力の順に回答します。回答は送信と同時に、この画面の一覧に追加されます。</p>" +
    '<p>リンクの末尾に <span class="num">#shinsotsu</span>（新卒）または <span class="num">#chuto</span>（中途）を付けると、受検区分があらかじめ決まった状態で開きます。</p>' +
    '<div class="notice">回答を保存するには、候補者が共有メニューで「閲覧のみ」より上の権限（Contributor）でこのページを開ける必要があります。権限が閲覧のみだと、回答は送信できません。</div></div>' +
    '<div class="card stack"><h2>運用上の注意</h2>' +
    "<p>結果は、面接を補う参考情報です。入社後の成果との関連は、まだ検証されていません。</p>" +
    "<p>性格の設問は、パブリックドメインのIPIP（International Personality Item Pool）のビッグファイブ設問から20問を選び、日本語に訳したものです。翻訳の確認は済んでいません。価値観と能力の設問は自作です。</p>" +
    "<p>性別、年齢、出身などで不利にならないか、職務と関係のない設問がないかを、実施前に確認してください。性格の結果を、心身の状態の判断に使わないでください。</p>" +
    "<p>氏名や回答は個人情報です。利用目的の説明、閲覧できる人の限定、保管期間の設定が必要です。不要になった結果は、詳細画面から削除できます。</p></div></div>";
}

function renderAdmin() {
  const A = App.admin;
  const body = A.tab === "results" ? resultsTab() : A.tab === "target" ? targetTab() : guideTab();
  return '<div class="wrap wide">' + adminTopbar() + "<h1 style=\"margin-bottom:16px\">採用診断の管理</h1>" + tabsHtml() + body + "</div>";
}

/* CSV export */
function csvCell(v) {
  if (v == null) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
async function exportCsv() {
  const list = App.results.filter((r) => App.admin.filter === "all" || r.track === App.admin.filter);
  const head = ["受検日時", "氏名", "受検ID", "区分", "種別", "言語", "論理", "数的", "能力合計", "能力満点", "所要秒", "時間切れ"]
    .concat(D.personalityDims.map((d) => d.name), ALL_CULTURE.map((d) => d.name), ["目標との近さ"]);
  const rows = list.map((r) => {
    const ab = r.ab || { s: [], n: [], secs: 0 };
    return [fmtDate(r.at), r.name, r.ident, (D.tracks[r.track] || {}).short, r.sample ? "サンプル" : r.preview ? "テスト" : "本番", ab.s[0], ab.s[1], ab.s[2], abilityTotal(r), abilityMax(r), ab.secs, ab.timedOut ? "はい" : ""]
      .concat(D.personalityDims.map((d) => (r.p || {})[d.k]), ALL_CULTURE.map((d) => (r.c || {})[d.k]), [fitScore(r)]);
  });
  const text = "﻿" + [head].concat(rows).map((row) => row.map(csvCell).join(",")).join("\r\n");
  if (!App.caps.downloads) { toast("この環境ではファイルを保存できません"); return; }
  try {
    await App.caps.downloads.save({ filename: "適性診断_結果_" + new Date().toISOString().slice(0, 10) + ".csv", data: text });
    toast("CSVを書き出しました");
  } catch (e) { if (!e || e.code !== "declined") toast("書き出せませんでした"); }
}

async function saveTarget() {
  try {
    await App.caps.db.doc("config/target").set(JSON.parse(JSON.stringify(App.admin.draftTarget)));
    toast("目標プロフィールを保存しました");
  } catch (e) { toast("保存できませんでした。もう一度お試しください"); }
}

async function deleteResult(id) {
  try { await App.caps.db.doc("results/" + id).delete(); App.admin.confirmDel = null; if (App.admin.sel === id) App.admin.sel = null; toast("削除しました"); }
  catch (e) { toast("削除できませんでした"); }
  render();
}

function adminClick(act, el) {
  const A = App.admin;
  if (act === "tab") { A.tab = el.dataset.v; render(); return true; }
  if (act === "filter") { A.filter = el.dataset.v; render(); return true; }
  if (act === "select") { A.sel = el.dataset.id; A.confirmDel = null; render(); return true; }
  if (act === "close-detail") { A.sel = null; render(); return true; }
  if (act === "csv") { exportCsv(); return true; }
  if (act === "del") { A.confirmDel = el.dataset.id; render(); return true; }
  if (act === "del-no") { A.confirmDel = null; render(); return true; }
  if (act === "del-yes") { deleteResult(el.dataset.id); return true; }
  if (act === "save-target") { saveTarget(); return true; }
  if (act === "reset-target") { A.draftTarget = JSON.parse(JSON.stringify(D.defaultTarget)); render(); toast("初期値に戻しました。保存すると反映されます"); return true; }
  if (act === "preview") {
    const S = App.state; S.view = "intro"; S.track = App.hashTrack || S.track; render(); window.scrollTo(0, 0); return true;
  }
  return false;
}

function adminInput(e) {
  const t = e.target;
  if (t.type === "range" && t.dataset.dim) {
    const v = Number(t.value); App.admin.draftTarget[t.dataset.track][t.dataset.dim] = v;
    const o = $("#tv-" + t.dataset.track + "-" + t.dataset.dim); if (o) o.textContent = v;
  }
}
