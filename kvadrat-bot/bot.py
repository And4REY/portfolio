"""Telegram-бот студии ремонта «Квадрат»: калькулятор, запись на замер, ИИ-консультант."""
import asyncio
import html
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ChatAction, ParseMode
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (BotCommand, CallbackQuery, KeyboardButton, Message,
                           ReplyKeyboardMarkup)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from consultant import Consultant
from pricing import EXTRAS, TYPES, Estimate, days_word, normalize_phone, parse_area, rub

HERE = Path(__file__).parent


def load_env(path: Path):
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"\''))


load_env(HERE / ".env")
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "")

router = Router()
consultant = Consultant()

# ---------- кнопки ----------
BTN_CALC = "🧮 Рассчитать ремонт"
BTN_LEAD = "📝 Записаться на замер"
BTN_ASK = "💬 Задать вопрос"
BTN_ABOUT = "ℹ️ О компании"
BTN_CANCEL = "❌ Отмена"

MAIN_KB = ReplyKeyboardMarkup(keyboard=[
    [KeyboardButton(text=BTN_CALC), KeyboardButton(text=BTN_LEAD)],
    [KeyboardButton(text=BTN_ASK), KeyboardButton(text=BTN_ABOUT)],
], resize_keyboard=True, input_field_placeholder="Спросите что угодно о ремонте")

PHONE_KB = ReplyKeyboardMarkup(keyboard=[
    [KeyboardButton(text="📱 Отправить мой номер", request_contact=True)],
    [KeyboardButton(text=BTN_CANCEL)],
], resize_keyboard=True, one_time_keyboard=True)

CANCEL_KB = ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text=BTN_CANCEL)]], resize_keyboard=True)


class Calc(StatesGroup):
    area = State()


class Lead(StatesGroup):
    name = State()
    phone = State()


# ---------- заявки ----------
db = sqlite3.connect(os.environ.get("LEADS_DB", HERE / "leads.db"))
db.execute("""CREATE TABLE IF NOT EXISTS leads(
    id INTEGER PRIMARY KEY, created TEXT, user_id INT, username TEXT,
    name TEXT, phone TEXT, estimate TEXT)""")


async def save_lead(bot: Bot, msg: Message, name: str, phone: str, estimate: str | None):
    cur = db.execute("INSERT INTO leads(created,user_id,username,name,phone,estimate) VALUES(?,?,?,?,?,?)",
                     (datetime.now().isoformat(timespec="seconds"), msg.from_user.id,
                      msg.from_user.username, name, phone, estimate))
    db.commit()
    if ADMIN_CHAT_ID:
        user = f"@{msg.from_user.username}" if msg.from_user.username else f"id {msg.from_user.id}"
        text = (f"🔥 <b>Новая заявка №{cur.lastrowid}</b>\n\n"
                f"👤 {html.escape(name)} ({html.escape(user)})\n"
                f"📞 {phone}\n"
                f"🧮 {html.escape(estimate) if estimate else 'расчёт не делал'}")
        try:
            await bot.send_message(ADMIN_CHAT_ID, text)
        except Exception as e:
            logging.error("не удалось уведомить менеджера: %s", e)


# ---------- старт и меню ----------
@router.message(CommandStart())
async def start(msg: Message, state: FSMContext):
    await state.clear()
    consultant.reset(msg.from_user.id)
    name = html.escape(msg.from_user.first_name or "")
    await msg.answer(
        f"Здравствуйте{', ' + name if name else ''}! 👋\n\n"
        "Я помощник студии ремонта <b>«Квадрат»</b>. Могу:\n"
        "• за минуту рассчитать стоимость ремонта,\n"
        "• записать на бесплатный замер,\n"
        "• ответить на любой вопрос — просто напишите его.\n\n"
        "<i>Демо-бот для портфолио, компания вымышлена.</i>",
        reply_markup=MAIN_KB)


@router.message(F.text == BTN_ABOUT)
async def about(msg: Message):
    await msg.answer(
        "<b>«Квадрат»</b> — ремонт квартир под ключ.\n\n"
        "✅ Цена фиксируется в договоре и не растёт\n"
        "📸 Фото- и видеоотчёт каждую пятницу\n"
        "💳 Оплата по этапам — только за сделанное\n"
        "🛡 Гарантия 3 года, штраф за просрочку\n\n"
        "Работаем ежедневно с 9:00 до 21:00.", reply_markup=MAIN_KB)


