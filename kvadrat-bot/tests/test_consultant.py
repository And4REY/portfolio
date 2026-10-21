import asyncio

import aiohttp

from consultant import Consultant, faq_answer


def make(monkeypatch, reply=None, error=None):
    monkeypatch.setenv("AI_API_KEY", "test-key")
    c = Consultant()
    calls = []

    async def fake_complete(messages):
        calls.append(messages)
        if error:
            raise error
        return reply

    c._complete = fake_complete
    return c, calls


def test_without_key_uses_faq(monkeypatch):
    monkeypatch.delenv("AI_API_KEY", raising=False)
    c = Consultant()
    assert not c.enabled
    assert asyncio.run(c.answer(1, "Какая гарантия?")) == faq_answer("Какая гарантия?")


def test_ai_answer_and_history(monkeypatch):
    c, calls = make(monkeypatch, reply="Гарантия 3 года.")
    assert asyncio.run(c.answer(1, "Гарантия?")) == "Гарантия 3 года."
    asyncio.run(c.answer(1, "А на материалы?"))
    # второй запрос несёт историю первого
    assert [m["content"] for m in calls[1]] == ["Гарантия?", "Гарантия 3 года.", "А на материалы?"]


def test_api_error_falls_back_to_faq(monkeypatch):
    c, _ = make(monkeypatch, error=aiohttp.ClientError("down"))
    assert asyncio.run(c.answer(1, "сколько стоит?")) == faq_answer("сколько стоит?")
    assert not c.history[1]  # неудачный ответ не попадает в историю
