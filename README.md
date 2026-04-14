# Fauna Lab

Fauna Lab is a local image classification app with a React frontend and a FastAPI + PyTorch backend.

## Repository layout

- `frontend/` — Vite + React 18 + TypeScript SPA
- `backend/` — FastAPI service for dataset management, training, inference, and model management

## Local startup

Use the root-level startup script for your platform.

### macOS / Linux

```bash
bash start.sh
```

### Windows PowerShell

```powershell
./start.ps1
```

### Windows cmd

```bat
start.bat
```

These scripts:

- start the backend first
- wait for `http://localhost:8000/health`
- then start the frontend on `http://localhost:5173`
- prefer the repo-local `.conda/fauna-lab` environment when available
- otherwise fall back to a named `fauna-lab` conda env, then the active Python environment

## Manual startup

If you want to run the apps separately:

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### Backend

Preferred setup:

```bash
cd backend
conda env create -f environment.yml
conda activate fauna-lab
python -m uvicorn app.main:app --reload
```

Fallback setup without conda:

```bash
cd backend
pip install -r requirements.txt
pip install -e .
python -m uvicorn app.main:app --reload
```

## URLs

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/health`

## Current project state

- Most complete flows: Dataset management and Training
- Partial areas: Inference and Models
- Frontend defaults its API base URL to `http://localhost:8000`
