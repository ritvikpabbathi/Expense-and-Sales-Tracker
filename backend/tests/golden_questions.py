"""
Golden-question smoke test for the search feature.

Re-run this manually after changing any prompt in search.py or switching the
Groq model. It seeds a throwaway in-memory database with known values (never
touches your real data), asks a fixed set of questions, and checks the
answer text contains the numbers/dates we know are correct.

Run from the backend/ folder:
    ./venv/bin/python -m tests.golden_questions
"""

import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, SQLModel, create_engine

from models import Expense, Sale
from search import generate_answer, parse_question, run_filter

TODAY = date.today()
THIS_MONTH_A = TODAY.replace(day=1) + timedelta(days=2)
THIS_MONTH_B = TODAY.replace(day=1) + timedelta(days=8)
LAST_MONTH_REF = TODAY.replace(day=1) - timedelta(days=5)
LAST_MONTH_DAY = LAST_MONTH_REF.replace(day=min(10, LAST_MONTH_REF.day if LAST_MONTH_REF.day > 0 else 1))


def seed(session: Session):
    session.add_all(
        [
            Expense(name="Resin", amount=40.00, date=THIS_MONTH_A),
            Expense(name="Resin", amount=33.00, date=LAST_MONTH_DAY),
            Expense(name="Paints", amount=22.00, date=THIS_MONTH_B),
            Sale(product_name="Mandala Painting", amount=75.00, date=THIS_MONTH_A),
            Sale(product_name="Resin Coaster Set", amount=30.00, date=THIS_MONTH_B),
        ]
    )
    session.commit()


CASES = [
    (
        "How much did I spend on resin this month?",
        ["40.00"],
    ),
    (
        "When did I last purchase resin?",
        [THIS_MONTH_A.isoformat()],
    ),
    (
        "How much in total did I spend on resin and give me the dates too",
        ["73.00", THIS_MONTH_A.isoformat(), LAST_MONTH_DAY.isoformat()],
    ),
    (
        "What is my average expense on resin?",
        ["36.50"],
    ),
    (
        "How much did I make selling paintings this month?",
        ["75.00"],
    ),
    (
        "What is my total profit this month?",
        ["43.00"],
    ),
    (
        "How much did I spend on unicorn horns?",
        [],  # special-cased below: accept "$0.00" or "no record"/"none" wording
    ),
    (
        "How much did I spend last month?",
        ["33.00"],
    ),
]


async def main():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)

    passed = 0
    with Session(engine) as session:
        seed(session)

        for question, expected_substrings in CASES:
            f = await parse_question(question)
            result = run_filter(session, f)
            answer = await generate_answer(question, result)

            missing = [s for s in expected_substrings if s not in answer]
            ok = not missing
            if question == "How much did I spend on unicorn horns?":
                lowered = answer.lower()
                ok = "0.00" in answer or "no record" in lowered or "none" in lowered or "didn't" in lowered or "did not" in lowered
            passed += ok
            status = "PASS" if ok else "FAIL"
            print(f"[{status}] {question}")
            print(f"       -> {answer}")
            if missing:
                print(f"       missing expected: {missing}")
            print()

    print(f"{passed}/{len(CASES)} passed")
    sys.exit(0 if passed == len(CASES) else 1)


if __name__ == "__main__":
    asyncio.run(main())
