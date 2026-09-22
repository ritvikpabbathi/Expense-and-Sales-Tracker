from datetime import date as date_type
from typing import Optional

from sqlmodel import Field, SQLModel


class ExpenseBase(SQLModel):
    name: str
    amount: float
    date: date_type
    notes: Optional[str] = None
    store_name: Optional[str] = None
    tax_amount: Optional[float] = None


class Expense(ExpenseBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_path: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class SaleBase(SQLModel):
    product_name: str
    amount: float
    date: date_type
    notes: Optional[str] = None
    time_minutes: Optional[float] = None
    buyer_name: Optional[str] = None


class Sale(SaleBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image_path: Optional[str] = None


class SaleCreate(SaleBase):
    pass


class Settings(SQLModel, table=True):
    id: Optional[int] = Field(default=1, primary_key=True)
    time_tracking_enabled: bool = False
    hourly_rate: Optional[float] = None
