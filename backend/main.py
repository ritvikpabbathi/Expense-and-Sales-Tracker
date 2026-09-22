import io
import uuid
from datetime import date
from typing import Optional

import pillow_heif
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from sqlmodel import Session, select

from database import IMAGES_DIR, get_session, init_db
from models import Expense, ExpenseCreate, Sale, SaleCreate, Settings
from search import generate_answer, parse_question, run_filter

pillow_heif.register_heif_opener()

app = FastAPI(title="Tejoh Collective Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_IMAGE_DIMENSION = 2000  # px, longest side — keeps output size well under API limits


async def _read_and_validate_image(file: UploadFile) -> bytes:
    """Decode whatever image format was uploaded (JPEG, PNG, WEBP, GIF, HEIC/HEIF
    from an iPhone, etc.) via Pillow and re-encode it as a size-capped JPEG. This
    means every saved file and every image sent to the AI is a real, verified,
    consistently formatted JPEG — no more guessing the format from magic bytes or
    a filename extension, HEIC photos (the iPhone default) are handled instead of
    rejected, and a full-resolution phone photo (which can re-encode to well over
    Groq's 20MB-per-image limit) can't blow past what the vision API accepts."""
    raw = await file.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 15MB).")

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Couldn't read that file as an image. Try a regular photo (JPEG, PNG, HEIC) or screenshot.",
        )

    if img.mode != "RGB":
        img = img.convert("RGB")
    if max(img.size) > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def _save_image(contents: bytes) -> str:
    filename = f"{uuid.uuid4().hex}.jpg"
    (IMAGES_DIR / filename).write_bytes(contents)
    return filename


@app.on_event("startup")
def on_startup():
    init_db()
    from database import engine

    with Session(engine) as session:
        existing = session.get(Settings, 1)
        if not existing:
            session.add(Settings(id=1, time_tracking_enabled=False, hourly_rate=None))
            session.commit()


# ---------- Expenses ----------

@app.get("/expenses", response_model=list[Expense])
def list_expenses(session: Session = Depends(get_session)):
    return session.exec(select(Expense).order_by(Expense.date.desc())).all()


@app.post("/expenses", response_model=Expense)
def create_expense(expense: ExpenseCreate, session: Session = Depends(get_session)):
    db_expense = Expense.model_validate(expense)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense


@app.put("/expenses/{expense_id}", response_model=Expense)
def update_expense(expense_id: int, expense: ExpenseCreate, session: Session = Depends(get_session)):
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in expense.model_dump().items():
        setattr(db_expense, key, value)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense


@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    _delete_image_file(db_expense.image_path)
    session.delete(db_expense)
    session.commit()
    return {"ok": True}


@app.post("/expenses/{expense_id}/image", response_model=Expense)
async def upload_expense_image(
    expense_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)
):
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    contents = await _read_and_validate_image(file)
    _delete_image_file(db_expense.image_path)
    db_expense.image_path = _save_image(contents)
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense


@app.delete("/expenses/{expense_id}/image", response_model=Expense)
def delete_expense_image(expense_id: int, session: Session = Depends(get_session)):
    db_expense = session.get(Expense, expense_id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    _delete_image_file(db_expense.image_path)
    db_expense.image_path = None
    session.add(db_expense)
    session.commit()
    session.refresh(db_expense)
    return db_expense


# ---------- Sales ----------

@app.get("/sales", response_model=list[Sale])
def list_sales(session: Session = Depends(get_session)):
    return session.exec(select(Sale).order_by(Sale.date.desc())).all()


@app.post("/sales", response_model=Sale)
def create_sale(sale: SaleCreate, session: Session = Depends(get_session)):
    db_sale = Sale.model_validate(sale)
    session.add(db_sale)
    session.commit()
    session.refresh(db_sale)
    return db_sale


@app.put("/sales/{sale_id}", response_model=Sale)
def update_sale(sale_id: int, sale: SaleCreate, session: Session = Depends(get_session)):
    db_sale = session.get(Sale, sale_id)
    if not db_sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    for key, value in sale.model_dump().items():
        setattr(db_sale, key, value)
    session.add(db_sale)
    session.commit()
    session.refresh(db_sale)
    return db_sale


@app.delete("/sales/{sale_id}")
def delete_sale(sale_id: int, session: Session = Depends(get_session)):
    db_sale = session.get(Sale, sale_id)
    if not db_sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    _delete_image_file(db_sale.image_path)
    session.delete(db_sale)
    session.commit()
    return {"ok": True}


def _delete_image_file(image_path: Optional[str]) -> None:
    if not image_path:
        return
    path = IMAGES_DIR / image_path
    if path.exists() and path.is_file():
        path.unlink()


@app.post("/sales/{sale_id}/image", response_model=Sale)
async def upload_sale_image(
    sale_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)
):
    db_sale = session.get(Sale, sale_id)
    if not db_sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    contents = await _read_and_validate_image(file)
    _delete_image_file(db_sale.image_path)
    db_sale.image_path = _save_image(contents)
    session.add(db_sale)
    session.commit()
    session.refresh(db_sale)
    return db_sale


