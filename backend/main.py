from fastapi import FastAPI, Depends
from sqlalchemy import func
import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, database, services
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Дозволяє запити з будь-якого домену
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Створюємо базу даних при запуску
models.Base.metadata.create_all(bind=database.engine)
@app.get("/")
def home():
    return {"status": "Backend is running", "test_version": "v5_with_dates"}


@app.post("/sync")
def sync_transactions(token: str, account_id: str, db: Session = Depends(database.get_db)):
    # За останні 30 днів
    start_time = int(time.time()) - (30 * 24 * 60 * 60)
    data = services.fetch_mono_data(token, account_id, start_time)

    new_count = 0
    for item in data:
        existing = db.query(models.Transaction).filter(models.Transaction.mono_id == item['id']).first()
        if not existing:
            # Створюємо новий запис з ПРАВИЛЬНИМИ даними
            new_tx = models.Transaction(
                mono_id=item['id'],
                amount=item['amount'] / 100,
                description=item['description'],
                mcc=item['mcc'],
                category=services.get_category_name(item['mcc']),
                time=datetime.datetime.fromtimestamp(item['time'])  # ОСЬ ТУТ МАГІЯ ДАТИ
            )
            db.add(new_tx)
            new_count += 1

    db.commit()  # Зберігаємо в базу
    return {"message": "Успішно", "added": new_count}


@app.get("/transactions")
def get_transactions(db: Session = Depends(database.get_db)):
    # Сортуємо за часом (desc - від нових до старих)
    return db.query(models.Transaction).order_by(models.Transaction.time.desc()).all()


@app.get("/stats")
def get_stats(db: Session = Depends(database.get_db)):
    # Групуємо витрати (сума < 0) за категоріями
    stats = db.query(
        models.Transaction.category,
        func.abs(func.sum(models.Transaction.amount)).label("total")
    ).filter(models.Transaction.amount < 0).group_by(models.Transaction.category).all()

    # Перетворюємо в зручний формат для фронтенду
    return [{"name": s[0], "value": round(s[1], 2)} for s in stats]

@app.get("/get-accounts")
def get_accounts(token: str):
    import requests
    headers = {"X-Token": token}
    response = requests.get("https://api.monobank.ua/personal/client-info", headers=headers)
    return response.json()