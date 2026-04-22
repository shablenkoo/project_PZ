from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    mono_id = Column(String, unique=True, index=True)  # Унікальний ID від банку
    amount = Column(Float)
    description = Column(String)
    mcc = Column(Integer)
    category = Column(String)
    time = Column(DateTime)