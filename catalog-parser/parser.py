"""Парсер каталога интернет-магазина → Excel / Google Таблица.

Демо на books.toscrape.com (сайт, созданный специально для тренировки парсеров).
Обходит все страницы каталога, заходит в каждую карточку товара, собирает цену,
наличие, рейтинг, категорию, артикул, описание и фото, пересчитывает цену в рубли
по курсу ЦБ РФ и выгружает результат.

    python parser.py                     # весь каталог → books.xlsx
    python parser.py --limit 100         # первые 100 товаров
    python parser.py --gsheet "Каталог"  # ещё и в Google Таблицу (нужен credentials.json)
"""
import argparse
import asyncio
import re
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from urllib.parse import urljoin

import aiohttp
from bs4 import BeautifulSoup

START_URL = "https://books.toscrape.com/catalogue/page-1.html"
CBR_URL = "https://www.cbr.ru/scripts/XML_daily.asp"
HEADERS = {"User-Agent": "Mozilla/5.0 (catalog-parser demo)"}
RATINGS = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}


@dataclass
class Product:
    title: str
    category: str
    price_gbp: float
    price_rub: float
    in_stock: int
    rating: int
    reviews: int
    upc: str
    description: str
    image: str
    url: str


# ---------------- разбор HTML (чистые функции, покрыты тестами) ----------------
def parse_listing(html: str, page_url: str) -> tuple[list[str], str | None]:
    """Страница каталога → (ссылки на карточки, ссылка на следующую страницу)."""
    soup = BeautifulSoup(html, "html.parser")
    links = [urljoin(page_url, a["href"]) for a in soup.select("article.product_pod h3 a")]
    nxt = soup.select_one("li.next a")
    return links, urljoin(page_url, nxt["href"]) if nxt else None


def _money(text: str) -> float:
    return float(re.sub(r"[^\d.]", "", text))


def parse_product(html: str, url: str, gbp_rate: float) -> Product:
    soup = BeautifulSoup(html, "html.parser")
    main = soup.select_one("div.product_main")
    table = {th.get_text(strip=True): td.get_text(strip=True)
             for th, td in zip(soup.select("table th"), soup.select("table td"))}

    rating_cls = main.select_one("p.star-rating")["class"]
    rating = next((RATINGS[c] for c in rating_cls if c in RATINGS), 0)
    stock = re.search(r"\d+", table.get("Availability", ""))
    desc = soup.select_one("#product_description + p")
    crumbs = soup.select("ul.breadcrumb li")
    price = _money(main.select_one("p.price_color").get_text())

    return Product(
        title=main.h1.get_text(strip=True),
        category=crumbs[2].get_text(strip=True) if len(crumbs) > 2 else "",
        price_gbp=price,
        price_rub=round(price * gbp_rate, 2),
        in_stock=int(stock.group()) if stock else 0,
        rating=rating,
        reviews=int(table.get("Number of reviews", 0) or 0),
        upc=table.get("UPC", ""),
        description=desc.get_text(strip=True) if desc else "",
        image=urljoin(url, soup.select_one("#product_gallery img")["src"]),
        url=url,
    )


def parse_cbr_rate(xml_bytes: bytes, code: str = "GBP") -> float:
    root = ET.fromstring(xml_bytes)
    for v in root.iter("Valute"):
        if v.findtext("CharCode") == code:
            return float(v.findtext("Value").replace(",", ".")) / int(v.findtext("Nominal"))
    raise ValueError(f"нет курса {code}")


# ---------------- сеть ----------------
class Fetcher:
    """Асинхронные запросы: ограничение параллельности, повторы при сбоях."""

    def __init__(self, session: aiohttp.ClientSession, concurrency: int = 8, retries: int = 3):
        self.session = session
        self.sem = asyncio.Semaphore(concurrency)
        self.retries = retries

    async def get(self, url: str) -> bytes:
        for attempt in range(1, self.retries + 1):
            try:
                async with self.sem, self.session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as r:
                    r.raise_for_status()
                    return await r.read()
            except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                if attempt == self.retries:
                    raise
                print(f"  повтор {attempt}/{self.retries - 1}: {url} ({e})")
                await asyncio.sleep(2 * attempt)


async def crawl(limit: int | None, concurrency: int) -> tuple[list[Product], float]:
    async with aiohttp.ClientSession(headers=HEADERS) as session:
        f = Fetcher(session, concurrency)
        rate = parse_cbr_rate(await f.get(CBR_URL))
        print(f"Курс ЦБ: 1 £ = {rate:.2f} ₽")

        # 1. обходим страницы каталога и собираем ссылки на карточки
        links, page, n = [], START_URL, 0
        while page and (limit is None or len(links) < limit):
            n += 1
            found, page = parse_listing((await f.get(page)).decode("utf-8"), page)
            links += found
            print(f"\r  страниц каталога: {n}, товаров найдено: {len(links)}", end="")
        print()
        links = links[:limit] if limit else links

        # 2. параллельно разбираем карточки
        done = 0

        async def one(url):
            nonlocal done
            try:
                p = parse_product((await f.get(url)).decode("utf-8"), url, rate)
            except Exception as e:
                print(f"\n  пропуск {url}: {e}")
                return None
            done += 1
            print(f"\r  карточек разобрано: {done}/{len(links)}", end="")
            return p

        products = [p for p in await asyncio.gather(*(one(u) for u in links)) if p]
        print()
        return products, rate


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Парсер каталога → Excel / Google Таблица")
    ap.add_argument("--limit", type=int, help="сколько товаров собрать (по умолчанию все)")
    ap.add_argument("--out", default="books.xlsx", help="файл Excel")
    ap.add_argument("--gsheet", help="название Google Таблицы для выгрузки")
    ap.add_argument("--concurrency", type=int, default=8, help="параллельных запросов")
    args = ap.parse_args()

    t = time.time()
    products, rate = asyncio.run(crawl(args.limit, args.concurrency))
    print(f"Собрано {len(products)} товаров за {time.time() - t:.0f} с")

    from export_excel import save_excel
    save_excel([asdict(p) for p in products], rate, args.out)
    print(f"Excel: {args.out}")

    if args.gsheet:
        from export_gsheets import save_gsheet
        print(f"Google Таблица: {save_gsheet([asdict(p) for p in products], rate, args.gsheet)}")


if __name__ == "__main__":
    main()
