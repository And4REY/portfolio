"""Сквозной тест диалога: апдейты подаются в диспетчер, ответы перехватываются фейковой сессией."""
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

os.environ.update(LEADS_DB=":memory:", ADMIN_CHAT_ID="999", AI_API_KEY="")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from aiogram import Bot, Dispatcher
from aiogram.client.session.base import BaseSession
from aiogram.methods import EditMessageText, SendMessage
from aiogram.types import CallbackQuery, Chat, Contact, Message, Update, User

import bot as app

USER = User(id=42, is_bot=False, first_name="Анна", username="anna")
CHAT = Chat(id=42, type="private")


class FakeSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.calls = []

    async def make_request(self, bot, method, timeout=None):
        self.calls.append(method)
        if isinstance(method, (SendMessage, EditMessageText)):
            return Message(message_id=len(self.calls), date=datetime.now(),
                           chat=Chat(id=int(method.chat_id or 42), type="private"), text=method.text)
        return True

    async def close(self):
        pass

    async def stream_content(self, *a, **kw):
        yield b""


class Harness:
    def __init__(self):
        self.session = FakeSession()
        self.bot = Bot("123456:TEST-TOKEN-abcdefghijklmnopqrstuvwxyz", session=self.session)
        self.dp = Dispatcher()
        self.dp.include_router(app.router)
        self.n = 0

    def _msg(self, **kw):
        self.n += 1
        return Message(message_id=self.n, date=datetime.now(), chat=CHAT, from_user=USER, **kw)

    async def send(self, text=None, contact=None):
        self.session.calls.clear()
        upd = Update(update_id=self.n, message=self._msg(text=text, contact=contact))
        await self.dp.feed_update(self.bot, upd)
        return self.session.calls

    async def click(self, data):
        self.session.calls.clear()
        cb = CallbackQuery(id=str(self.n), from_user=USER, chat_instance="x", data=data,
                           message=self._msg(text="..."))
        await self.dp.feed_update(self.bot, Update(update_id=self.n, callback_query=cb))
        return self.session.calls


def texts(calls):
    return [c.text for c in calls if isinstance(c, (SendMessage, EditMessageText))]


def test_full_dialog():
    async def run():
        h = Harness()

        out = texts(await h.send("/start"))
        assert "Квадрат" in out[0]

        out = texts(await h.send(app.BTN_CALC))
        assert "площадь" in out[0].lower()

        # площадь текстом, с ошибкой и без
        assert "Не понял" in texts(await h.send("много"))[0]
        assert "54 м²" in texts(await h.send("54 м2"))[0]

        assert "капитальный" in texts(await h.click("type:capital"))[0]
        await h.click("ex:ac")
        await h.click("ex:ac")      # сняли галочку
        await h.click("ex:floor")
        result = texts(await h.click("ex:done"))[0]
        # 54*12000 = 648 000; +8% = 51 840 -> 699 840
        assert "699 840 ₽" in result
        assert "Кондиционеры".lower() not in result

        assert "обращаться" in texts(await h.click("lead"))[0]
        assert "Анна" in texts(await h.send("Анна"))[0]
        assert "Не похоже" in texts(await h.send("123"))[0]

        calls = await h.send(contact=Contact(phone_number="79123456789", first_name="Анна"))
        sent = {str(c.chat_id): c.text for c in calls if isinstance(c, SendMessage)}
        assert "+79123456789" in sent["999"]           # менеджеру ушла заявка
        assert "699 840 ₽" in sent["999"]              # вместе с расчётом
        assert "Заявка принята" in sent["42"]          # клиенту подтверждение

        row = app.db.execute("SELECT name, phone FROM leads").fetchone()
        assert row == ("Анна", "+79123456789")

        # свободный вопрос без ключа -> ответ из FAQ
        assert "3 года" in texts(await h.send("а какая у вас гарантия?"))[0]

    asyncio.run(run())