@router.message(F.text == BTN_ASK)
async def ask(msg: Message):
    await msg.answer("Напишите ваш вопрос — например, «что входит в капитальный ремонт?» "
                     "или «можно ли купить плитку самому?»")


@router.message(F.text == BTN_CANCEL)
async def cancel(msg: Message, state: FSMContext):
    await state.set_state(None)  # данные расчёта сохраняем
    await msg.answer("Хорошо, вернёмся к этому позже.", reply_markup=MAIN_KB)


# ---------- калькулятор ----------
def area_kb():
    kb = InlineKeyboardBuilder()
    for a in (30, 45, 60, 80, 100):
        kb.button(text=f"{a} м²", callback_data=f"area:{a}")
    kb.adjust(5)
    return kb.as_markup()


def type_kb():
    kb = InlineKeyboardBuilder()
    for key, t in TYPES.items():
        kb.button(text=f"{t['name']} · от {rub(t['price'])}/м²", callback_data=f"type:{key}")
    kb.adjust(1)
    return kb.as_markup()


def extras_kb(selected: list[str]):
    kb = InlineKeyboardBuilder()
    for key, e in EXTRAS.items():
        mark = "✅" if key in selected else "▫️"
        kb.button(text=f"{mark} {e['name']}", callback_data=f"ex:{key}")
    kb.button(text="Готово — показать цену →", callback_data="ex:done")
    kb.adjust(1)
    return kb.as_markup()


def result_kb():
    kb = InlineKeyboardBuilder()
    kb.button(text="📝 Зафиксировать цену — записаться на замер", callback_data="lead")
    kb.button(text="🔄 Пересчитать", callback_data="calc")
    kb.adjust(1)
    return kb.as_markup()


@router.message(F.text == BTN_CALC)
@router.message(Command("calc"))
async def calc_start(msg: Message, state: FSMContext):
    await state.set_state(Calc.area)
    await msg.answer("Какая площадь квартиры? Выберите или напишите число в м².", reply_markup=area_kb())


@router.callback_query(F.data == "calc")
async def calc_again(cb: CallbackQuery, state: FSMContext):
    await state.set_state(Calc.area)
    await cb.message.answer("Какая площадь квартиры? Выберите или напишите число в м².", reply_markup=area_kb())
    await cb.answer()


async def ask_type(target: Message, state: FSMContext, area: int):
    await state.update_data(area=area, extras=[])
    await state.set_state(None)
    await target.answer(f"Площадь: <b>{area} м²</b>. Какой ремонт нужен?", reply_markup=type_kb())


@router.callback_query(F.data.startswith("area:"))
async def calc_area_btn(cb: CallbackQuery, state: FSMContext):
    await cb.message.edit_reply_markup(reply_markup=None)
    await ask_type(cb.message, state, int(cb.data.split(":")[1]))
    await cb.answer()


@router.message(StateFilter(Calc.area), F.text)
async def calc_area_text(msg: Message, state: FSMContext):
    area = parse_area(msg.text)
    if area is None:
        await msg.answer("Не понял площадь 🤔 Напишите число от 10 до 500, например: 54")
        return
    await ask_type(msg, state, area)


@router.callback_query(F.data.startswith("type:"))
async def calc_type(cb: CallbackQuery, state: FSMContext):
    key = cb.data.split(":")[1]
    await state.update_data(type_key=key, extras=[])
    await cb.message.edit_text(
        f"Ремонт: <b>{TYPES[key]['name'].lower()}</b>. Нужно что-то дополнительно? "
        "Отметьте и нажмите «Готово».", reply_markup=extras_kb([]))
    await cb.answer()


