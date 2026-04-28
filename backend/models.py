from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    mono_token = Column(String, nullable=True)
    mono_account_id = Column(String, nullable=True)

    budgets = relationship("Budget", back_populates="owner")
    transactions = relationship("Transaction", back_populates="owner")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String, index=True)
    external_id = Column(String, unique=True, index=True)
    mono_id = Column(String, unique=True, index=True)
    amount = Column(Float)
    description = Column(String)
    mcc = Column(Integer)
    category = Column(String)
    time = Column(DateTime)

    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    limit_amount = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="budgets")