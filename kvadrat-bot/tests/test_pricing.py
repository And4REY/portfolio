import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pricing import Estimate, days_word, normalize_phone, parse_area, rub


def test_matches_landing_default():
    # на сайте по умолчанию: 54 м², капитальный -> 648 000 ₽, 46 дней
    e = Estimate(54, "capital")
    assert e.total == 648_000
    assert e.days == 46


def test_extras_add_percent_of_base():
    e = Estimate(50, "cosmetic", ["floor", "cleaning"])
    assert e.base == 325_000
    assert e.extra == round(325_000 * 0.13)
    assert e.total == e.base + e.extra


def test_min_days():
    assert Estimate(10, "cosmetic").days == 14


def test_rub_format():
    assert rub(648000) == "648 000 ₽"


def test_days_word():
    assert [days_word(n) for n in (1, 2, 5, 11, 21, 22, 46)] == \
        ["день", "дня", "дней", "дней", "день", "дня", "дней"]


def test_parse_area():
    assert parse_area("54") == 54
    assert parse_area("54,6 кв.м") == 55
    assert parse_area("примерно 70 м2") == 70
    assert parse_area("abc") is None
    assert parse_area("5") is None
    assert parse_area("9000") is None


def test_normalize_phone():
    assert normalize_phone("+7 (912) 345-67-89") == "+79123456789"
    assert normalize_phone("89123456789") == "+79123456789"
    assert normalize_phone("9123456789") == "+79123456789"
    assert normalize_phone("12345") is None
    assert normalize_phone("+1 555 123 4567") is None


def test_summary():
    s = Estimate(54, "capital", ["ac"]).summary()
    assert s.startswith("54 м², капитальный, Кондиционеры — ")
