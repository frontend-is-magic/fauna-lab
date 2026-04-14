@echo off
setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"
set "FRONTEND_DIR=%REPO_ROOT%\frontend"
set "BACKEND_DIR=%REPO_ROOT%\backend"
set "BACKEND_ENV_DIR=%REPO_ROOT%\.conda\fauna-lab"
set "BACKEND_URL=http://localhost:8000/health"
set "FRONTEND_URL=http://localhost:5173"

if not exist "%FRONTEND_DIR%" (
  echo Error: frontend directory not found: %FRONTEND_DIR%
  exit /b 1
)

if not exist "%BACKEND_DIR%" (
  echo Error: backend directory not found: %BACKEND_DIR%
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo Error: pnpm is required to start the frontend.
  exit /b 1
)

where conda >nul 2>nul
if errorlevel 1 goto use_active_python

if exist "%BACKEND_ENV_DIR%" (
  echo Using repo-local conda environment: %BACKEND_ENV_DIR%
  start "Fauna Lab Backend" cmd /k "conda run --no-capture-output -p ""%BACKEND_ENV_DIR%"" python -m uvicorn app.main:app --reload --app-dir ""%BACKEND_DIR%"""
  goto backend_started
)

for /f "tokens=*" %%L in ('conda env list ^| findstr /r /c:"fauna-lab"') do set "FOUND_FAUNA_ENV=1"
if defined FOUND_FAUNA_ENV (
  echo Using conda environment: fauna-lab
  start "Fauna Lab Backend" cmd /k "conda run --no-capture-output -n fauna-lab python -m uvicorn app.main:app --reload --app-dir ""%BACKEND_DIR%"""
  goto backend_started
)

:use_active_python
where python >nul 2>nul
if errorlevel 1 (
  echo Error: python is required to start the backend when no usable conda environment is available.
  exit /b 1
)
echo No usable conda env found; using the active Python environment.
start "Fauna Lab Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && python -m uvicorn app.main:app --reload"

:backend_started
for /l %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri '%BACKEND_URL%' -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if not errorlevel 1 goto backend_ready
  timeout /t 1 /nobreak >nul
)

echo Error: backend did not become ready at %BACKEND_URL% within 30 seconds.
exit /b 1

:backend_ready
echo Backend ready: %BACKEND_URL%
echo Frontend URL: %FRONTEND_URL%
cd /d "%FRONTEND_DIR%"
pnpm dev