@router.callback_query(F.data.startswith("ex:"))
async def calc_extras(cb: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    if "area" not in data or "type_key" not in data:
        await cb.answer("Расчёт устарел, начните заново", show_alert=True)
        return
    key = cb.data.split(":")[1]
    extras = list(data.get("extras", []))

    if key != "done":
        extras.remove(key) if key in extras else extras.append(key)
        await state.update_data(extras=extras)
        await cb.message.edit_reply_markup(reply_markup=extras_kb(extras))
        await cb.answer()
        return

    est = Estimate(data["area"], data["type_key"], extras)
    await state.update_data(estimate=est.summary())
    extras_line = ", ".join(EXTRAS[e]["name"].lower() for e in extras) or "нет"
    await cb.message.edit_text(
        "🧮 <b>Предварительный расчёт</b>\n\n"
        f"Площадь: {est.area} м²\n"
        f"Ремонт: {TYPES[est.type_key]['name'].lower()}\n"
        f"Доп. работы: {extras_line}\n\n"
        f"Работы и черновые материалы: {rub(est.base)}\n"
        f"Доп. работы: {rub(est.extra)}\n"
        f"Срок: ~{est.days} {days_word(est.days)}\n\n"
        f"💰 <b>Итого: {rub(est.total)}</b>\n\n"
        "<i>Точную смету инженер составит после бесплатного замера, "
        "и цена будет зафиксирована в договоре.</i>",
        reply_markup=result_kb())
    await cb.answer()


# ---------- запись на замер ----------
async def lead_start(target: Message, state: FSMContext):
    await state.set_state(Lead.name)
    await target.answer("Отлично! Как к вам обращаться?", reply_markup=CANCEL_KB)


@router.message(F.text == BTN_LEAD)
@router.message(Command("zamer"))
async def lead_from_menu(msg: Message, state: FSMContext):
    await lead_start(msg, state)


@router.callback_query(F.data == "lead")
async def lead_from_calc(cb: CallbackQuery, state: FSMContext):
    await lead_start(cb.message, state)
    await cb.answer()


@router.message(StateFilter(Lead.name), F.text)
async def lead_name(msg: Message, state: FSMContext):
    name = msg.text.strip()[:60]
    if len(name) < 2:
        await msg.answer("Напишите, пожалуйста, имя.")
        return
    await state.update_data(name=name)
    await state.set_state(Lead.phone)
    await msg.answer(f"Приятно познакомиться, {html.escape(name)}! Оставьте номер телефона — "
                     "нажмите кнопку ниже или напишите его.", reply_markup=PHONE_KB)


@router.message(StateFilter(Lead.phone), F.contact | F.text)
async def lead_phone(msg: Message, state: FSMContext):
    raw = msg.contact.phone_number if msg.contact else msg.text
    phone = normalize_phone(raw)
    if not phone:
        await msg.answer("Не похоже на номер телефона. Пример: +7 912 345-67-89")
        return
    data = await state.get_data()
    await save_lead(msg.bot, msg, data["name"], phone, data.get("estimate"))
    await state.clear()
    await msg.answer("✅ <b>Заявка принята!</b>\nПерезвоним в течение 15 минут (с 9:00 до 21:00) "
                     "и подберём удобное время для замера.", reply_markup=MAIN_KB)


# ---------- администратор ----------
@router.message(Command("leads"))
async def leads(msg: Message):
    if str(msg.chat.id) != ADMIN_CHAT_ID:
        return
    rows = db.execute("SELECT id, created, name, phone, estimate FROM leads ORDER BY id DESC LIMIT 10").fetchall()
    if not rows:
        await msg.answer("Заявок пока нет.")
        return
    lines = [f"<b>№{r[0]}</b> {r[1][:16].replace('T', ' ')} — {html.escape(r[2])}, {r[3]}"
             + (f"\n   {html.escape(r[4])}" if r[4] else "") for r in rows]
    await msg.answer("📋 <b>Последние заявки</b>\n\n" + "\n".join(lines))


# ---------- свободные вопросы → ИИ ----------
@router.message(StateFilter(None), F.text)
async def free_question(msg: Message):
    await msg.bot.send_chat_action(msg.chat.id, ChatAction.TYPING)
    answer = await consultant.answer(msg.from_user.id, msg.text[:1500])
    await msg.answer(html.escape(answer), reply_markup=MAIN_KB)


@router.message()
async def fallback(msg: Message):
    await msg.answer("Я понимаю только текст 🙂 Напишите вопрос или выберите действие в меню.",
                     reply_markup=MAIN_KB)


async def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token = os.environ.get("BOT_TOKEN")
    if not token:
        raise SystemExit("Нет BOT_TOKEN в .env — см. README.md")
    bot = Bot(token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)
    await bot.set_my_commands([
        BotCommand(command="start", description="Главное меню"),
        BotCommand(command="calc", description="Рассчитать ремонт"),
        BotCommand(command="zamer", description="Записаться на замер"),
    ])
    logging.info("ИИ-консультант: %s", "включён" if consultant.enabled else "выключен (ответы по FAQ)")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
