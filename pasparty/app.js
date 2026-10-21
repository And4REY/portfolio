// Паспарту: рамка-конструктор, каталог, примерка на стене, корзина и оформление (демо, без оплаты).
(() => {
  document.documentElement.classList.add("js");
  const { WORKS, GROUPS, SIZES, FRAMES } = window;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const byId = (id) => WORKS.find((w) => w.id === id);
  const sizeOf = (id) => SIZES.find((s) => s.id === id) || SIZES[1];
  const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим: корзина живёт в памяти */ } },
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── рамка и цена ─────────────────────────────────────
  // Все размеры в сантиметрах: изображение, поле паспарту, ширина багета.
  function dims(work, o) {
    const L = sizeOf(o.size).cm;
    const land = work.w >= work.h;
    const iw = land ? L : (L * work.w) / work.h;
    const ih = land ? (L * work.h) / work.w : L;
    const m = o.mat ? Math.max(5, Math.round(L * 0.14)) : 0;
    const f = o.frame === "none" ? 0 : L >= 70 ? 3.5 : 2.5;
    return { iw, ih, m, f, W: iw + 2 * (m + f), H: ih + 2 * (m + f) };
  }
  function price(o) {
    const s = sizeOf(o.size);
    return s.print + (o.mat ? s.mat : 0) + Math.round((s.frame * FRAMES[o.frame].k) / 100) * 100;
  }
  function framed(work, o, imgSize = "") {
    const d = dims(work, o);
    const pct = (a, b) => ((a / b) * 100).toFixed(3) + "%";
    const matIn = `top:${pct(d.f, d.H)};bottom:${pct(d.f, d.H)};left:${pct(d.f, d.W)};right:${pct(d.f, d.W)}`;
    const artIn = `top:${pct(d.f + d.m, d.H)};bottom:${pct(d.f + d.m, d.H)};left:${pct(d.f + d.m, d.W)};right:${pct(d.f + d.m, d.W)}`;
    return `<div class="framed" data-frame="${o.frame}" data-mat="${o.mat ? 1 : 0}" style="aspect-ratio:${d.W.toFixed(2)} / ${d.H.toFixed(2)}">
      <div class="framed__mat" style="${matIn}"></div>
      <div class="framed__art" style="${artIn}"><img src="img/${work.id}${imgSize}.jpg" alt="${esc(work.title)}, ${esc(work.artist)}" width="${work.w}" height="${work.h}" loading="lazy"></div>
    </div>`;
  }
  function optsText(o) {
    return `${sizeOf(o.size).cm} см, ${o.mat ? "с паспарту" : "без паспарту"}, ${FRAMES[o.frame].name.toLowerCase()}`;
  }
  function dimsText(work, o) {
    const d = dims(work, o);
    return `В раме ${Math.round(d.W)} × ${Math.round(d.H)} см`;
  }

  // Стена на фото: стол шириной ~150 см, значит вся стена ~197 × 131 см.
  const WALL_W = 197, WALL_H = 131;
  function hang(el, work, o) {
    const d = dims(work, o);
    el.style.width = ((d.W / WALL_W) * 100).toFixed(2) + "%";
    el.style.top = ((Math.max(41, d.H / 2 + 4) / WALL_H) * 100).toFixed(2) + "%";
    el.innerHTML = framed(work, o);
  }

  // ── корзина ──────────────────────────────────────────
  let cart = store.get("pp-cart", []).filter((i) => byId(i.id) && SIZES.some((s) => s.id === i.size) && FRAMES[i.frame]);
  const keyOf = (i) => `${i.id}|${i.size}|${i.mat ? 1 : 0}|${i.frame}`;
  const save = () => { store.set("pp-cart", cart); renderCart(); };

  function addToCart(item) {
    const found = cart.find((i) => keyOf(i) === keyOf(item));
    if (found) found.qty += 1; else cart.push({ ...item, qty: 1 });
    save();
    toast(`«${byId(item.id).title}» в корзине.`, "Открыть", openCart);
  }

  const drawer = $("#cart"), scrim = $("#scrim");
  let lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    step("items");
    drawer.hidden = false; scrim.hidden = false;
    void drawer.offsetWidth; // зафиксировать стартовое положение, чтобы шторка выехала плавно
    drawer.classList.add("is-open"); scrim.classList.add("is-open");
    document.body.classList.add("is-locked");
    $("#cart-x").focus();
  }
  function closeCart() {
    drawer.classList.remove("is-open"); scrim.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, reduced ? 0 : 300);
    if (lastFocus) lastFocus.focus();
  }
  function step(name) { $$("[data-step]", drawer).forEach((s) => { s.hidden = s.dataset.step !== name; }); }

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    $$("[data-cart-count]").forEach((el) => { el.textContent = count; });
    const total = cart.reduce((s, i) => s + price(i) * i.qty, 0);
    $("#cart-total").textContent = rub(total);
    $("#to-checkout").disabled = !count;
    $("#cart-lines").innerHTML = count ? cart.map((i, idx) => {
      const w = byId(i.id);
      return `<li class="line">
        <a href="product.html?id=${w.id}" tabindex="-1"><img src="img/${w.id}-sm.jpg" alt=""></a>
        <div>
          <a class="line__name" href="product.html?id=${w.id}">${esc(w.title)}</a>
          <p class="line__opts">${esc(optsText(i))}</p>
          <div class="line__qty"><button type="button" data-dec="${idx}" aria-label="Меньше">−</button><output>${i.qty}</output><button type="button" data-inc="${idx}" aria-label="Больше">+</button></div>
          <button class="line__rm" type="button" data-rm="${idx}">Убрать</button>
        </div>
        <span class="line__sum">${rub(price(i) * i.qty)}</span>
      </li>`;
    }).join("") : `<li class="drawer__empty">Пока пусто. Выберите работу в каталоге, размер и раму.</li>`;
  }

  // Удаление без вопросов, но с отменой.
  function removeAt(idx) {
    const [gone] = cart.splice(idx, 1);
    save();
    toast(`Убрали «${byId(gone.id).title}».`, "Вернуть", () => { cart.splice(idx, 0, gone); save(); });
  }

  let toastTimer;
  function toast(text, label, action) {
    const t = $("#toast");
    t.innerHTML = `<span>${esc(text)}</span>${label ? `<button type="button">${esc(label)}</button>` : ""}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    if (label) $("button", t).addEventListener("click", () => { t.hidden = true; action(); });
    toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
  }

  function wireCart() {
    $$("[data-open-cart]").forEach((b) => b.addEventListener("click", openCart));
    $("#cart-x").addEventListener("click", closeCart);
    scrim.addEventListener("click", closeCart);
    document.addEventListener("keydown", (e) => {
      if (drawer.hidden) return;
      if (e.key === "Escape") closeCart();
      if (e.key === "Tab") {
        const f = $$("a[href], button:not([disabled]), input, select", drawer).filter((el) => el.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $("#cart-lines").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.inc) { cart[+b.dataset.inc].qty += 1; save(); }
      if (b.dataset.dec) { const i = cart[+b.dataset.dec]; if (i.qty > 1) { i.qty -= 1; save(); } else removeAt(+b.dataset.dec); }
      if (b.dataset.rm) removeAt(+b.dataset.rm);
    });
    $("#to-checkout").addEventListener("click", () => { step("checkout"); $("#co-name").focus(); });
    $("#co-back").addEventListener("click", () => step("items"));

    const phone = $("#co-phone");
    phone.addEventListener("input", () => {
      const d = phone.value.replace(/\D/g, "").replace(/^[78]/, "").slice(0, 10);
      let r = "+7";
      if (d.length) r += " (" + d.slice(0, 3);
      if (d.length >= 3) r += ") " + d.slice(3, 6);
      if (d.length >= 6) r += "-" + d.slice(6, 8);
      if (d.length >= 8) r += "-" + d.slice(8, 10);
      phone.value = r;
    });
    $("#checkout").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#co-name"), city = $("#co-city");
      const bad = [[name, name.value.trim().length < 2, "Как к вам обращаться?"],
        [phone, phone.value.replace(/\D/g, "").length !== 11, "Проверьте телефон: 10 цифр после +7."],
        [city, city.value.trim().length < 2, "Укажите город доставки."]];
      bad.forEach(([el, isBad]) => el.toggleAttribute("aria-invalid", isBad));
      const first = bad.find((b) => b[1]);
      if (first) { $("#co-err").textContent = first[2]; first[0].focus(); return; }
      $("#co-err").textContent = "";
      const btn = $("button[type=submit]", e.target);
      btn.disabled = true; btn.textContent = "Оформляем…";
      setTimeout(() => {
        const total = $("#cart-total").textContent;
        $("#done-text").textContent = `Заказ П-${String(Date.now()).slice(-5)} на ${total}. Это демо-магазин: оплата не списывается, и заказ никуда не отправлен.`;
        cart = []; save(); e.target.reset();
        btn.disabled = false; btn.textContent = "Оформить заказ";
        step("done"); $("#done-x").focus();
      }, 700);
    });
    $("#done-x").addEventListener("click", closeCart);
    renderCart();
  }

  // ── главная ──────────────────────────────────────────
  function initHome() {
    // медленная смена работ в рамке первого экрана
    const imgs = $$(".hero__object img");
    let cur = 0, timer = null;
    const next = () => { imgs[cur].classList.remove("is-on"); cur = (cur + 1) % imgs.length; imgs[cur].classList.add("is-on"); };
    const play = () => { if (!reduced && !timer) timer = setInterval(next, 5500); };
    const stop = () => { clearInterval(timer); timer = null; };
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
    play();

    // главы: рамка с работой на собственном фоне
    $$(".chapter").forEach((c) => {
      const w = byId(c.dataset.work);
      c.style.setProperty("--tone", w.tone);
      const d = dims(w, { size: "m", mat: true, frame: "oak" });
      c.style.setProperty("--fw", `min(${(d.W / d.H) * 68}svh, 640px)`);
      $(".chapter__frame", c).innerHTML = framed(w, { size: "m", mat: true, frame: "oak" });
    });

    // каталог
    const tiles = $("#tiles");
    tiles.innerHTML = WORKS.map((w, i) => `<a class="tile${i === 1 ? " tile--wide" : ""}" href="product.html?id=${w.id}" data-group="${w.group}">
        <span class="tile__ground"><img src="img/${w.id}-sm.jpg" alt="${esc(w.title)}" width="${w.w}" height="${w.h}" loading="lazy"></span>
        <span class="tile__name">${esc(w.title)}</span>
        <span class="tile__meta">${esc(w.artist)}, ${esc(w.year)} · от ${rub(SIZES[0].print)}</span>
      </a>`).join("");
    const applyFilter = (g) => {
      $$(".tile", tiles).forEach((t) => { t.hidden = g !== "all" && t.dataset.group !== g; t.classList.add("is-in"); });
      $$('input[name="g"]').forEach((r) => { r.checked = r.value === g; });
      $("#shown").textContent = g === "all" ? `${WORKS.length} работ` : `${$$(".tile:not([hidden])", tiles).length} из ${WORKS.length}`;
    };
    $$('input[name="g"]').forEach((r) => r.addEventListener("change", () => {
      const url = new URL(location.href);
      if (r.value === "all") url.searchParams.delete("g"); else url.searchParams.set("g", r.value);
      history.replaceState(null, "", url);
      applyFilter(r.value);
    }));
    const g0 = new URLSearchParams(location.search).get("g");
    applyFilter(GROUPS[g0] ? g0 : "all");

    // примерка на стене
    const fit = { id: "great-wave", size: "m", mat: true, frame: "oak" };
    const hangEl = $("#hang");
    const thumbs = $("#thumbs");
    thumbs.innerHTML = WORKS.map((w) => `<button type="button" data-id="${w.id}" aria-pressed="${w.id === fit.id}" aria-label="${esc(w.title)}"><img src="img/${w.id}-sm.jpg" alt=""></button>`).join("");
    function renderFit() {
      const w = byId(fit.id);
      hang(hangEl, w, fit);
      $("#fit-title").textContent = `${w.title}. ${w.artist}`;
      $("#fit-price").textContent = rub(price(fit));
      $("#fit-dims").textContent = dimsText(w, fit);
      $("#fit-more").href = `product.html?id=${w.id}`;
      $$("button", thumbs).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === fit.id)));
    }
    thumbs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { fit.id = b.dataset.id; renderFit(); } });
    $$("#fit-form input").forEach((inp) => inp.addEventListener("change", () => {
      fit.size = $('#fit-form input[name="size"]:checked').value;
      fit.mat = $('#fit-form input[name="mat"]:checked').value === "1";
      fit.frame = $('#fit-form input[name="frame"]:checked').value;
      renderFit();
    }));
    $("#fit-add").addEventListener("click", () => addToCart({ ...fit }));
    renderFit();
  }

  // ── страница работы ──────────────────────────────────
  function initProduct() {
    const w = byId(new URLSearchParams(location.search).get("id"));
    const root = $("#pd");
    if (!w) {
      document.title = "Работа не найдена — Паспарту";
      root.outerHTML = `<div class="missing"><h1>Такой работы нет в каталоге</h1><p><a class="textlink" href="./#catalog">Вернуться в каталог</a></p></div>`;
      $(".more").hidden = true;
      return;
    }
    document.title = `${w.title}, ${w.artist} — Паспарту`;
    const o = { id: w.id, size: "m", mat: true, frame: "oak" };
    $("#pd-stage").style.setProperty("--tone", w.tone);
    $("#pd-title").textContent = w.title;
    $("#pd-by").textContent = `${w.artist}, ${w.year}`;
    $("#pd-about").textContent = w.about;
    $("#pd-museum").innerHTML = `<a class="textlink" href="${w.page}">${esc(w.museum)}</a>`;
    $("#pd-crumb").textContent = GROUPS[w.group];
    $("#pd-crumb").href = `./?g=${w.group}#catalog`;
    let view = "solo";
    function render() {
      $("#pd-price").textContent = rub(price(o));
      $("#pd-dims").textContent = dimsText(w, o);
      $("#pd-img").textContent = `${Math.round(dims(w, o).iw)} × ${Math.round(dims(w, o).ih)} см`;
      if (view === "solo") {
        const d = dims(w, o);
        const solo = $("#pd-solo");
        // крупнее размер — крупнее рамка: от 55% до 100% ширины сцены
        solo.style.setProperty("--fw", `min(${55 + (sizeOf(o.size).cm - 30) * 0.64}%, ${(d.W / d.H) * 76}svh)`);
        solo.innerHTML = framed(w, o);
      } else {
        hang($("#pd-hang"), w, o);
      }
    }
    $$("#pd-form input").forEach((inp) => inp.addEventListener("change", () => {
      o.size = $('#pd-form input[name="size"]:checked').value;
      o.mat = $('#pd-form input[name="mat"]:checked').value === "1";
      o.frame = $('#pd-form input[name="frame"]:checked').value;
      render();
    }));
    $$(".pd__views button").forEach((b) => b.addEventListener("click", () => {
      view = b.dataset.view;
      $$(".pd__views button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#pd-stage").classList.toggle("is-wall", view === "wall");
      $("#pd-solo").hidden = view === "wall";
      $("#pd-wall").hidden = view !== "wall";
      render();
    }));
    $("#pd-add").addEventListener("click", () => addToCart({ ...o }));
    render();

    const same = WORKS.filter((x) => x.group === w.group && x.id !== w.id);
    const rest = WORKS.filter((x) => x.group !== w.group);
    $("#more").innerHTML = same.concat(rest).slice(0, 4).map((x) => `<a class="tile" href="product.html?id=${x.id}">
        <span class="tile__ground"><img src="img/${x.id}-sm.jpg" alt="${esc(x.title)}" loading="lazy"></span>
        <span class="tile__name">${esc(x.title)}</span>
        <span class="tile__meta">${esc(x.artist)} · от ${rub(SIZES[0].print)}</span></a>`).join("");
    $("#more-title").classList.add("reveal");
  }

  wireCart();
  if (document.body.dataset.page === "home") initHome();
  if (document.body.dataset.page === "product") initProduct();

  // ── появление ────────────────────────────────────────
  const targets = $$(".reveal, .chapter, .tile:not(.is-in)");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in"); io.unobserve(e.target);
    }), { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  } else targets.forEach((t) => t.classList.add("is-in"));
})();
