"""Расчёт стоимости ремонта. Те же цифры, что в калькуляторе на лендинге."""
import re
from dataclasses import dataclass, field

TYPES = {
    "cosmetic": {"name": "Косметический", "price": 6500, "days_per_m2": 0.45},
    "capital": {"name": "Капитальный", "price": 12000, "days_per_m2": 0.85},
    "design": {"name": "Дизайнерский", "price": 19000, "days_per_m2": 1.3},
}

EXTRAS = {
    "floor": {"name": "Тёплые полы", "k": 0.08},
    "demolition": {"name": "Демонтаж старой отделки", "k": 0.06},
    "ac": {"name": "Кондиционеры", "k": 0.10},
    "cleaning": {"name": "Клининг после ремонта", "k": 0.05},
}

MIN_AREA, MAX_AREA = 10, 500


@dataclass
class Estimate:
    area: int
    type_key: str
    extras: list[str] = field(default_factory=list)

    @property
    def base(self) -> int:
        return round(self.area * TYPES[self.type_key]["price"])

    @property
    def extra(self) -> int:
        return round(self.base * sum(EXTRAS[e]["k"] for e in self.extras))

    @property
    def total(self) -> int:
        return self.base + self.extra

    @property
    def days(self) -> int:
        return max(14, round(self.area * TYPES[self.type_key]["days_per_m2"]))

    def summary(self) -> str:
        """Одна строка для заявки менеджеру."""
        ex = ", ".join(EXTRAS[e]["name"] for e in self.extras) or "без доп. работ"
        return f"{self.area} м², {TYPES[self.type_key]['name'].lower()}, {ex} — {rub(self.total)}"


def rub(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " ₽"


def days_word(n: int) -> str:
    if n % 10 == 1 and n % 100 != 11:
        return "день"
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return "дня"
    return "дней"


def parse_area(text: str) -> int | None:
    """'54', '54 м2', '54,5 кв.м' -> 54/55. Вне диапазона или мусор -> None."""
    m = re.search(r"\d+(?:[.,]\d+)?", text or "")
    if not m:
        return None
    area = round(float(m.group().replace(",", ".")))
    return area if MIN_AREA <= area <= MAX_AREA else None


def normalize_phone(text: str) -> str | None:
    """Российский номер в любом виде -> '+7XXXXXXXXXX', иначе None."""
    digits = re.sub(r"\D", "", text or "")
    if len(digits) == 11 and digits[0] in "78":
        digits = digits[1:]
    if len(digits) != 10 or digits[0] not in "3489":  # мобильные 9xx, городские 3xx/4xx/8xx
        return None
    return "+7" + digits
