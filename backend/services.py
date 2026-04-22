import requests

MCC_CATEGORIES = {
    # Продукти
    5411: "Продукти", 5499: "Продукти", 5441: "Продукти",
    # Ресторани
    5812: "Ресторани/Кафе", 5814: "Фастфуд", 5813: "Бари",
    # Транспорт
    4121: "Таксі", 4111: "Транспорт", 4784: "Дороги/Парковки", 7523: "Парковки",
    # Послуги та зв'язок
    4814: "Мобільний", 4812: "Техніка", 4900: "Комуналка",
    # Здоров'я
    5912: "Аптеки", 8099: "Медицина",
    # Різне
    5941: "Спорт", 6011: "Готівка", 4829: "Перекази", 6538: "Перекази",
    5399: "Маркетплейси", 5977: "Косметика"
}

def get_category_name(mcc: int):
    return MCC_CATEGORIES.get(mcc, "Інше")

def fetch_mono_data(token: str, account_id: str, start_time: int):
    url = f"https://api.monobank.ua/personal/statement/{account_id}/{start_time}"
    headers = {"X-Token": token}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return []