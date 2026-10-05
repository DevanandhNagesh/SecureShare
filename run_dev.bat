@echo off
echo ========================================================
echo Starting SecureShare (Backend + Frontend)
echo ========================================================

start "SecureShare Backend (Port 8010)" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8010"
start "SecureShare Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend running on: http://127.0.0.1:8010
echo Frontend running on: http://localhost:3000
echo.
