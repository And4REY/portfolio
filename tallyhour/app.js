// Tallyhour demo: a working timer that turns tracked time into an invoice.
(() => {
  const CLIENTS = [
    { id: "moss", name: "Moss Ceramics", rate: 85 },
    { id: "halden", name: "Halden & Rowe", rate: 95 },
    { id: "port", name: "Port Ellis Radio", rate: 70 },
  ];
  const DEMO_SPEED = 60; // one real second = one tracked minute

  let entries = [
    { desc: "Product page redesign", client: "moss", minutes: 195 },
    { desc: "Annual report — layout", client: "halden", minutes: 250 },
    { desc: "Episode artwork, ep. 41", client: "port", minutes: 105 },
    { desc: "Glaze catalogue — photo edits", client: "moss", minutes: 150 },
    { desc: "Client call", client: "halden", minutes: 50 },
  ];
  let invoiceNo = 32;

  const $ = (sel) => document.querySelector(sel);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const moneyRound = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const clientById = (id) => CLIENTS.find((c) => c.id === id);
  const amountOf = (e) => (e.minutes / 60) * clientById(e.client).rate;
  const hm = (min) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── timer & entries ───────────────────────────────────
  const form = $("#timer-form");
  const desc = $("#t-desc");
  const select = $("#t-client");
  const clock = $("#t-clock");
  const toggle = $("#t-toggle");
  const list = $("#entries");
  const toInvoice = $("#to-invoice");

  select.innerHTML = CLIENTS.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  let startedAt = null;
  let tick = null;

  function renderEntries(newIndex = -1) {
    list.innerHTML = entries.map((e, i) => `
      <li class="entry${i === newIndex ? " is-new" : ""}">
        <span class="entry__desc">${escapeHtml(e.desc)}</span>
        <span class="entry__time tnum">${hm(e.minutes)}</span>
        <span class="entry__client">${escapeHtml(clientById(e.client).name)} · $${clientById(e.client).rate}/h</span>
        <span class="entry__amount tnum">${money.format(amountOf(e))}</span>
      </li>`).join("");
    const total = entries.reduce((s, e) => s + e.minutes, 0);
    $("#week-hours").textContent = hm(total);
    $("#week-amount").textContent = moneyRound.format(entries.reduce((s, e) => s + amountOf(e), 0));
  }

  function updateInvoiceButton() {
    toInvoice.textContent = `Invoice ${clientById(select.value).name} →`;
  }

  function demoSeconds() {
    return Math.floor(((performance.now() - startedAt) / 1000) * DEMO_SPEED);
  }

  function showClock(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    clock.textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (startedAt === null) {
      startedAt = performance.now();
      tick = setInterval(() => showClock(demoSeconds()), 250);
      form.classList.add("is-running");
      toggle.textContent = "Stop";
      toggle.setAttribute("aria-pressed", "true");
      return;
    }
    const minutes = Math.max(1, Math.round(demoSeconds() / 60));
    clearInterval(tick);
    startedAt = null;
    form.classList.remove("is-running");
    toggle.textContent = "Start";
    toggle.setAttribute("aria-pressed", "false");
    showClock(0);
    entries.unshift({ desc: desc.value.trim() || "Untitled work", client: select.value, minutes });
    renderEntries(0);
  });

  select.addEventListener("change", updateInvoiceButton);

  // ── tabs ──────────────────────────────────────────────
  const tabs = [$("#tab-timer"), $("#tab-invoice")];
  const panels = [$("#panel-timer"), $("#panel-invoice")];

  function selectTab(i, focus = false) {
    tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(i === j));
      t.tabIndex = i === j ? 0 : -1;
      panels[j].hidden = i !== j;
    });
    if (i === 1) renderInvoice();
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(i));
    t.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        selectTab((i + 1) % tabs.length, true);
      }
    });
  });
  toInvoice.addEventListener("click", () => selectTab(1, true));

  // ── invoice ───────────────────────────────────────────
  const invoice = $("#invoice");

  function renderInvoice() {
    const client = clientById(select.value);
    const lines = entries.filter((e) => e.client === client.id);
    const issued = new Date();
    const due = new Date(issued.getTime() + 14 * 864e5);
    const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const total = lines.reduce((s, e) => s + amountOf(e), 0);

    if (!lines.length) {
      invoice.innerHTML = `<p class="invoice__empty">No tracked time for ${escapeHtml(client.name)} yet. Go back to the timer, pick the client and start the clock.</p>
        <div class="invoice__actions"><button class="btn btn--line btn--sm" type="button" data-back>Back to timer</button></div>`;
    } else {
      invoice.innerHTML = `
        <div class="invoice__top">
          <span class="invoice__no">No. 2026-${String(invoiceNo).padStart(3, "0")}</span>
          <span class="invoice__status" id="inv-status">Draft</span>
        </div>
        <h3>${escapeHtml(client.name)}</h3>
        <div class="invoice__meta">
          <div><span>Issued</span>${fmtDate(issued)}</div>
          <div><span>Due</span>${fmtDate(due)}</div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Hours</th><th>Amount</th></tr></thead>
          <tbody>${lines.map((e) => `<tr><td>${escapeHtml(e.desc)}</td><td>${(e.minutes / 60).toFixed(2)}</td><td>${money.format(amountOf(e))}</td></tr>`).join("")}</tbody>
          <tfoot><tr><td colspan="2">Total · $${client.rate}/h</td><td>${money.format(total)}</td></tr></tfoot>
        </table>
        <div class="invoice__actions">
          <button class="btn btn--line btn--sm" type="button" data-back>Back to timer</button>
          <button class="btn btn--ink btn--sm" type="button" id="inv-send">Mark as sent</button>
        </div>`;
      $("#inv-send").addEventListener("click", (ev) => {
        const status = $("#inv-status");
        status.textContent = "Sent";
        status.classList.add("is-sent");
        ev.currentTarget.disabled = true;
        ev.currentTarget.textContent = "Sent";
        invoiceNo += 1;
      });
    }
    invoice.querySelector("[data-back]").addEventListener("click", () => selectTab(0, true));
  }

  // ── nav frost on scroll ───────────────────────────────
  const nav = $("#nav");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle("is-scrolled", window.scrollY > 24);
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── sticky CTA bar: after the third screen, until the signup form ──
  const bar = $("#cta-bar");
  const shots = document.querySelectorAll(".shot");
  let seenTour = false;
  let signupVisible = false;
  const syncBar = () => bar.classList.toggle("is-hidden", !seenTour || signupVisible);
  if ("IntersectionObserver" in window && shots.length) {
    bar.hidden = false;
    bar.classList.add("is-hidden");
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting || e.boundingClientRect.top < 0) seenTour = true;
      syncBar();
    }, { rootMargin: "0px 0px -40% 0px" }).observe(shots[shots.length - 1]);
    new IntersectionObserver((items) => {
      signupVisible = items.some((e) => e.isIntersecting);
      syncBar();
    }).observe($("#signup"));
  }

  // ── pricing toggle ────────────────────────────────────
  document.querySelectorAll('input[name="billing"]').forEach((r) =>
    r.addEventListener("change", () => {
      const period = r.value;
      document.querySelectorAll(".plan__price .tnum").forEach((el) => { el.textContent = `$${el.dataset[period]}`; });
      document.querySelectorAll(".plan__per[data-month]").forEach((el) => { el.textContent = el.dataset[period]; });
    })
  );

  // ── signup ────────────────────────────────────────────
  const signup = $("#signup-form");
  const email = $("#email");
  const msg = $("#email-msg");
  signup.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const value = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      email.setAttribute("aria-invalid", "true");
      msg.classList.add("is-error");
      msg.textContent = "That doesn’t look like an email. Try name@studio.com.";
      email.focus();
      return;
    }
    email.removeAttribute("aria-invalid");
    msg.classList.remove("is-error");
    msg.textContent = `Thanks — this is a concept site, so nothing was sent to ${value}. The demo at the top is the product.`;
    signup.reset();
  });
  email.addEventListener("input", () => {
    if (email.getAttribute("aria-invalid")) {
      email.removeAttribute("aria-invalid");
      msg.classList.remove("is-error");
      msg.textContent = "";
    }
  });

  renderEntries();
  updateInvoiceButton();
})();
