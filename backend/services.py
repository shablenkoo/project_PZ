import requests
import time

MCC_CATEGORIES = {
    5411: "Продукти", 5499: "Продукти", 5441: "Продукти", 5422: "Продукти",

    5812: "Ресторани/Кафе", 5814: "Фастфуд", 5813: "Бари",
    7832: "Кіно", 7999: "Розваги",

    5651: "Одяг", 5621: "Одяг", 5691: "Одяг", 5655: "Спорттовари", 5941: "Спорт",
    5661: "Взуття", 5631: "Аксесуари",

    4121: "Таксі", 4111: "Транспорт", 4784: "Дороги/Парковки", 7523: "Парковки",
    5541: "Бензин", 5542: "Бензин",

    5977: "Косметика", 7230: "Краса/Салони", 5912: "Аптеки", 8099: "Медицина",

    5712: "Меблі/Дім", 5200: "Госптовари", 4812: "Техніка", 5732: "Електроніка",

    4814: "Мобільний", 4900: "Комуналка",

    5991: "Зоотовари",

    6011: "Готівка", 4829: "Перекази", 6538: "Перекази",
    5399: "Маркетплейси", 5311: "Універмаги"
}

def get_category_name(mcc: int):
    return MCC_CATEGORIES.get(mcc, "Інше")


def fetch_monobank_data(token, account_id):
    to_time = int(time.time())
    from_time = to_time - (30 * 24 * 60 * 60)

    url = f"https://api.monobank.ua/personal/statement/{account_id}/{from_time}/{to_time}"
    headers = {"X-Token": token}

    res = requests.get(url, headers=headers)

    if res.status_code != 200:
        print(f"Помилка банку: {res.status_code} - {res.text}")
        return []

    return res.json()