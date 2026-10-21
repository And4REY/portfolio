// Квадрат: калькулятор-смета, лента этапов, заявка на замер.
document.documentElement.classList.add("js");
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const rub = (n) => Math.round(n).toLocaleString("ru-RU") + " ₽";
const daysWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? "день" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "дня" : "дней");

// Те же цифры, что в Telegram-боте (kvadrat-bot/pricing.py)
const TYPES = {
  cosmetic: { name: "Косметический", price: 6500, daysPerM2: 0.45 },
  capital: { name: "Капитальный", price: 12000, daysPerM2: 0.85 },
  design: { name: "Дизайнерский", price: 19000, daysPerM2: 1.3 },
};
const EXTRAS = {
  floor: { name: "Тёплые полы", k: 0.08 },
  demolition: { name: "Демонтаж", k: 0.06 },
  ac: { name: "Кондиционеры", k: 0.1 },
  cleaning: { name: "Клининг", k: 0.05 },
};

// ── калькулятор ─────────────────────────────────────────
let summary = "";
function calc() {
  const area = +$("#area").value;
  const type = TYPES[$('input[name="type"]:checked').value];
  const base = Math.round(area * type.price);
  const extras = $$(".chips input:checked").map((c) => EXTRAS[c.value]);
  const lines = [{ name: "Работы и черновые материалы", sum: base }]
    .concat(extras.map((e) => ({ name: e.name, sum: Math.round(base * e.k), add: true })));
  const total = lines.reduce((s, l) => s + l.sum, 0);
  const days = Math.max(14, Math.round(area * type.daysPerM2));

  $("#areaOut").textContent = area + " м²";
  $("#sheetSub").textContent = `${area} м², ${type.name.toLowerCase()} ремонт`;
  $("#lines").innerHTML = lines.map((l) => `<div class="sheet__line${l.add ? " sheet__line--add" : ""}"><span>${l.name}</span><span>${rub(l.sum)}</span></div>`).join("");
  const totalEl = $("#total");
  if (totalEl.textContent !== rub(total)) {
    totalEl.textContent = rub(total);
    totalEl.classList.remove("bump");
    void totalEl.offsetWidth;
    totalEl.classList.add("bump");
  }
  $("#days").textContent = `${days} ${daysWord(days)}`;
  summary = `${area} м², ${type.name.toLowerCase()}, ${extras.map((e) => e.name.toLowerCase()).join(", ") || "без доп. работ"} — ${rub(total)}`;
  $('[name="calc"]').value = summary;
}
$$("#calc input").forEach((i) => i.addEventListener("input", calc));
calc();

$("#fix").addEventListener("click", () => {
  const info = $("#calcInfo");
  info.textContent = `Ваш расчёт: ${summary}`;
  info.hidden = false;
});

// ── лента этапов ────────────────────────────────────────
const row = $("#row");
const bar = $("#bar");
function syncBar() {
  const max = row.scrollWidth - row.clientWidth;
  const visible = row.clientWidth / row.scrollWidth;
  const pos = max > 0 ? row.scrollLeft / max : 1;
  bar.style.width = `${Math.min(100, (visible + (1 - visible) * pos) * 100)}%`;
}
row.addEventListener("scroll", () => requestAnimationFrame(syncBar), { passive: true });
window.addEventListener("resize", syncBar);
syncBar();
const step = () => row.querySelector(".moment").getBoundingClientRect().width + 32;
$("#prev").addEventListener("click", () => row.scrollBy({ left: -step(), behavior: "smooth" }));
$("#next").addEventListener("click", () => row.scrollBy({ left: step(), behavior: "smooth" }));

// перетаскивание мышью (на телефоне лента листается пальцем сама)
let drag = null;
row.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") return;
  drag = { x: e.clientX, left: row.scrollLeft, moved: false };
  row.style.scrollSnapType = "none";
});
window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 4) drag.moved = true;
  row.scrollLeft = drag.left - dx;
});
window.addEventListener("pointerup", () => {
  if (!drag) return;
  drag = null;
  row.style.scrollSnapType = "";
});
row.addEventListener("dragstart", (e) => e.preventDefault());

// ── заявка ──────────────────────────────────────────────
const phone = $("#f-phone");
phone.addEventListener("input", () => {
  const d = phone.value.replace(/\D/g, "").replace(/^[78]/, "").slice(0, 10);
  let r = "+7";
  if (d.length) r += " (" + d.slice(0, 3);
  if (d.length >= 3) r += ") " + d.slice(3, 6);
  if (d.length >= 6) r += "-" + d.slice(6, 8);
  if (d.length >= 8) r += "-" + d.slice(8, 10);
  phone.value = r;
  phone.removeAttribute("aria-invalid");
});
const nameInput = $("#f-name");
nameInput.addEventListener("input", () => nameInput.removeAttribute("aria-invalid"));

$("#lead").addEventListener("submit", (e) => {
  e.preventDefault();
  const okName = nameInput.value.trim().length > 1;
  const okPhone = phone.value.replace(/\D/g, "").length === 11;
  nameInput.toggleAttribute("aria-invalid", !okName);
  phone.toggleAttribute("aria-invalid", !okPhone);
  if (!okName || !okPhone) {
    $("#formErr").textContent = !okName ? "Напишите, как к вам обращаться." : "Проверьте номер: нужно 10 цифр после +7.";
    (!okName ? nameInput : phone).focus();
    return;
  }
  // здесь заявка уходит в Telegram или CRM заказчика
  $("#formErr").textContent = "";
  $("#lead").hidden = true;
  $("#ok").hidden = false;
});

// ── появление блоков ────────────────────────────────────
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    io.unobserve(en.target);
  }), { threshold: 0.15 });
  $$(".reveal, .moments, .faq").forEach((el) => io.observe(el));
  // шторка открывается, как только фото показалось снизу экрана
  const shutterIo = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    shutterIo.unobserve(en.target);
  }), { threshold: 0, rootMargin: "0px 0px 15% 0px" });
  $$(".shutter").forEach((el) => shutterIo.observe(el));
} else {
  $$(".reveal, .shutter, .moments, .faq").forEach((el) => el.classList.add("is-in"));
}
