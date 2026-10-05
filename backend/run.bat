@echo off
cd /d "%~dp0"
call .venv\Scripts\activate.bat
echo Starting SecureShare FastAPI backend on port 8010...
uvicorn app.main:app --reload --port 8010
