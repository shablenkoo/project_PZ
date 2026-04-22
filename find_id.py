import requests

TOKEN = "uL5uaqt7eFP9KmABOSJi1Qc6JqGL_k6OEPYnbXGzZHmk"
headers = {"X-Token": TOKEN}

response = requests.get("https://api.monobank.ua/personal/client-info", headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"Привіт, {data['name']}!")
    print("Ось ваші рахунки:")
    for acc in data['accounts']:
        # Виводимо ID, тип карти та баланс (для перевірки, що це та карта)
        print(f"ID: {acc['id']}")
        print(f"Тип: {acc['type']}")
        print(f"Баланс: {acc['balance']/100} грн")
        print("-" * 30)
else:
    print("Помилка! Перевірте токен.")