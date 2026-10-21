"""ИИ-консультант: отвечает на вопросы клиентов по базе знаний компании."""
import os
from collections import defaultdict, deque
from pathlib import Path

import aiohttp

KNOWLEDGE = (Path(__file__).parent / "knowledge.md").read_text(encoding="utf-8")

SYSTEM = f"""Ты — консультант студии ремонта «Квадрат» в Telegram. Отвечаешь клиентам вежливо, \
по-человечески и коротко: 1–4 предложения, без markdown-разметки, без списков длиннее 3 пунктов.

Правила:
- Опирайся только на сведения о компании ниже. Если ответа там нет — честно скажи, что уточнит \
менеджер на замере, и предложи записаться.
- Не обещай скидок, точных сроков и цен сверх того, что указано. Точная цена — только после замера.
- Если клиент спрашивает про стоимость — предложи кнопку «🧮 Рассчитать ремонт».
- Если клиент готов к ремонту или хочет созвониться — предложи «📝 Записаться на замер».
- На темы, не связанные с ремонтом, вежливо возвращай разговор к ремонту.

Сведения о компании:
{KNOWLEDGE}"""

HISTORY_TURNS = 6  # сколько последних пар «вопрос-ответ» помнить


class Consultant:
    """Работает с любой нейросетью, у которой OpenAI-совместимый API:
    YandexGPT, GigaChat (через прокси), DeepSeek, GPT и др. Настройки — в .env."""

    def __init__(self):
        self.api_key = os.environ.get("AI_API_KEY", "")
        self.enabled = bool(self.api_key)
        self.base_url = os.environ.get("AI_BASE_URL", "https://api.deepseek.com/v1").rstrip("/")
        self.model = os.environ.get("AI_MODEL", "deepseek-chat")
        # история хранится как обычный текст: старые сообщения можно отрезать спереди
        self.history: dict[int, deque] = defaultdict(lambda: deque(maxlen=HISTORY_TURNS * 2))

    async def _complete(self, messages: list[dict]) -> str:
        payload = {"model": self.model, "max_tokens": 600, "temperature": 0.4,
                   "messages": [{"role": "system", "content": SYSTEM}] + messages}
        headers = {"Authorization": f"Bearer {self.api_key}"}
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(f"{self.base_url}/chat/completions",
                                    json=payload, headers=headers) as resp:
                resp.raise_for_status()
                data = await resp.json()
        return (data["choices"][0]["message"].get("content") or "").strip()

    async def answer(self, user_id: int, question: str) -> str:
        if not self.enabled:
            return faq_answer(question)

        hist = self.history[user_id]
        messages = list(hist) + [{"role": "user", "content": question}]
        try:
            text = await self._complete(messages)
        except (aiohttp.ClientError, TimeoutError, KeyError, IndexError, ValueError) as e:
            print(f"[ai] {type(e).__name__}: {e}")
            return faq_answer(question)

        if not text:
            return faq_answer(question)
        hist.append({"role": "user", "content": question})
        hist.append({"role": "assistant", "content": text})
        return text

    def reset(self, user_id: int):
        self.history.pop(user_id, None)


# --- запасной режим без ИИ: ответы по ключевым словам ---
FAQ = [
    (("цен", "стоим", "сколько стоит", "почём", "бюджет"),
     "Косметический ремонт — от 6 500 ₽/м², капитальный — от 12 000 ₽/м², дизайнерский — от 19 000 ₽/м². "
     "Точную сумму для вашей квартиры покажет калькулятор: нажмите «🧮 Рассчитать ремонт»."),
    (("срок", "долго", "сколько времени", "когда закончите"),
     "Косметический — от 3 недель, капитальный — от 45 дней, дизайнерский — от 70 дней. "
     "Срок фиксируем в договоре, за просрочку платим штраф 0,1% в день."),
    (("гарант",), "Гарантия на все работы — 3 года. Если что-то пойдёт не так, приедем и исправим бесплатно."),
    (("замер", "приехать", "посмотреть квартиру"),
     "Замер бесплатный и ни к чему не обязывает. Нажмите «📝 Записаться на замер» — перезвоним за 15 минут."),
    (("оплат", "предоплат", "рассрочк"),
     "Оплата по этапам — только за сделанное. Предоплата 10% на черновые материалы."),
    (("материал", "плитк", "ламинат", "обои"),
     "Чистовые материалы подбираем вместе и закупаем по закупочным ценам с чеками — или вы покупаете сами по нашему списку."),
    (("дом", "офис", "коттедж"), "Мы работаем только с квартирами — в новостройках и на вторичке."),
]


def faq_answer(question: str) -> str:
    q = question.lower()
    for keys, answer in FAQ:
        if any(k in q for k in keys):
            return answer
    return ("Хороший вопрос! Точно ответит менеджер — запишитесь на бесплатный замер "
            "кнопкой «📝 Записаться на замер», и мы перезвоним в течение 15 минут.")
