// Портфолио: сцена со скриншотом текущего проекта, переписка по шагам, поле задачи → Telegram.
document.documentElement.classList.add("js");
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CAPS = {
  pasparty: "Паспарту · интернет-магазин", remont: "Квадрат · лендинг", tallyhour: "Tallyhour · сайт на английском",
  overprint: "Overprint Supply · магазин на английском", bot: "Бот «Квадрата» · Telegram", parser: "Парсер · таблица Excel",
};

// ── сцена ───────────────────────────────────────────────
let current = "pasparty";
function show(id) {
  if (id === current) return;
  current = id;
  $$("#stage img").forEach((img) => img.classList.toggle("is-on", img.dataset.shot === id));
  $("#stageCap").textContent = CAPS[id];
}
// пока читают первый экран, работы медленно сменяют друг друга
const cycle = ["pasparty", "remont", "tallyhour", "overprint"];
let timer = null, i = 0, userMoved = false;
const play = () => { if (!reduced && !timer && !userMoved) timer = setInterval(() => { i = (i + 1) % cycle.length; show(cycle[i]); }, 5500); };
const stop = () => { clearInterval(timer); timer = null; };
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : play()));
play();

// при прокрутке сцена показывает проект, о котором сейчас читают
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    userMoved = true; stop(); show(e.target.dataset.shot);
  }), { rootMargin: "-45% 0px -45% 0px" });
  $$(".proj[data-shot]").forEach((el) => io.observe(el));
}
// наведение на строку списка тоже меняет сцену
$$(".ledger__rows a").forEach((a) => {
  const go = () => { userMoved = true; stop(); show(a.dataset.shot); };
  a.addEventListener("mouseenter", go);
  a.addEventListener("focus", go);
});

// ── как я работаю: переписка растёт вместе с шагом ──────
const msgs = $$("#chat .msg");
function chatState(n) {
  msgs.forEach((m) => { m.hidden = +m.dataset.s > n; });
  $$(".step").forEach((s) => s.classList.toggle("is-active", +s.dataset.state === n));
}
chatState(4); // без скрипта и до прокрутки видна вся переписка
if ("IntersectionObserver" in window) {
  chatState(1);
  const sio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) chatState(+e.target.dataset.state); }), { rootMargin: "-40% 0px -40% 0px" });
  $$(".step").forEach((s) => sio.observe(s));
}

// ── поле задачи: копируем текст и открываем Telegram ────
const task = $("#task");
task.addEventListener("input", () => { task.style.height = "auto"; task.style.height = Math.max(64, task.scrollHeight) + "px"; });
$("#ask").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = task.value.trim();
  const note = $("#askNote");
  if (text.length < 5) { note.textContent = "Напишите хотя бы пару слов о задаче."; task.focus(); return; }
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch { /* нет доступа к буферу: просто откроем чат */ }
  note.textContent = copied ? "Текст скопирован. Открываю Telegram, вставьте его в чат." : "Открываю Telegram, перепишите задачу в чат.";
  window.open("https://t.me/rlqwerty", "_blank", "noopener");
});

// ── появление блоков ────────────────────────────────────
const targets = $$(".reveal");
if ("IntersectionObserver" in window && !reduced) {
  const rio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); } }), { threshold: 0.12 });
  targets.forEach((t) => rio.observe(t));
} else targets.forEach((t) => t.classList.add("is-in"));
