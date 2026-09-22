# Tejoh Collective — Expense & Sales Tracker

A simple local app for tracking raw material expenses and product sales, with a dashboard
(profit, margin %) and a natural-language search box.

Everything runs on your own computer. No hosting costs, no account needed. Your data lives
in a single file at `backend/data/tejoh.db` and stays there between runs.

> **Important — do not delete `backend/data/tejoh.db`.** This one file is your entire
> expense and sales history. There's also a note about this inside `backend/data/` itself.
> See "Backing up your data" below.

## First-time setup

1. Install **Python 3.10+** and **Node.js 18+**:
   - **Windows**: download installers from [python.org](https://python.org) and [nodejs.org](https://nodejs.org). On the Python installer, make sure to check **"Add python.exe to PATH"** — this is unchecked by default and the app won't run without it.
   - **Mac**: install via [python.org](https://python.org)/[nodejs.org](https://nodejs.org) or `brew install python node`.
2. (Optional, for the AI search box) Get a free API key from [Groq](https://console.groq.com):
   - Sign up, go to "API Keys", create a new key.
   - Copy `backend/.env.example` to `backend/.env` and paste your key in.
   - Without this, everything else in the app still works — just not the search box.

## Running the app

**On Windows**: double-click `start.bat` (or run it from Command Prompt). Two windows will
open — one for the backend, one for the frontend. Leave both open while using the app; closing
either one stops that half.

**On Mac**, from the project folder, run:

```bash
./start.sh
```

Either way, this will:
- Set up the backend and frontend the first time (installs dependencies)
- Start the backend at `http://localhost:8000`
- Start the app at `http://localhost:5173` — open this in your browser

Your data is saved automatically as you go — nothing is lost when you close the app.

## Backing up your data

Your data is the single file `backend/data/tejoh.db` (photos live alongside it in
`backend/data/images/`). Occasionally copying the whole `backend/data/` folder to a cloud
drive (Google Drive, iCloud, OneDrive, a USB stick) is a good idea in case something happens
to this computer. Moving the app to a new computer? Bring `backend/data/` along and everything
picks up right where it left off.
# Expense-and-Sales-Tracker
