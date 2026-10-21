// Overprint Supply — catalogue, product page, bag and checkout (concept store, no real payments).
(() => {
  // ── data ───────────────────────────────────────────────
  // Each product's cover is two "plates" (yellow + cyan) printed over each other, like a riso print.
  const PRODUCTS = [
    { id: "drum-grain", name: "Drum Grain", cat: "textures", price: 18, added: "2026-09-12",
      count: "40 textures", formats: "PNG · 6000 px", size: "1.4 GB", works: "Photoshop, Affinity, Procreate, Figma",
      blurb: "Grain scanned from a real drum, sheet by sheet: forty textures from barely-there to full static. Drop one over any flat illustration and it stops looking flat.",
      inside: ["40 grain textures, transparent PNG", "8 pre-tinted versions in riso colours", "A one-page guide to blend modes"],
      y: '<rect x="8" y="14" width="56" height="96" fill="currentColor"/>',
      c: '<circle cx="62" cy="66" r="31" fill="url(#DOTS)"/><circle cx="62" cy="66" r="31" fill="none" stroke="currentColor" stroke-width="1.5"/>' },
    { id: "misregister", name: "Misregister", cat: "textures", price: 16, added: "2026-10-02",
      count: "24 overlays", formats: "PSD · PNG", size: "620 MB", works: "Photoshop, Affinity Photo",
      blurb: "The slipped-plate look of a two-colour print, as smart objects. Paste your artwork in, pick how far the plates drift, done.",
      inside: ["24 smart-object overlays", "Offset presets from 0.5 to 4 mm", "Paper backgrounds in five stocks"],
      y: '<circle cx="47" cy="59" r="27" fill="none" stroke="currentColor" stroke-width="15"/>',
      c: '<circle cx="55" cy="67" r="27" fill="none" stroke="currentColor" stroke-width="15"/>' },
    { id: "halftone-weather", name: "Halftone Weather", cat: "textures", price: 14, added: "2026-06-20",
      count: "32 gradients", formats: "SVG · PNG", size: "180 MB", works: "Illustrator, Figma, Affinity Designer",
      blurb: "Halftone skies, fog and horizons built as vector dots, so they scale to a billboard without a single blurry edge.",
      inside: ["32 halftone gradients, editable vectors", "Dot sizes from 0.4 to 3 mm", "Seamless tiles for backgrounds"],
      y: '<rect x="0" y="0" width="100" height="72" fill="url(#DOTS)"/>',
      c: '<path d="M0 125 L0 80 Q25 58 50 75 T100 66 L100 125Z" fill="currentColor"/>' },
    { id: "eight-page-zine", name: "Eight-Page Zine", cat: "templates", price: 12, added: "2026-08-04",
      count: "1 template, 3 sizes", formats: "InDesign · Affinity · Figma", size: "48 MB", works: "InDesign, Affinity Publisher, Figma",
      blurb: "The one-sheet zine: fold, cut once, fold again. Pages are already imposed, so what you design is what comes off the printer.",
      inside: ["A4, A3 and US Letter sheets", "Imposed and un-imposed versions", "Printable folding guide"],
      y: '<rect x="9" y="22" width="19" height="38" fill="currentColor"/><rect x="51" y="70" width="19" height="16" fill="currentColor"/><rect x="74" y="26" width="15" height="5" fill="currentColor"/><rect x="74" y="34" width="11" height="5" fill="currentColor"/>',
      c: '<g fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="22" width="19" height="38"/><rect x="30" y="22" width="19" height="38"/><rect x="51" y="22" width="19" height="38"/><rect x="72" y="22" width="19" height="38"/><rect x="9" y="66" width="19" height="38"/><rect x="30" y="66" width="19" height="38"/><rect x="51" y="66" width="19" height="38"/><rect x="72" y="66" width="19" height="38"/></g><circle cx="39" cy="41" r="6" fill="currentColor"/>' },
    { id: "gig-poster-kit", name: "Gig Poster Kit", cat: "templates", price: 24, added: "2026-10-10",
      count: "6 layouts", formats: "Figma · PSD", size: "210 MB", works: "Figma, Photoshop",
      blurb: "Six A3 poster layouts for shows and launches, built on a grid that survives a long band name. Two-colour by default, so they print cheap.",
      inside: ["6 A3 layouts with bleed", "Type styles for line-ups and dates", "Separated colour plates for printing"],
      y: '<rect x="18" y="12" width="64" height="100" fill="currentColor" transform="rotate(-4 50 62)"/>',
      c: '<circle cx="50" cy="46" r="20" fill="currentColor"/><rect x="24" y="78" width="52" height="7" fill="currentColor"/><rect x="24" y="90" width="34" height="7" fill="currentColor"/>' },
    { id: "two-colour-menu", name: "Two-Colour Menu", cat: "templates", price: 15, added: "2026-05-18",
      count: "4 layouts", formats: "InDesign · Figma", size: "36 MB", works: "InDesign, Figma, Canva (PDF import)",
      blurb: "Menus for small kitchens that change the specials every week. Prices line up on their own; the layout holds from eight dishes to thirty.",
      inside: ["4 menu layouts, A4 and A5", "Table-tent and window versions", "Allergen icon set"],
      y: '<ellipse cx="62" cy="88" rx="27" ry="21" fill="currentColor"/>',
      c: '<rect x="24" y="14" width="50" height="5" fill="currentColor"/><g fill="currentColor"><rect x="24" y="30" width="44" height="1.8"/><rect x="24" y="38" width="32" height="1.8"/><rect x="24" y="46" width="46" height="1.8"/><rect x="24" y="54" width="28" height="1.8"/><rect x="24" y="62" width="40" height="1.8"/><rect x="24" y="70" width="34" height="1.8"/></g>' },
    { id: "riso-cards", name: "Riso Business Cards", cat: "templates", price: 9, added: "2026-04-02",
      count: "10 designs", formats: "Figma · PDF", size: "22 MB", works: "Figma, any print shop",
      blurb: "Ten card designs that look printed rather than exported — made for two inks and uncoated stock.",
      inside: ["10 designs, front and back", "EU and US card sizes", "Print-ready PDF with crop marks"],
      y: '<rect x="12" y="30" width="58" height="36" fill="currentColor" transform="rotate(-8 41 48)"/>',
      c: '<g transform="rotate(6 57 76)"><rect x="28" y="58" width="58" height="36" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="36" y="68" width="24" height="3.5" fill="currentColor"/><rect x="36" y="76" width="16" height="2" fill="currentColor"/></g>' },
    { id: "ink-trap-icons", name: "Ink Trap Icons", cat: "icons", price: 22, added: "2026-09-28",
      count: "160 icons", formats: "SVG · Figma", size: "9 MB", works: "Figma, Illustrator, any website",
      blurb: "Icons with small notches cut into the corners, the way type designers keep ink from pooling. Crisp on screen, alive in print.",
      inside: ["160 icons in 2 weights", "24 px grid, outlined strokes", "Figma components with variants"],
      y: '<rect x="18" y="30" width="16" height="16" fill="currentColor"/><rect x="66" y="54" width="16" height="16" fill="currentColor"/><rect x="42" y="78" width="16" height="16" fill="currentColor"/>',
      c: '<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><circle cx="26" cy="38" r="6"/><rect x="44" y="32" width="12" height="12"/><path d="M68 44 L74 32 L80 44Z"/><path d="M26 56 V68 M20 62 H32"/><path d="M44 62 H56 M51 57 L56 62 L51 67"/><circle cx="74" cy="62" r="6"/><path d="M20 92 A6 6 0 0 1 32 92"/><path d="M45 81 L55 91 M55 81 L45 91"/><path d="M74 80 L80 86 L74 92 L68 86Z"/></g>' },
    { id: "hand-cut-arrows", name: "Hand-cut Arrows", cat: "icons", price: 8, added: "2026-07-07",
      count: "80 arrows", formats: "SVG · PNG", size: "14 MB", works: "Figma, Illustrator, Procreate",
      blurb: "Arrows cut from paper with scissors, scanned and traced. Slightly wrong in every direction, on purpose.",
      inside: ["80 arrows, vector and PNG", "Straight, curved and looping sets", "Matching underline strokes"],
      y: '<path d="M20 14 L66 14 L66 3 L92 25 L66 47 L66 36 L20 36Z" fill="currentColor" transform="rotate(-10 50 25) translate(-4 16)"/>',
      c: '<path d="M10 72 L60 72 L60 56 L90 80 L60 104 L60 88 L10 88Z" fill="currentColor"/>' },
    { id: "brayer-brushes", name: "Brayer Brushes", cat: "brushes", price: 19, added: "2026-08-22",
      count: "36 brushes", formats: "Procreate · ABR", size: "260 MB", works: "Procreate, Photoshop",
      blurb: "Brushes made from a rubber roller and leftover ink: streaky, uneven, and pressure-sensitive enough to build up like the real thing.",
      inside: ["36 brushes for Procreate and Photoshop", "Roller, sponge and dry-ink sets", "Two-minute install video"],
      y: '<path d="M-6 40 C 24 18, 56 70, 106 36" stroke="currentColor" stroke-width="22" fill="none" stroke-linecap="round"/>',
      c: '<path d="M-6 96 C 30 70, 62 112, 106 80" stroke="currentColor" stroke-width="15" fill="none"/><path d="M-6 96 C 30 70, 62 112, 106 80" stroke="currentColor" stroke-width="22" fill="none" stroke-dasharray="1.5 3" opacity=".7"/>' },
    { id: "stencil-set", name: "Stencil Set", cat: "brushes", price: 13, added: "2026-03-30",
      count: "52 stamps", formats: "Procreate · ABR · PNG", size: "120 MB", works: "Procreate, Photoshop",
      blurb: "Stencil letters and shapes as single-tap stamps, with sprayed edges you can push from tidy to messy.",
      inside: ["A–Z, 0–9 and 16 shapes", "Clean and over-sprayed versions", "Spacing guide for headlines"],
      y: '<circle cx="70" cy="34" r="20" fill="currentColor"/>',
      c: '<path d="M20 106 L43 22 L57 22 L80 106 L65 106 L60 86 L40 86 L35 106Z M44 72 L56 72 L50 46Z" fill="currentColor" fill-rule="evenodd"/>' },
    { id: "screen-bleed", name: "Screen Bleed", cat: "brushes", price: 11, added: "2026-10-14",
      count: "28 brushes", formats: "Procreate · ABR", size: "190 MB", works: "Procreate, Photoshop",
      blurb: "The soft, swollen edge of ink pushed through a screen. Fill a shape, run the edge brush once, and it looks pulled by hand.",
      inside: ["28 edge and fill brushes", "Three mesh counts", "Before/after example files"],
      y: '<path d="M10 16 H62 L67 30 L60 44 L68 58 L61 72 L67 86 L60 100 L64 112 H10Z" fill="currentColor"/>',
      c: '<rect x="40" y="36" width="50" height="66" fill="url(#DOTS)"/><rect x="40" y="36" width="50" height="66" fill="none" stroke="currentColor" stroke-width="2"/>' },
  ];
  const CATS = { textures: "Textures", templates: "Templates", icons: "Icons", brushes: "Brushes" };
  const LICENCES = {
    personal: { label: "Personal", mult: 1, note: "Your own projects and portfolio." },
    commercial: { label: "Commercial", mult: 2.5, note: "Client work and products you sell, unlimited prints." },
  };
  const priceOf = (p, lic) => Math.round(p.price * LICENCES[lic].mult);
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = (n) => `$${n.toFixed(0)}`;

  // ── storage (per-viewer convenience only; works without it) ──
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: bag lives in memory */ } },
  };

  // ── cover art ──────────────────────────────────────────
  let artSeq = 0;
  function art(p, extraClass = "") {
    const uid = `a${++artSeq}`;
    const plate = (kind, body) => {
      const pid = `${uid}${kind}`;
      return `<svg class="plate plate--${kind}" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs><pattern id="${pid}" width="4.5" height="4.5" patternUnits="userSpaceOnUse"><circle cx="2.25" cy="2.25" r="1.25" fill="currentColor"/></pattern></defs>
        ${body.replaceAll("url(#DOTS)", `url(#${pid})`)}</svg>`;
    };
    return `<div class="art ${extraClass}">${plate("y", p.y)}${plate("c", p.c)}</div>`;
  }

  // ── bag ────────────────────────────────────────────────
  let bag = store.get("op-bag", []).filter((i) => byId(i.id) && LICENCES[i.lic]);
  const inBag = (id) => bag.some((i) => i.id === id);
  const saveBag = () => { store.set("op-bag", bag); renderBag(); syncAddButtons(); };

  function addToBag(id, lic = "personal") {
    const existing = bag.find((i) => i.id === id);
    if (existing) existing.lic = lic;
    else bag.push({ id, lic });
    saveBag();
  }

  const drawer = $("#bag");
  const scrim = $("#scrim");
  let lastFocus = null;

  function openBag() {
    lastFocus = document.activeElement;
    showStep("items");
    drawer.hidden = false;
    scrim.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add("is-open"); scrim.classList.add("is-open"); });
    document.body.classList.add("is-locked");
    $("#bag-close").focus();
  }
  function closeBag() {
    drawer.classList.remove("is-open");
    scrim.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    const done = () => { drawer.hidden = true; scrim.hidden = true; };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) done();
    else setTimeout(done, 260);
    if (lastFocus) lastFocus.focus();
  }

  function renderBag() {
    const count = bag.length;
    $$("[data-bag-count]").forEach((el) => { el.textContent = count; });
    $$("[data-open-bag]").forEach((el) => el.setAttribute("aria-label", `Bag, ${count} ${count === 1 ? "item" : "items"}`));
    const list = $("#bag-items");
    if (!count) {
      list.innerHTML = `<li class="bag__empty">Your bag is empty. Everything here is a download — no shipping, no waiting.</li>`;
    } else {
      list.innerHTML = bag.map((i) => {
        const p = byId(i.id);
        return `<li class="bag__item">
          <a class="bag__thumb" href="product.html?id=${p.id}" tabindex="-1">${art(p, "art--mini")}</a>
          <div class="bag__info">
            <a class="bag__name" href="product.html?id=${p.id}">${esc(p.name)}</a>
            <span class="bag__lic">${LICENCES[i.lic].label} licence</span>
            <button class="bag__remove" type="button" data-remove="${p.id}">Remove</button>
          </div>
          <span class="bag__price">${usd(priceOf(p, i.lic))}</span>
        </li>`;
      }).join("");
    }
    const total = bag.reduce((s, i) => s + priceOf(byId(i.id), i.lic), 0);
    $("#bag-total").textContent = usd(total);
    $("#to-checkout").disabled = !count;
  }

  // Remove is instant and undoable — no confirmation dialog.
  let toastTimer = null;
  function removeFromBag(id) {
    const idx = bag.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const [removed] = bag.splice(idx, 1);
    saveBag();
    toast(`Removed ${byId(id).name}.`, "Undo", () => { bag.splice(idx, 0, removed); saveBag(); });
    $("#bag-close").focus();
  }

  function toast(text, actionLabel, action) {
    const el = $("#toast");
    el.innerHTML = `<span>${esc(text)}</span>${actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : ""}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    if (actionLabel) $("button", el).addEventListener("click", () => { action(); el.hidden = true; });
    toastTimer = setTimeout(() => { el.hidden = true; }, 6000);
  }

  function showStep(step) {
    $$("[data-step]", drawer).forEach((el) => { el.hidden = el.dataset.step !== step; });
  }

  function wireBag() {
    $$("[data-open-bag]").forEach((b) => b.addEventListener("click", openBag));
    $("#bag-close").addEventListener("click", closeBag);
    scrim.addEventListener("click", closeBag);
    document.addEventListener("keydown", (ev) => {
      if (drawer.hidden) return;
      if (ev.key === "Escape") closeBag();
      if (ev.key === "Tab") { // keep focus inside the open drawer
        const f = $$("a[href], button:not([disabled]), input", drawer).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
      }
    });
    $("#bag-items").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-remove]");
      if (btn) removeFromBag(btn.dataset.remove);
    });
    $("#to-checkout").addEventListener("click", () => { showStep("checkout"); $("#co-email").focus(); });
    $("#co-back").addEventListener("click", () => showStep("items"));

    const form = $("#checkout-form");
    const email = $("#co-email");
    const msg = $("#co-msg");
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
        email.setAttribute("aria-invalid", "true");
        msg.textContent = "Enter the email the files should go to, like name@studio.com.";
        email.focus();
        return;
      }
      const btn = $("button[type=submit]", form);
      btn.disabled = true;
      btn.textContent = "Placing order…";
      setTimeout(() => {
        const total = $("#bag-total").textContent;
        $("#done-text").textContent = `Order OS-${1040 + bag.length * 7} for ${total}. This is a concept store, so no payment was taken and nothing was sent to ${email.value.trim()}.`;
        bag = [];
        saveBag();
        form.reset();
        btn.disabled = false;
        btn.textContent = "Place order";
        showStep("done");
        $("#done-close").focus();
      }, 700);
    });
    email.addEventListener("input", () => { email.removeAttribute("aria-invalid"); msg.textContent = ""; });
    $("#done-close").addEventListener("click", closeBag);
  }

  // ── add buttons ────────────────────────────────────────
  function syncAddButtons() {
    $$("[data-add]").forEach((b) => {
      const has = inBag(b.dataset.add);
      b.classList.toggle("is-added", has);
      b.textContent = has ? "In bag" : "Add";
      b.setAttribute("aria-label", has ? `${byId(b.dataset.add).name} is in your bag — open bag` : `Add ${byId(b.dataset.add).name} to bag`);
    });
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-add]");
    if (!b) return;
    if (inBag(b.dataset.add)) openBag();
    else addToBag(b.dataset.add);
  });

  function card(p) {
    return `<article class="card">
      <a class="card__media" href="product.html?id=${p.id}" aria-label="${esc(p.name)}">${art(p)}</a>
      <div class="card__row">
        <h3 class="card__name"><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
        <span class="card__price">${usd(p.price)}</span>
      </div>
      <div class="card__row">
        <span class="card__meta">${esc(p.count)} · ${esc(p.formats)}</span>
        <button class="chip" type="button" data-add="${p.id}">Add</button>
      </div>
    </article>`;
  }

  // ── catalogue page ─────────────────────────────────────
  function initCatalogue() {
    const grid = $("#grid");
    const params = new URLSearchParams(location.search);
    let cat = CATS[params.get("cat")] ? params.get("cat") : "all";
    let sort = "featured";

    $("#total-count").textContent = PRODUCTS.length;

    function render() {
      let items = PRODUCTS.filter((p) => cat === "all" || p.cat === cat);
      if (sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
      if (sort === "price-desc") items = [...items].sort((a, b) => b.price - a.price);
      if (sort === "newest") items = [...items].sort((a, b) => b.added.localeCompare(a.added));
      grid.innerHTML = items.map(card).join("");
      $("#shown").textContent = cat === "all" ? `All ${items.length} files` : `${items.length} of ${PRODUCTS.length} files · ${CATS[cat]}`;
      $$("[data-cat]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === cat)));
      syncAddButtons();
    }

    $$("[data-cat]").forEach((b) => b.addEventListener("click", () => {
      cat = b.dataset.cat;
      const url = new URL(location.href);
      if (cat === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", cat);
      history.replaceState(null, "", url);
      render();
    }));
    $("#sort").addEventListener("change", (ev) => { sort = ev.target.value; render(); });
    render();
  }

  // ── product page ───────────────────────────────────────
  function initProduct() {
    const p = byId(new URLSearchParams(location.search).get("id"));
    const root = $("#product");
    if (!p) {
      document.title = "Not found — Overprint Supply";
      root.innerHTML = `<div class="missing"><h1>That file isn’t in the shop.</h1><p><a class="link" href="./">Back to all files</a></p></div>`;
      return;
    }
    document.title = `${p.name} — Overprint Supply`;
    const current = bag.find((i) => i.id === p.id);
    let lic = current ? current.lic : "personal";

    root.innerHTML = `
      <div class="pd__media">
        ${art(p, "art--large")}
        <div class="pd__details">${art(p, "art--zoom-a")}${art(p, "art--zoom-b")}</div>
      </div>
      <div class="pd__info">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Shop</a> <span aria-hidden="true">/</span> <a href="./?cat=${p.cat}">${CATS[p.cat]}</a></nav>
        <h1 class="pd__title">${esc(p.name)}</h1>
        <p class="pd__meta">${esc(p.count)} · ${esc(p.formats)}</p>
        <p class="pd__blurb">${esc(p.blurb)}</p>
        <fieldset class="lic">
          <legend>Licence</legend>
          ${Object.entries(LICENCES).map(([key, l]) => `
            <input type="radio" name="lic" id="lic-${key}" value="${key}" ${key === lic ? "checked" : ""}>
            <label for="lic-${key}"><span class="lic__name">${l.label}</span><span class="lic__price">${usd(priceOf(p, key))}</span><span class="lic__note">${l.note}</span></label>`).join("")}
        </fieldset>
        <div class="pd__buy">
          <button class="btn btn--ink" type="button" id="pd-add">Add to bag — <span id="pd-price">${usd(priceOf(p, lic))}</span></button>
          <p class="pd__status" id="pd-status" aria-live="polite"></p>
        </div>
        <dl class="pd__spec">
          <div><dt>Inside</dt><dd><ul>${p.inside.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></dd></div>
          <div><dt>Works with</dt><dd>${esc(p.works)}</dd></div>
          <div><dt>Download</dt><dd>${esc(p.size)}, zip</dd></div>
        </dl>
      </div>`;

    const status = $("#pd-status");
    const syncStatus = () => {
      const item = bag.find((i) => i.id === p.id);
      status.innerHTML = item ? `In your bag with a ${LICENCES[item.lic].label.toLowerCase()} licence. <button class="link" type="button" data-open-bag>View bag</button>` : "";
      $$("[data-open-bag]", status).forEach((b) => b.addEventListener("click", openBag));
    };
    $$('input[name="lic"]').forEach((r) => r.addEventListener("change", () => {
      lic = r.value;
      $("#pd-price").textContent = usd(priceOf(p, lic));
    }));
    $("#pd-add").addEventListener("click", () => { addToBag(p.id, lic); syncStatus(); });
    syncStatus();

    const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id)
      .concat(PRODUCTS.filter((x) => x.cat !== p.cat))
      .slice(0, 4);
    $("#related").innerHTML = related.map(card).join("");
    syncAddButtons();
  }

  // ── banner + retracting nav (N12) ──────────────────────
  function initNav() {
    const nav = $("#nav");
    const root = document.documentElement;
    if (store.get("op-banner-off", false)) {
      root.style.setProperty("--banner-h", "0px");
      nav.classList.add("is-dismissed");
    }
    $("#banner-x").addEventListener("click", () => {
      root.style.setProperty("--banner-h", "0px");
      nav.classList.add("is-dismissed");
      store.set("op-banner-off", true);
    });
    let lastY = window.scrollY;
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 48) nav.classList.remove("is-compact");
        else if (y > lastY + 4) nav.classList.add("is-compact");
        else if (y < lastY - 4) nav.classList.remove("is-compact");
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  initNav();
  wireBag();
  renderBag();
  if (document.body.dataset.page === "catalogue") initCatalogue();
  if (document.body.dataset.page === "product") initProduct();
  syncAddButtons();
})();
