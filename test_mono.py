import requests
import time
from datetime import datetime, timedelta

# 1. Вставте сюди свій токен
TOKEN = "uL5uaqt7eFP9KmABOSJi1Qc6JqGL_k6OEPYnbXGzZHmk"
headers = {"X-Token": TOKEN}


def get_transactions():
    # --- ЕТАП 1: Отримуємо інформацію про клієнта, щоб знайти ID картки ---
    print("Отримання інформації про рахунки...")
    client_info_url = "https://api.monobank.ua/personal/client-info"
    response = requests.get(client_info_url, headers=headers)

    if response.status_code != 200:
        print(f"Помилка: {response.status_code}, {response.text}")
        return

    data = response.json()
    # Беремо першу карту зі списку (зазвичай це ваша головна чорна карта)
    account_id = data['accounts'][0]['id']
    user_name = data['name']
    print(f"Привіт, {user_name}! Використовуємо рахунок: {account_id}\n")

    # --- ЕТАП 2: Отримуємо виписку за останні 7 днів ---
    # Час має бути в форматі Unix Timestamp
    now = int(time.time())
    seven_days_ago = int((datetime.now() - timedelta(days=7)).timestamp())

    print(f"Завантажуємо транзакції за останні 7 днів...")
    statement_url = f"https://api.monobank.ua/personal/statement/{account_id}/{seven_days_ago}/{now}"

    statement_response = requests.get(statement_url, headers=headers)

    if statement_response.status_code == 200:
        transactions = statement_response.json()

        if not transactions:
            print("Транзакцій не знайдено.")
            return

        print(f"{'Дата':<20} | {'Сума':<10} | {'Опис'}")
        print("-" * 50)

        for tx in transactions:
            # Сума приходить в копійках, тому ділимо на 100
            amount = tx['amount'] / 100
            # Конвертуємо час у зрозумілий формат
            date = datetime.fromtimestamp(tx['time']).strftime('%Y-%m-%d %H:%M:%S')
            description = tx['description']

            print(f"{date:<20} | {amount:>8.2f} грн | {description}")
    else:
        # Монобанк дозволяє робити запити до виписки не частіше ніж раз на 60 секунд
        if statement_response.status_code == 429:
            print("Помилка: Занадто багато запитів. Зачекайте 1 хвилину.")
        else:
            print(f"Помилка виписки: {statement_response.status_code}")


if __name__ == "__main__":
    get_transactions()