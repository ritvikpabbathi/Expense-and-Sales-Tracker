@echo off
cd /d "%~dp0"

echo Starting Tejoh Collective Tracker...

cd backend
if not exist venv (
    echo Setting up backend (first run)...
    python -m venv venv
    call venv\Scripts\pip install -q --upgrade pip
    call venv\Scripts\pip install -q -r requirements.txt
)

if not exist .env (
    echo.
    echo No backend\.env found. The AI search feature needs a free Groq API key.
    echo Get one at https://console.groq.com, then copy backend\.env.example to backend\.env
    echo and paste your key in. The rest of the app will work fine without it.
    echo.
)

start "Tejoh Backend" cmd /k "venv\Scripts\python -m uvicorn main:app --port 8000"
cd ..

cd frontend
if not exist node_modules (
    echo Setting up frontend (first run)...
    call npm install
)

start "Tejoh Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Backend running at  http://localhost:8000
echo App running at      http://localhost:5173
echo.
echo Two windows just opened (Backend and Frontend) - close either one to stop it.
pause
