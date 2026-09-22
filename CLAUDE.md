# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tejoh Collective — a local-only expense & sales tracker for a small art business. FastAPI +
SQLite backend, React + Vite frontend. Single-user, runs entirely on the owner's machine — no
auth, no hosting, no multi-tenancy. Data lives in `backend/data/tejoh.db`, with uploaded sale
photos in `backend/data/images/`.

## Running the app

**Mac/Linux:**
```bash
./start.sh
```

**Windows:** double-click `start.bat` (or run from Command Prompt). Opens two separate console
windows (backend, frontend) — closing either stops that half.

Either script bootstraps on first run (creates `backend/venv`, `pip install`s
`requirements.txt`, `npm install`s the frontend) and then starts:
- Backend at `http://localhost:8000` (`uvicorn main:app --port 8000`)
- Frontend at `http://localhost:5173` (`vite` dev server)

To run pieces individually:

```bash
# Backend only
cd backend && ./venv/bin/uvicorn main:app --port 8000 --reload

# Frontend only
cd frontend && npm run dev
```

### Frontend commands

```bash
cd frontend
npm run dev       # start dev server
npm run build     # production build (vite build)
npm run lint       # oxlint
npm run preview   # preview production build
```

### Backend tests

There's no automated test runner wired up — one manual smoke test exists for the search
feature. Re-run it after touching any prompt in `search.py` or changing the Groq model:

```bash
cd backend
./venv/bin/python -m tests.golden_questions
```

It seeds a throwaway in-memory SQLite DB (never touches `backend/data/tejoh.db`), asks a fixed
set of questions, and checks the generated answers contain the expected numbers/dates.

### AI search feature

The natural-language search box (`POST /search`) calls the Groq API (`backend/search.py`) and
requires `GROQ_API_KEY` in `backend/.env` (copy from `backend/.env.example`). Without it, the
search endpoint returns a 503 but the rest of the app works normally.

## Architecture

### Backend (`backend/`)

- `main.py` — single FastAPI app with all routes: CRUD for `/expenses` and `/sales`, sale photo
  upload/delete (`/sales/{id}/image`, served statically from `/images`), a `/settings` singleton
  (id=1), a `/summary` endpoint that aggregates totals/profit/margin over an optional date
  range, and `/search` for the NL query box.
- `models.py` — SQLModel table definitions (`Expense`, `Sale`, `Settings`). Each table follows
  the `*Base`/`*Create` pattern: `ExpenseBase`/`SaleBase` hold shared fields,
  `Expense`/`Sale` add `table=True` + primary key (`Sale` also adds `image_path`, which is
  server-managed and never accepted via `SaleCreate`), `ExpenseCreate`/`SaleCreate` are the
  request-body shape. Follow this pattern if adding new record types or fields.
- `database.py` — SQLite engine pointed at `backend/data/tejoh.db`, plus `IMAGES_DIR`
  (`backend/data/images/`, created on first run). `init_db()` runs `_migrate()` after
  `create_all`, which adds any columns listed in `TABLE_COLUMNS_TO_ADD` that are missing from
  an existing on-disk table (simple additive SQLite migration, no version tracking) — **when
  adding a new nullable column to `Expense`/`Sale`, add it here too** or existing users'
  databases won't pick it up.
- `search.py` — the NL search pipeline, in two LLM calls against Groq
  (`openai/gpt-oss-120b`, with retry/backoff on 408/429/5xx):
  1. `parse_question()` — turns the question (plus up to 3 turns of prior
     question/filter history, for follow-ups like "what about last month") into a
     `SearchFilter` (record_type, item/buyer/store text filters, date range). The LLM only
     extracts a filter — it never sees raw totals or does arithmetic here.
  2. `run_filter()` — executes that filter as real SQL via SQLModel, computing
     count/total/average/earliest/latest and profit/margin in Python (never LLM-computed).
     Falls back to stripping a trailing "s" from `item_contains` if the exact substring match
     returns nothing (handles plurals like "paintings" vs. stored "Painting").
  3. `generate_answer()` — a second Groq call turns the precomputed stats into a natural-language
     answer; the data block is fenced and the prompt explicitly instructs the model to treat it
     as untrusted data, not instructions (defends against prompt injection via item names/notes
     a user typed into their own records).
  This LLM-parses-intent / code-computes-numbers / LLM-phrases-answer split is deliberate so
  financial figures are never hallucinated.
- Profit/margin math (used in both `/summary` and `search.py`) is: `profit = sales - (expenses +
  labor_cost)`, where `labor_cost` is only included if `Settings.time_tracking_enabled` is true,
  computed from `sum(Sale.time_minutes) / 60 * hourly_rate`.
- `tests/golden_questions.py` — see "Backend tests" above.

### Frontend (`frontend/src/`)

- `App.jsx` — top-level tab switcher (Dashboard / Expenses / Sales / Settings) plus the always
  visible `SearchBar`. Holds `settings` state and passes it down (e.g. `SalesPanel` needs to
  know if time tracking is enabled to show a minutes field).
- `api.js` — the only place that talks to the backend. All HTTP calls go through the `api`
  object here (base URL hardcoded to `http://localhost:8000`); components should not call
  `fetch` directly. Sale image upload uses `FormData`/multipart rather than the shared JSON
  `request()` helper.
- `components/` — one component per tab (`Dashboard`, `ExpensesPanel`, `SalesPanel`,
  `SettingsPanel`) plus `SearchBar`. No routing library — tab state is local to `App.jsx`.
  - `SalesPanel` additionally handles photo upload/preview/lightbox-view/download for each
    sale, and a `buyer_name` field.
  - `ExpensesPanel` has a `store_name` field.
  - `SearchBar` keeps a client-side conversation history (question/answer/filter per turn,
    capped at the last 3 turns) and sends it back to `/search` so the backend can resolve
    follow-up questions.
- Plain CSS (`App.css`, `index.css`), no CSS framework or component library.

### Data flow

Frontend components call `api.*` → FastAPI route in `main.py` → SQLModel query via
`database.get_session` → SQLite file at `backend/data/tejoh.db` (or the filesystem under
`backend/data/images/` for photos). There is no caching layer; components refetch via `api.*`
calls in `useEffect`/after mutations.
