/* HDH project page — theme, video reel, real-robot comparison, charts */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const SPEED = 2, V = "static/videos/real/";

  /* ---------------- data (paper, Tables I–III) ---------------- */
  const SIM = [
    { n: "Baseline", avg: 78.8, p50: 681, p95: 760, k: "base" },
    { n: "Random", avg: 77.5, p50: 692, p95: 776, k: "base" },
    { n: "GPT-5", avg: 78.3, p50: 27674, p95: 46911, k: "vlm" },
    { n: "GPT-6", avg: 80.7, p50: 7403, p95: 10270, k: "vlm" },
    { n: "HDM", avg: 80.3, p50: 716, p95: 799, k: "ours" },
    { n: "HDH", avg: 82.3, p50: 718, p95: 796, k: "ours" },
  ];
  const REAL = [
    { key: "plate", name: "Plushie onto plate", sub: "pick and place", hdh: 94, base: 64,
      desc: "Pick up the strawberry plushie and place it on the blue plate. When the plushie starts farther from the gripper, the baseline sometimes closes the gripper before reaching it; HDH keeps approaching before closing.",
      hdhEps: [["success 1", "hdh_plate_success_1", 1], ["success 2", "hdh_plate_success_2", 1], ["failure", "hdh_plate_fail", 0]],
      baseEps: [["failure", "base_plate_fail", 0], ["success", "base_plate_success", 1]] },
    { key: "drawer", name: "Cube out of drawer", sub: "then close the drawer", hdh: 52, base: 38,
      desc: "Take the cube out of the open drawer, then push the drawer closed. Success requires both stages.",
      hdhEps: [["success 1", "hdh_drawer_success_1", 1], ["success 2", "hdh_drawer_success_2", 1], ["failure", "hdh_drawer_fail", 0]],
      baseEps: [["failure", "base_drawer_fail", 0], ["success", "base_drawer_success", 1]] },
    { key: "closet", name: "Strawberry into closet", sub: "then close the door", hdh: 56, base: 32,
      desc: "Place the strawberry inside the closet, then close its door. Success requires both stages.",
      hdhEps: [["success 1", "hdh_closet_success_1", 1], ["success 2", "hdh_closet_success_2", 1], ["failure 1", "hdh_closet_fail_1", 0], ["failure 2", "hdh_closet_fail_2", 0]],
      baseEps: [["failure", "base_closet_fail", 0], ["success", "base_closet_success", 1]] },
  ];

  /* ---------------- theme ---------------- */
  const themeBtn = $("#themeBtn");
  if (themeBtn) themeBtn.addEventListener("click", () => {
    const t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("hdh-theme", t); } catch {}
  });

  /* ---------------- reveal + count-up ---------------- */
  const rio = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(el => rio.observe(el));
  const fmt = (v, d) => d ? v.toFixed(d) : Math.round(v).toString();
  const cio = new IntersectionObserver((es) => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseFloat(el.dataset.count), d = +(el.dataset.dec || 0); cio.unobserve(el);
      if (reduced) { el.textContent = fmt(to, d); return; }
      const t0 = performance.now(), dur = 1100;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e2, d); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  $$("[data-count]").forEach(el => cio.observe(el));

  const mmss = (sec) => { sec = Math.max(0, Math.floor(sec)); return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); };

  /* ---------------- header reel ---------------- */
  const reel = $("#reelVideo");
  if (reel) {
    const list = JSON.parse($("#reelPlaylist").textContent), listEl = $("#reelList");
    const name = $("#reelName"), rt = $("#reelRt"), bar = $("#reelBar");
    let i = 0;
    list.forEach((c, k) => {
      const b = document.createElement("button"); b.className = "clip";
      b.innerHTML = `<img src="${V}${c.file}.jpg" alt="" loading="lazy"><span class="n">${c.name}<span class="rt">rollout ${Math.floor(k / 3) + 1}</span></span>`;
      b.addEventListener("click", () => play(k)); listEl.appendChild(b);
    });
    function play(k) {
      i = k % list.length; const c = list[i];
      reel.src = `${V}${c.file}.mp4`; reel.poster = `${V}${c.file}.jpg`; reel.play().catch(() => {});
      name.textContent = c.name;
      $$(".clip", listEl).forEach((b, j) => b.classList.toggle("active", j === i));
    }
    reel.addEventListener("ended", () => play(i + 1));
    reel.addEventListener("error", () => play(i + 1));
    reel.addEventListener("timeupdate", () => { rt.textContent = mmss(reel.currentTime * SPEED); if (reel.duration) bar.style.width = (reel.currentTime / reel.duration * 100).toFixed(2) + "%"; });
    play(0);
  }

  /* ---------------- real robot: task cards + paired videos ---------------- */
  const pick = $("#taskPick"), panesEl = $("#realPanes");
  const vbox = (ours, eps) => `
    <div class="vbox${ours ? " ours" : ""}">
      <div class="vhead"><span class="who">${ours ? "HDH (ours)" : "Baseline"}<small>${ours ? "K = 2 · verifier" : "K = 1"}</small></span><span class="res"></span></div>
      <div class="vmedia"><video muted playsinline preload="none"></video><span class="clock"><span class="t">00:00</span> <small>real time · ${SPEED}×</small></span><div class="prog"><i></i></div></div>
      <div class="eps">${eps.map(([lab, file, ok], k) => `<button class="${ok ? "ok" : "bad"}${k ? "" : " active"}" data-file="${file}" data-ok="${ok}">${lab}</button>`).join("")}</div>
    </div>`;
  if (pick && panesEl) {
    pick.innerHTML = REAL.map((t, i) => `
      <button class="task${i ? "" : " active"}" data-task="${t.key}">
        <div class="tn">${t.name}</div><div class="ts">${t.sub}</div><span class="delta">+${t.hdh - t.base} pts</span>
        <div class="cmp">
          <span class="k ours">HDH</span><span class="tr ours"><i data-w="${t.hdh}"></i></span><span class="p ours">${t.hdh}%</span>
          <span class="k">Baseline</span><span class="tr"><i data-w="${t.base}"></i></span><span class="p">${t.base}%</span>
        </div>
      </button>`).join("");
    panesEl.innerHTML = REAL.map((t, i) => `
      <div data-pane="${t.key}"${i ? " hidden" : ""}>
        <div class="duo">${vbox(true, t.hdhEps)}${vbox(false, t.baseEps)}</div>
        <p class="tdesc"><b>${t.name}.</b> ${t.desc}</p>
      </div>`).join("");
    const pio = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { $$(".tr i", pick).forEach(x => x.style.width = x.dataset.w + "%"); pio.disconnect(); } }), { threshold: 0.3 });
    pio.observe(pick);

    $$(".vbox", panesEl).forEach(box => {
      const v = $("video", box), media = $(".vmedia", box), t = $(".clock .t", box), bar = $(".prog i", box), pr = $(".prog", box), res = $(".res", box);
      const load = (btn, autoplay) => {
        $$(".eps button", box).forEach(b => b.classList.toggle("active", b === btn));
        const ok = btn.dataset.ok === "1";
        res.textContent = ok ? "success" : "failure"; res.className = "res " + (ok ? "ok" : "bad");
        v.dataset.src = V + btn.dataset.file + ".mp4"; v.poster = V + btn.dataset.file + ".jpg";
        bar.style.width = "0"; t.textContent = "00:00";
        if (autoplay) { v.src = v.dataset.src; v.load(); v.play().catch(() => {}); } else v.removeAttribute("src");
      };
      $$(".eps button", box).forEach(b => b.addEventListener("click", () => load(b, true)));
      load($(".eps button", box), false);
      v.loop = true;
      v.addEventListener("timeupdate", () => { if (!v.duration) return; t.textContent = mmss(v.currentTime * SPEED); bar.style.width = (v.currentTime / v.duration * 100).toFixed(2) + "%"; });
      v.addEventListener("play", () => media.classList.remove("paused"));
      v.addEventListener("pause", () => { if (v._auto) { v._auto = false; return; } media.classList.add("paused"); });
      v.addEventListener("click", () => { v.paused ? v.play().catch(() => {}) : v.pause(); });
      pr.addEventListener("click", (e) => { if (!v.duration) return; const r = pr.getBoundingClientRect(); v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * v.duration; v.play().catch(() => {}); });
    });

    $$(".task", pick).forEach(card => card.addEventListener("click", () => {
      $$(".task", pick).forEach(x => x.classList.toggle("active", x === card));
      $$("[data-pane]", panesEl).forEach(p => {
        const on = p.dataset.pane === card.dataset.task; p.hidden = !on;
        $$("video", p).forEach(v => { if (on) { if (!v.getAttribute("src")) { v.src = v.dataset.src; v.load(); } v.currentTime = 0; v.play().catch(() => {}); } else if (!v.paused) { v._auto = true; v.pause(); } });
      });
    }));
  }

  /* ---------------- lazy videos (play only while visible) ---------------- */
  const vio = new IntersectionObserver((es) => {
    es.forEach(e => {
      const v = e.target, pane = v.closest("[data-pane]");
      if (pane && pane.hidden) return;
      if (e.isIntersecting) { if (!v.getAttribute("src") && v.dataset.src) { v.src = v.dataset.src; v.load(); } v.play().catch(() => {}); }
      else if (v.getAttribute("src") && !v.paused) { v._auto = true; v.pause(); }
    });
  }, { rootMargin: "240px 0px" });
  $$("video[data-src]").forEach(v => vio.observe(v));

  /* ---------------- tooltip ---------------- */
  const tip = document.createElement("div"); tip.className = "tip"; document.body.appendChild(tip);
  const showTip = (html, x, y) => { tip.innerHTML = html; tip.classList.add("show"); const w = tip.offsetWidth, h = tip.offsetHeight; let L = x + 14, T = y - h - 10; if (L + w > innerWidth - 8) L = x - w - 14; if (T < 8) T = y + 16; tip.style.left = L + "px"; tip.style.top = T + "px"; };
  const hideTip = () => tip.classList.remove("show");

  /* ---------------- accuracy vs latency ---------------- */
  const svg = $("#tradeoff");
  function drawTradeoff() {
    if (!svg) return;
    const narrow = (svg.parentElement.getBoundingClientRect().width || 600) < 460;
    const W = narrow ? 380 : 600, H = narrow ? 300 : 330, m = { l: 44, r: 18, t: 18, b: 44 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const lx0 = Math.log10(400), lx1 = Math.log10(60000), y0 = 76, y1 = 83.5;
    const X = ms => m.l + (Math.log10(ms) - lx0) / (lx1 - lx0) * iw, Y = p => m.t + (1 - (p - y0) / (y1 - y0)) * ih;
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, a = {}) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); svg.appendChild(n); return n; };
    svg.innerHTML = ""; svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    for (let p = 77; p <= 83; p += 2) { el("line", { x1: m.l, x2: m.l + iw, y1: Y(p), y2: Y(p), class: "grid" }); el("text", { x: m.l - 8, y: Y(p) + 4, "text-anchor": "end" }).textContent = p; }
    [500, 1000, 3000, 10000, 30000].forEach(ms => { el("line", { x1: X(ms), x2: X(ms), y1: m.t, y2: m.t + ih, class: "grid" }); el("text", { x: X(ms), y: H - m.b + 18, "text-anchor": "middle" }).textContent = ms >= 1000 ? ms / 1000 + "s" : ms + "ms"; });
    el("line", { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: "axis" });
    el("text", { x: m.l + iw / 2, y: H - 6, "text-anchor": "middle", class: "lab" }).textContent = "median time per query →";
    el("text", { x: 12, y: m.t + ih / 2, "text-anchor": "middle", class: "lab", transform: `rotate(-90 12 ${m.t + ih / 2})` }).textContent = "avg success (%)";
    el("line", { x1: m.l, x2: m.l + iw, y1: Y(78.8), y2: Y(78.8), class: "base" });
    const ours = SIM[5];
    el("circle", { cx: X(ours.p50), cy: Y(ours.avg), r: 18, class: "halo" });
    const place = { Baseline: [10, 16, "start"], Random: [10, 14, "start"], "GPT-5": [0, 20, "middle"], "GPT-6": [0, -14, "middle"], HDM: [10, 16, "start"], HDH: [12, -10, "start"] };
    SIM.forEach(s => {
      const c = el("circle", { cx: X(s.p50), cy: Y(s.avg), r: s.n === "HDH" ? 7.5 : 6, class: "pt " + s.k });
      const [dx, dy, anchor] = place[s.n];
      el("text", { x: X(s.p50) + dx, y: Y(s.avg) + dy, "text-anchor": anchor, class: "lab" + (s.n === "HDH" ? " ours" : "") }).textContent = s.n === "HDH" ? "HDH (ours)" : s.n;
      const over = (s.p50 / 681 - 1) * 100;
      c.addEventListener("mousemove", ev => showTip(`<div class="k">${s.n.toUpperCase()}</div><div class="v">${s.avg.toFixed(1)}% avg success</div><div class="k">p50 ${s.p50.toLocaleString()} ms · p95 ${s.p95.toLocaleString()} ms${s.n === "Baseline" ? "" : ` · ${over >= 0 ? "+" : ""}${over.toFixed(1)}%`}</div>`, ev.clientX, ev.clientY));
      c.addEventListener("mouseleave", hideTip);
    });
  }
  if (svg) {
    drawTradeoff();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(drawTradeoff, 150); });
  }

  /* ---------------- average-success bars ---------------- */
  const bars = $("#bars");
  if (bars) {
    const lo = 70, hi = 85;
    bars.innerHTML = SIM.map(s => `<div class="brow ${s.k}${s.n === "HDH" ? " best" : ""}"><span class="n">${s.n === "HDH" ? "HDH (ours)" : s.n}</span><span class="track"><i data-w="${((s.avg - lo) / (hi - lo) * 100).toFixed(1)}"></i></span><span class="v">${s.avg.toFixed(1)}</span></div>`).join("");
    const bio = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { $$("i", bars).forEach(i => i.style.width = i.dataset.w + "%"); bio.disconnect(); } }), { threshold: 0.3 });
    bio.observe(bars);
  }

  /* ---------------- nav: active link, hamburger ---------------- */
  const navLinks = $$(".nav-links a[href^='#']"), secs = navLinks.map(a => $(a.getAttribute("href"))).filter(Boolean);
  if (secs.length) {
    const nio = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id)); }), { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    secs.forEach(s => nio.observe(s));
  }
  const navToggle = $("#navToggle"), navList = $("#navLinks");
  if (navToggle && navList) {
    navToggle.addEventListener("click", () => { const open = navList.classList.toggle("is-open"); navToggle.setAttribute("aria-expanded", open ? "true" : "false"); });
    $$("a", navList).forEach(a => a.addEventListener("click", () => { navList.classList.remove("is-open"); navToggle.setAttribute("aria-expanded", "false"); }));
  }

  /* ---------------- lightbox ---------------- */
  const figs = $$(".figure img");
  if (figs.length) {
    const lb = document.createElement("div"); lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML = '<img alt="">'; document.body.appendChild(lb);
    const lbImg = $("img", lb);
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    figs.forEach(img => img.closest(".figure").addEventListener("click", () => { lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt; lb.classList.add("open"); document.body.style.overflow = "hidden"; }));
    lb.addEventListener("click", close);
    addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("open")) close(); });
  }

  /* ---------------- bibtex copy ---------------- */
  const copyBtn = $("#copyBib");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#bibText").textContent.trim()); copyBtn.textContent = "Copied ✓"; } catch { copyBtn.textContent = "Select & copy"; }
    setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
  });
})();
