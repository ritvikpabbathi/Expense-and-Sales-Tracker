#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "Starting Tejoh Collective Tracker..."

# Backend
cd backend
if [ ! -d venv ]; then
  echo "Setting up backend (first run)..."
  python3 -m venv venv
  ./venv/bin/pip install -q --upgrade pip
  ./venv/bin/pip install -q -r requirements.txt
fi

if [ ! -f .env ]; then
  echo ""
  echo "No backend/.env found. The AI search feature needs a free Groq API key."
  echo "Get one at https://console.groq.com, then copy backend/.env.example to backend/.env"
  echo "and paste your key in. The rest of the app will work fine without it."
  echo ""
fi

./venv/bin/uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Frontend
cd frontend
if [ ! -d node_modules ]; then
  echo "Setting up frontend (first run)..."
  npm install --silent
fi

npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Backend running at  http://localhost:8000"
echo "App running at      http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
