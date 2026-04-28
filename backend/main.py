import os
import time
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
import models, database, services, auth
from auth import get_current_user
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)

class UserCreate(BaseModel):
    username: str
    password: str

class SettingsUpdate(BaseModel):
    mono_token: str
    mono_account_id: str

class TransactionUpdate(BaseModel):
    category: str

class BudgetCreate(BaseModel):
    category: str
    limit_amount: float


@app.get("/monobank/accounts")
def get_mono_accounts(token: str):
    headers = {"X-Token": token}
    url = "https://api.monobank.ua/personal/client-info"

    try:
        res = requests.get(url, headers=headers, timeout=10)

        print(f"DEBUG: Status: {res.status_code}")

        if res.status_code == 429:
            raise HTTPException(status_code=400, detail="Занадто часто! Почекайте 60 секунд.")
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Помилка токена (код {res.status_code})")

        data = res.json()
        accounts = []
        for acc in data['accounts']:
            currency = "UAH" if acc['currencyCode'] == 980 else ("USD" if acc['currencyCode'] == 840 else "EUR")
            balance = acc['balance'] / 100
            name = f"{acc.get('type', 'Картка')} ({balance} {currency})"
            accounts.append({"id": acc['id'], "name": name})

        return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка з'єднання: {str(e)}")
@app.post("/register")
def register(user_data: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Логін зайнятий")
    new_user = models.User(username=user_data.username, hashed_password=auth.get_password_hash(user_data.password))
    db.add(new_user)
    db.commit()
    return {"message": "Успіх"}

@app.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    budget = db.query(models.Budget).filter(models.Budget.id == budget_id, models.Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Limit not found")
    db.delete(budget)
    db.commit()
    return {"ok": True}

@app.put("/budgets/{budget_id}")
def update_budget(budget_id: int, budget_data: dict, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    budget = db.query(models.Budget).filter(models.Budget.id == budget_id, models.Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Limit not found")
    budget.limit_amount = budget_data.get('limit_amount')
    db.commit()
    return budget

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Невірний пароль")
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/transactions")
def get_transactions(days: int = 30, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    start_date = datetime.now() - timedelta(days=days)
    return db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.account_id == current_user.mono_account_id,
        models.Transaction.time >= start_date
    ).order_by(models.Transaction.time.desc()).all()

@app.put("/transactions/{tx_id}")
def update_transaction(tx_id: int, data: TransactionUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id, models.Transaction.user_id == current_user.id).first()
    if not tx: raise HTTPException(status_code=404)
    tx.category = data.category
    db.commit()
    return {"message": "Оновлено"}

@app.get("/stats")
def get_stats(days: int = 30, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    start_date = datetime.now() - timedelta(days=days)

    expenses = db.query(models.Transaction.category, func.abs(func.sum(models.Transaction.amount))).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.account_id == current_user.mono_account_id,
        models.Transaction.amount < 0,
        models.Transaction.time >= start_date
    ).group_by(models.Transaction.category).all()

    income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.account_id == current_user.mono_account_id,
        models.Transaction.amount > 0,
        models.Transaction.time >= start_date
    ).scalar() or 0

    return {
        "categories": [{"name": s[0], "value": round(s[1], 2)} for s in expenses],
        "total_income": round(income, 2),
        "total_expenses": round(sum(s[1] for s in expenses), 2)
    }

@app.post("/budgets")
def set_budget(data: BudgetCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.Budget).filter(models.Budget.user_id == current_user.id, models.Budget.category == data.category).first()
    if existing: existing.limit_amount = data.limit_amount
    else:
        db.add(models.Budget(category=data.category, limit_amount=data.limit_amount, user_id=current_user.id))
    db.commit()
    return {"message": "Збережено"}

@app.get("/budgets")
def get_budgets(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Budget).filter(models.Budget.user_id == current_user.id).all()

@app.post("/settings")
def update_settings(data: SettingsUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    current_user.mono_token = data.mono_token
    current_user.mono_account_id = data.mono_account_id
    db.commit()
    return {"message": "Збережено"}


@app.post("/sync")
def sync_data(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    print(f"Починаю синхронізацію для: {current_user.username}")

    if not current_user.mono_token or not current_user.mono_account_id:
        print("Помилка: Токен або ID картки не встановлені")
        raise HTTPException(status_code=400, detail="Налаштування не знайдені")

    data = services.fetch_monobank_data(current_user.mono_token, current_user.mono_account_id)

    print(f"Банк повернув: {len(data)} записів")

    for item in data:
        existing = db.query(models.Transaction).filter(models.Transaction.external_id == str(item['id'])).first()
        if not existing:
            new_tx = models.Transaction(
                user_id=current_user.id,
                account_id=current_user.mono_account_id,
                external_id=str(item['id']),
                description=item['description'],
                mcc=item['mcc'],
                amount=item['amount'] / 100.0,
                time=datetime.fromtimestamp(item['time']),
                category=services.MCC_CATEGORIES.get(item['mcc'], "Інше")
            )
            db.add(new_tx)

    db.commit()
    print("Синхронізація завершена успішно")
    return {"status": "ok", "count": len(data)}