from pathlib import Path

from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
IMAGES_DIR = DATA_DIR / "images"
IMAGES_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "tejoh.db"

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


TABLE_COLUMNS_TO_ADD = {
    "sale": [("image_path", "VARCHAR"), ("buyer_name", "VARCHAR")],
    "expense": [("store_name", "VARCHAR"), ("image_path", "VARCHAR"), ("tax_amount", "REAL")],
}


def _migrate() -> None:
    """Add columns introduced after the table already existed on disk."""
    with engine.connect() as conn:
        for table, columns in TABLE_COLUMNS_TO_ADD.items():
            existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})"))}
            if not existing:
                continue
            for column, sql_type in columns:
                if column not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))
        conn.commit()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate()


def get_session():
    with Session(engine) as session:
        yield session
