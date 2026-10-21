"""Выгрузка в Google Таблицу через сервисный аккаунт Google (файл credentials.json).

Настройка один раз (5 минут):
1. console.cloud.google.com → создать проект → включить «Google Sheets API» и «Google Drive API».
2. IAM → Service Accounts → создать → Keys → Add key → JSON → сохранить как credentials.json рядом.
3. Создать пустую Google Таблицу и дать доступ «Редактор» на email сервисного аккаунта
   (вида name@project.iam.gserviceaccount.com).
"""
from pathlib import Path

import gspread

from export_excel import COLUMNS, summary_rows

CREDS = Path(__file__).parent / "credentials.json"


def save_gsheet(products: list[dict], rate: float, name: str) -> str:
    if not CREDS.exists():
        raise SystemExit("Нет credentials.json — инструкция в начале export_gsheets.py")
    gc = gspread.service_account(filename=str(CREDS))
    sh = gc.open(name)

    def sheet(title, rows, cols):
        try:
            ws = sh.worksheet(title)
            ws.clear()
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title, rows=rows, cols=cols)
        return ws

    ws = sheet("Товары", len(products) + 10, len(COLUMNS))
    ws.update([[c[1] for c in COLUMNS]] + [[p[c[0]] for c in COLUMNS] for p in products],
              value_input_option="USER_ENTERED")
    ws.format("1:1", {"textFormat": {"bold": True}, "backgroundColor": {"red": .9, "green": .9, "blue": .9}})
    ws.freeze(rows=1)

    s = sheet("Сводка", 100, 6)
    s.update([[f"Курс ЦБ: 1 £ = {rate:.2f} ₽"], [],
              ["Категория", "Товаров", "Средняя цена, ₽", "Мин. цена, ₽", "Макс. цена, ₽", "На складе, шт"]]
             + summary_rows(products))
    return sh.url
