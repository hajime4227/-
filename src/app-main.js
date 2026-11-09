/* Main: rendering switch, events, admin subscriptions, startup. */
App.hashTrack = ["shinsotsu", "chuto"].indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : null;

function render() {
  const v = App.state.view;
  let html;
  if (v === "loading") html = '<div class="wrap"><div class="card empty"><p>読み込んでいます</p></div></div>';
  else if (v === "admin") html = renderAdmin();
  else if (v === "intro") html = renderIntro();
  else if (v === "test") html = renderTest();
  else if (v === "sending") html = renderSending();
  else if (v === "error") html = renderError();
  else html = renderDone();
  $("#app").innerHTML = html;
}

function subscribeAdmin() {
  const db = App.caps.db;
  if (!db) { App.results = []; return; }
  db.collection("results").orderBy("at", "desc").limit(500).onSnapshot(
    (snap) => { App.results = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())); if (App.state.view === "admin") render(); },
    () => { App.results = []; if (App.state.view === "admin") render(); }
  );
  db.doc("config/target").onSnapshot(
    (s) => {
      if (s.exists) App.target = s.data();
      if (App.admin.tab !== "target") App.admin.draftTarget = null;
      if (App.state.view === "admin") render();
    },
    () => {}
  );
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const act = el.dataset.act;
  if (candidateClick(act, el)) return;
  adminClick(act, el);
});
document.addEventListener("input", (e) => { candidateInput(e); adminInput(e); });
document.addEventListener("change", (e) => { if (e.target.type === "radio") candidateInput(e); });

(async function start() {
  render();
  await initCaps();
  const S = App.state;
  S.track = App.hashTrack;
  if (App.isAdmin) {
    S.view = "admin"; App.results = null; subscribeAdmin();
  } else {
    S.view = "intro";
    if (App.caps.db && App.uid) {
      try {
        const s = await App.caps.db.doc("results/" + App.uid).get();
        if (s.exists) { S.view = "done"; S.already = true; }
      } catch (e) { /* the intro still works; submit reports any problem */ }
    }
  }
  render();
})();