@app.delete("/sales/{sale_id}/image", response_model=Sale)
def delete_sale_image(sale_id: int, session: Session = Depends(get_session)):
    db_sale = session.get(Sale, sale_id)
    if not db_sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    _delete_image_file(db_sale.image_path)
    db_sale.image_path = None
    session.add(db_sale)
    session.commit()
    session.refresh(db_sale)
    return db_sale


# ---------- Settings ----------

@app.get("/settings", response_model=Settings)
def get_settings(session: Session = Depends(get_session)):
    settings = session.get(Settings, 1)
    if not settings:
        settings = Settings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


class SettingsUpdate(BaseModel):
    time_tracking_enabled: bool
    hourly_rate: Optional[float] = None


@app.put("/settings", response_model=Settings)
def update_settings(update: SettingsUpdate, session: Session = Depends(get_session)):
    settings = session.get(Settings, 1)
    if not settings:
        settings = Settings(id=1)
    settings.time_tracking_enabled = update.time_tracking_enabled
    settings.hourly_rate = update.hourly_rate
    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


# ---------- Summary ----------

@app.get("/summary")
def get_summary(
    start: Optional[date] = None,
    end: Optional[date] = None,
    session: Session = Depends(get_session),
):
    expense_stmt = select(Expense)
    sale_stmt = select(Sale)
    if start:
        expense_stmt = expense_stmt.where(Expense.date >= start)
        sale_stmt = sale_stmt.where(Sale.date >= start)
    if end:
        expense_stmt = expense_stmt.where(Expense.date <= end)
        sale_stmt = sale_stmt.where(Sale.date <= end)

    expenses = session.exec(expense_stmt).all()
    sales = session.exec(sale_stmt).all()

    settings = session.get(Settings, 1)
    labor_cost = 0.0
    if settings and settings.time_tracking_enabled and settings.hourly_rate:
        total_minutes = sum(s.time_minutes or 0 for s in sales)
        labor_cost = round((total_minutes / 60.0) * settings.hourly_rate, 2)

    total_expenses = round(sum(e.amount + (e.tax_amount or 0) for e in expenses), 2)
    total_sales = round(sum(s.amount for s in sales), 2)
    total_cost = round(total_expenses + labor_cost, 2)
    profit = round(total_sales - total_cost, 2)
    margin_pct = round((profit / total_sales) * 100, 2) if total_sales else None

    return {
        "total_expenses": total_expenses,
        "labor_cost": labor_cost,
        "total_cost": total_cost,
        "total_sales": total_sales,
        "profit": profit,
        "margin_pct": margin_pct,
        "expense_count": len(expenses),
        "sale_count": len(sales),
    }


# ---------- Search ----------

class SearchHistoryTurn(BaseModel):
    question: str
    filter: dict


class SearchRequest(BaseModel):
    question: str
    history: list[SearchHistoryTurn] = []


@app.post("/search")
async def search(req: SearchRequest, session: Session = Depends(get_session)):
    try:
        history = [turn.model_dump() for turn in req.history]
        parsed = await parse_question(req.question, history=history)
        result = run_filter(session, parsed)
        answer = await generate_answer(req.question, result)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Search is unavailable right now: {e}")
    return {"answer": answer, "data": result}
